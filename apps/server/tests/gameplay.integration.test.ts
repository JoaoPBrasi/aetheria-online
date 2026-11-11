import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  GROVE_RESOURCES,
  QUARRY_RESOURCES,
  CRAFTING_STATIONS,
  treeStage,
} from '@aetheria/shared';
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
const tree = GROVE_RESOURCES[0]!;
const stone = QUARRY_RESOURCES.find((node) => node.kind === 'rock')!;
const at =
  ({ x, y }: { x: number; y: number }) =>
  () => ({
    x,
    y,
    direction: 'down',
  });
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
    node: tree.id,
  };
  s = await service.act(id, action, at(tree));
  expect(s.inventory.find((i) => i.itemId === 'wood')?.quantity).toBe(3);
  expect(s.skills.find((i) => i.profession === 'lumberjack')?.xp).toBe(10);
  const again = await service.act(id, action, position);
  expect(again.revision).toBe(s.revision);
  expect(again.inventory.find((i) => i.itemId === 'wood')?.quantity).toBe(3);
  await expect(
    service.act(
      id,
      { ...action, id: randomUUID(), revision: s.revision },
      at(tree),
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
        node: tree.id,
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
  const fiber = service.forage.nodes().find((node) => node.kind === 'fiber')!;
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
    node: fiber.id,
  };
  await expect(service.act(id, action, at(fiber))).rejects.toThrow('cheio');
  expect(service.forage.get(fiber.id)).toBeDefined();
  expect(await repo.receipt(id, action.id)).toBeNull();
  expect(
    (await service.sync(id)).skills.find((v) => v.profession === 'farmer')?.xp,
  ).toBe(0);
  await db.inventorySlot.deleteMany({ where: { characterId: id, index: 23 } });
  const result = await service.act(id, action, at(fiber));
  expect(result.inventory.find((v) => v.itemId === 'fiber')?.quantity).toBe(3);
  expect(result.skills.find((v) => v.profession === 'farmer')?.xp).toBe(10);
  expect(service.forage.get(fiber.id)).toBeUndefined();
  const otherIds = new Set(service.forage.nodes().map((node) => node.id));
  expect(service.forage.tick(Date.now() + 5_001)).toBe(true);
  const replacement = service.forage
    .nodes()
    .find((node) => !otherIds.has(node.id));
  expect(replacement?.kind).toBe('fiber');
  expect(
    Math.hypot(replacement!.x - fiber.x, replacement!.y - fiber.y),
  ).toBeGreaterThanOrEqual(128);
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
        node: stone.id,
      },
      at(stone),
    ),
    service.act(
      b,
      {
        kind: 'gather',
        id: randomUUID(),
        revision: eb.revision,
        node: stone.id,
      },
      at(stone),
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
it('funds the iron equipment cycle and preserves inventory and tree growth across services', async () => {
  const id = await fixture();
  let state = await service.sync(id);
  const furnace = CRAFTING_STATIONS.find(
    (station) => station.type === 'furnace',
  )!;
  const forge = CRAFTING_STATIONS.find((station) => station.type === 'forge')!;
  const craft = (recipeId: string, station: typeof furnace | typeof forge) =>
    service.act(
      id,
      {
        id: randomUUID(),
        revision: state.revision,
        kind: 'craft',
        recipeId,
        stationId: station.id,
      },
      at(station),
    );
  const gather = async (node: (typeof GROVE_RESOURCES)[number]) => {
    state = await service.act(
      id,
      {
        id: randomUUID(),
        revision: state.revision,
        kind: 'gather',
        node: node.id,
      },
      at(node),
    );
  };
  for (const node of GROVE_RESOURCES.slice(4, 7)) await gather(node);
  for (const node of QUARRY_RESOURCES.filter(
    (node) => node.kind === 'ore',
  ).slice(0, 2))
    await gather(node);
  state = await craft('charcoal', furnace);
  state = await craft('charcoal', furnace);
  for (let i = 0; i < 3; i++) state = await craft('iron_ingot', furnace);
  state = await craft('iron_axe', forge);
  state = await craft('iron_sword', forge);
  expect(state.inventory).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ itemId: 'iron_axe', quantity: 1 }),
      expect.objectContaining({ itemId: 'iron_sword', quantity: 1 }),
      expect.objectContaining({ itemId: 'charcoal', quantity: 1 }),
      expect.objectContaining({ itemId: 'wood', quantity: 2 }),
    ]),
  );
  await expect(craft('iron_axe', forge)).rejects.toThrow(
    'Materiais insuficientes.',
  );
  expect(await service.sync(id)).toEqual(state);

  await db.inventorySlot.deleteMany({
    where: { characterId: id, itemId: 'axe' },
  });
  const target = GROVE_RESOURCES[7]!;
  const other = await fixture();
  const otherState = await service.sync(other);
  const restarted = new GameplayService(new GameplayRepository(db));
  const race = await Promise.allSettled([
    gather(target),
    restarted.act(
      other,
      {
        id: randomUUID(),
        revision: otherState.revision,
        kind: 'gather',
        node: target.id,
      },
      at(target),
    ),
  ]);
  expect(race.filter((result) => result.status === 'fulfilled')).toHaveLength(
    1,
  );
  const growth = (await restarted.resources())[target.id]!;
  expect(growth.readyAt - growth.cutAt!).toBe(120_000);
  expect(treeStage(growth, growth.cutAt!)).toBe('seedling');
  expect(treeStage(growth, growth.cutAt! + 60_000)).toBe('young');
  expect(treeStage(growth, growth.readyAt)).toBe('adult');
  await expect(gather(target)).rejects.toThrow('recuperando');

  await db.groveTree.update({
    where: { nodeId: target.id },
    data: {
      cutAt: new Date(Date.now() - 121_000),
      maturesAt: new Date(Date.now() - 1000),
    },
  });
  await gather(target);
  expect(state.inventory.find((slot) => slot.itemId === 'wood')?.quantity).toBe(
    race[0]?.status === 'fulfilled' ? 8 : 5,
  );
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
  const feedback: number[] = [];
  const strike = {
    id: randomUUID(),
    revision: s.revision,
    kind: 'attack',
    targetId: 'slime-1',
  };
  await expect(
    service.act(
      id,
      { ...strike, revision: s.revision + 1 },
      slimePos,
      (event) => feedback.push(event.amount),
    ),
  ).rejects.toThrow('desatualizado');
  expect(slime.health).toBe(60);

  // 1º ataque desarmado (dano: 20 -> vida vai para 40)
  s = await service.act(id, strike, slimePos, (event) =>
    feedback.push(event.amount),
  );
  expect(slime.health).toBe(40);
  await service.act(id, strike, slimePos, (event) =>
    feedback.push(event.amount),
  );
  expect(slime.health).toBe(40);
  expect(feedback).toEqual([20]);

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
