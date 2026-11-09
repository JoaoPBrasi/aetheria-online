import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../src/database/client.js';
import { GameplayRepository } from '../src/repositories/gameplay-repository.js';
import { GameplayService } from '../src/services/gameplay-service.js';
import { IdentityRepository } from '../src/repositories/identity-repository.js';
if (!process.env.DATABASE_URL?.includes('/aetheria_test_'))
  throw new Error('Use test:integration');
const db = createDatabase(process.env.DATABASE_URL);
const identities = new IdentityRepository(db),
  repo = new GameplayRepository(db),
  service = new GameplayService(repo);
const accounts: string[] = [];
const position = () => ({ x: 1040, y: 1040, direction: 'down' });
async function fixture() {
  const s = await identities.session();
  const a = await identities.authenticate(s.token);
  accounts.push(a.id);
  const c = await identities.createCharacter(s.token, {
    name: 'Coleta Teste',
    appearance: 'sage',
  });
  return c.id;
}
afterAll(async () => {
  await db.account.deleteMany({ where: { id: { in: accounts } } });
  await db.$disconnect();
});
it('grants starter tools once, equips, gathers atomically and prevents replay', async () => {
  const id = await fixture();
  let s = await service.sync(id);
  expect(s.inventory).toHaveLength(7);
  expect((await service.sync(id)).inventory).toHaveLength(7);
  s = await service.act(
    id,
    { id: randomUUID(), revision: s.revision, kind: 'equip', from: 0 },
    position,
  );
  expect(s.equipment[0]?.itemId).toBe('axe');
  const action = {
    id: randomUUID(),
    revision: s.revision,
    kind: 'gather',
    node: 'wood-plaza',
  };
  s = await service.act(id, action, position);
  expect(s.inventory.find((i) => i.itemId === 'wood')?.quantity).toBe(3);
  expect(s.skills.find((i) => i.profession === 'lumberjack')?.xp).toBe(10);
  const again = await service.act(id, action, position);
  expect(again.revision).toBe(s.revision);
  expect(again.inventory.find((i) => i.itemId === 'wood')?.quantity).toBe(3);
  await expect(
    service.act(
      id,
      { ...action, id: randomUUID(), revision: s.revision },
      position,
    ),
  ).rejects.toThrow('recuperando');
  await service.save(id, { x: 1200, y: 1040, direction: 'right' });
  const c = await db.character.findUniqueOrThrow({ where: { id } });
  expect(c.x).toBe(1200);
  const restored = await new GameplayRepository(db).execute(id);
  expect(restored.inventory.find((i) => i.itemId === 'wood')?.quantity).toBe(3);
  expect(restored.equipment[0]?.itemId).toBe('axe');
});
it('rejects invalid or out-of-range requests and rolls back without taking items', async () => {
  const id = await fixture();
  let s = await service.sync(id);
  await expect(
    service.act(
      id,
      {
        id: randomUUID(),
        revision: s.revision,
        kind: 'gather',
        node: 'wood-forest',
      },
      position,
    ),
  ).rejects.toThrow('alcance');
  await expect(
    service.act(
      id,
      {
        id: randomUUID(),
        revision: s.revision,
        kind: 'transfer',
        from: 0,
        to: 23,
        quantity: 2,
      },
      position,
    ),
  ).rejects.toThrow('Quantidade');
  expect((await service.sync(id)).revision).toBe(s.revision);
  s = await service.act(
    id,
    { id: randomUUID(), revision: s.revision, kind: 'equip', from: 1 },
    position,
  );
  const requests = [1, 2].map(() =>
    service.act(
      id,
      { id: randomUUID(), revision: s.revision, kind: 'unequip' },
      position,
    ),
  );
  const results = await Promise.allSettled(requests);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const restored = await service.sync(id);
  expect(restored.inventory.filter((i) => i.itemId === 'pickaxe')).toHaveLength(
    1,
  );
  expect(restored.equipment).toHaveLength(0);
});

it('rolls back a full bag and permits the same uncommitted request after fixing space', async () => {
  const id = await fixture();
  const s = await service.sync(id);
  await db.inventorySlot.deleteMany({ where: { characterId: id } });
  await db.inventorySlot.createMany({
    data: Array.from({ length: 24 }, (_, index) => ({
      characterId: id,
      index,
      itemId: 'stone',
      quantity: 99,
    })),
  });
  await db.characterEquipment.create({
    data: { characterId: id, slot: 'tool', itemId: 'sickle' },
  });
  const action = {
    id: randomUUID(),
    revision: s.revision,
    kind: 'gather',
    node: 'fiber-plaza',
  };
  await expect(service.act(id, action, position)).rejects.toThrow('cheio');
  expect(await repo.receipt(id, action.id)).toBeNull();
  expect(
    (await service.sync(id)).skills.find((v) => v.profession === 'farmer')?.xp,
  ).toBe(0);
  await db.inventorySlot.deleteMany({ where: { characterId: id, index: 23 } });
  const result = await service.act(id, action, position);
  expect(result.inventory.find((v) => v.itemId === 'fiber')?.quantity).toBe(3);
  expect(result.skills.find((v) => v.profession === 'farmer')?.xp).toBe(10);
});

it('lets only one character collect a shared node concurrently', async () => {
  const a = await fixture(),
    b = await fixture();
  const sa = await service.sync(a),
    sb = await service.sync(b);
  const ea = await service.act(
    a,
    { kind: 'equip', id: randomUUID(), revision: sa.revision, from: 1 },
    position,
  );
  const eb = await service.act(
    b,
    { kind: 'equip', id: randomUUID(), revision: sb.revision, from: 1 },
    position,
  );
  const result = await Promise.allSettled([
    service.act(
      a,
      {
        kind: 'gather',
        id: randomUUID(),
        revision: ea.revision,
        node: 'stone-plaza',
      },
      position,
    ),
    service.act(
      b,
      {
        kind: 'gather',
        id: randomUUID(),
        revision: eb.revision,
        node: 'stone-plaza',
      },
      position,
    ),
  ]);
  expect(result.filter((v) => v.status === 'fulfilled')).toHaveLength(1);
  const total = await db.inventorySlot.aggregate({
    where: { characterId: { in: [a, b] }, itemId: 'stone' },
    _sum: { quantity: true },
  });
  expect(total._sum.quantity).toBe(3);
});
it('crafts planks at workbench and sword at forge atomically granting blacksmith xp', async () => {
  const id = await fixture();
  let s = await service.sync(id);
  await db.inventorySlot.createMany({
    data: [
      {
        id: randomUUID(),
        characterId: id,
        index: 10,
        itemId: 'wood',
        quantity: 10,
      },
      {
        id: randomUUID(),
        characterId: id,
        index: 11,
        itemId: 'stone',
        quantity: 5,
      },
    ],
  });
  s = await service.sync(id);
  s = await service.act(
    id,
    {
      id: randomUUID(),
      revision: s.revision,
      kind: 'craft',
      recipeId: 'plank',
      stationId: 'workbench-plaza',
    },
    () => ({ x: 1120, y: 1040, direction: 'down' }),
  );
  expect(s.inventory.find((i) => i.itemId === 'plank')?.quantity).toBe(1);
  expect(s.inventory.find((i) => i.itemId === 'wood')?.quantity).toBe(8);
  expect(s.skills.find((i) => i.profession === 'blacksmith')?.xp).toBe(10);

  s = await service.act(
    id,
    {
      id: randomUUID(),
      revision: s.revision,
      kind: 'craft',
      recipeId: 'sword',
      stationId: 'forge-blacksmith',
    },
    () => ({ x: 1152, y: 1168, direction: 'down' }),
  );
  expect(s.inventory.find((i) => i.itemId === 'sword')?.quantity).toBe(1);
  expect(s.inventory.find((i) => i.itemId === 'wood')?.quantity).toBe(5);
  expect(s.inventory.find((i) => i.itemId === 'stone')?.quantity).toBe(3);
  expect(s.skills.find((i) => i.profession === 'blacksmith')?.xp).toBe(35);
});
it('attacks slimes within range, validates cooldown, takes damage, awards warrior xp and slime goo on kill', async () => {
  const id = await fixture();
  let s = await service.sync(id);

  // Fora de alcance
  await expect(
    service.act(
      id,
      {
        id: randomUUID(),
        revision: s.revision,
        kind: 'attack',
        targetId: 'slime-1',
      },
      () => ({ x: 1040, y: 1040, direction: 'down' }),
    ),
  ).rejects.toThrow('alcance');

  // No alcance do slime-1 (1540, 1700)
  const slimePos = () => ({ x: 1540, y: 1700, direction: 'down' });
  const slime = service.monstersManager.get('slime-1')!;
  slime.health = slime.maxHealth;
  slime.state = 'idle';

  // 1º ataque desarmado (dano: 20 -> vida vai para 40)
  s = await service.act(
    id,
    {
      id: randomUUID(),
      revision: s.revision,
      kind: 'attack',
      targetId: 'slime-1',
    },
    slimePos,
  );
  expect(slime.health).toBe(40);

  // Rejeitado de imediato pelo cooldown de 400ms
  await expect(
    service.act(
      id,
      {
        id: randomUUID(),
        revision: s.revision,
        kind: 'attack',
        targetId: 'slime-1',
      },
      slimePos,
    ),
  ).rejects.toThrow('Aguarde o golpe anterior');

  // Aguardar fim do cooldown
  await new Promise((resolve) => setTimeout(resolve, 450));

  // Conceder espada para testar bônus de dano (dano: 30)
  await db.inventorySlot.create({
    data: {
      id: randomUUID(),
      characterId: id,
      index: 15,
      itemId: 'sword',
      quantity: 1,
    },
  });
  s = await service.sync(id);

  // 2º ataque com espada (dano 30 -> vida vai de 40 para 10)
  s = await service.act(
    id,
    {
      id: randomUUID(),
      revision: s.revision,
      kind: 'attack',
      targetId: 'slime-1',
    },
    slimePos,
  );
  expect(slime.health).toBe(10);

  await new Promise((resolve) => setTimeout(resolve, 450));

  // 3º ataque (golpe fatal -> derrota o slime)
  s = await service.act(
    id,
    {
      id: randomUUID(),
      revision: s.revision,
      kind: 'attack',
      targetId: 'slime-1',
    },
    slimePos,
  );
  expect(slime.health).toBe(0);
  expect(slime.state).toBe('dead');
  expect(s.inventory.find((i) => i.itemId === 'slime_goo')?.quantity).toBe(2);
  expect(s.skills.find((i) => i.profession === 'warrior')?.xp).toBe(30);

  // Atacar monstro derrotado é rejeitado
  await new Promise((resolve) => setTimeout(resolve, 450));
  await expect(
    service.act(
      id,
      {
        id: randomUUID(),
        revision: s.revision,
        kind: 'attack',
        targetId: 'slime-1',
      },
      slimePos,
    ),
  ).rejects.toThrow('derrotado');
});
