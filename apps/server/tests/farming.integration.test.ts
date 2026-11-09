import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../src/database/client.js';
import { GameplayRepository } from '../src/repositories/gameplay-repository.js';
import { GameplayService } from '../src/services/gameplay-service.js';
import { IdentityRepository } from '../src/repositories/identity-repository.js';
import type { GameplaySnapshot, GameAction } from '@aetheria/shared';
if (!process.env.DATABASE_URL?.includes('/aetheria_test_'))
  throw new Error('Use integration runner');
const db = createDatabase(process.env.DATABASE_URL),
  repo = new GameplayRepository(db),
  service = new GameplayService(repo),
  identity = new IdentityRepository(db);
const accounts: string[] = [],
  characters: string[] = [];
const position =
  (col = 0, row = 0) =>
  () => ({ x: 336 + 64 * col, y: 1232 + 64 * row, direction: 'down' });
async function player() {
  const s = await identity.session();
  accounts.push((await identity.authenticate(s.token)).id);
  const c = await identity.createCharacter(s.token, {
    name: 'Cultivo Teste',
    appearance: 'sage',
  });
  characters.push(c.id);
  return { id: c.id, state: await service.sync(c.id) };
}
async function act(
  p: { id: string; state: GameplaySnapshot },
  payload: Record<string, unknown>,
  pos = position(),
) {
  p.state = await service.act(
    p.id,
    { ...payload, id: randomUUID(), revision: p.state.revision },
    pos,
  );
  return p.state;
}
afterAll(async () => {
  await db.farmPlot.updateMany({
    where: { ownerId: { in: characters } },
    data: {
      ownerId: null,
      prepared: false,
      cropId: null,
      plantedAt: null,
      wateredAt: null,
      harvestAt: null,
    },
  });
  await db.account.deleteMany({ where: { id: { in: accounts } } });
  await db.$disconnect();
});
it('claims, plants, waters and harvests atomically with ownership and idempotency', async () => {
  const p = await player(),
    other = await player();
  await act(p, { kind: 'equip', from: 3 });
  await act(p, {
    kind: 'farm',
    plot: 'brumavale-farm-1',
    operation: 'prepare',
  });
  await expect(
    act(other, {
      kind: 'farm',
      plot: 'brumavale-farm-1',
      operation: 'prepare',
    }),
  ).rejects.toThrow('outro jogador');
  await act(p, {
    kind: 'farm',
    plot: 'brumavale-farm-1',
    operation: 'plant',
    crop: 'turnip',
  });
  await act(p, { kind: 'equip', from: 4 });
  await act(p, { kind: 'farm', plot: 'brumavale-farm-1', operation: 'water' });
  const persisted = await db.farmPlot.findUniqueOrThrow({
    where: { id: 'brumavale-farm-1' },
  });
  expect(persisted.harvestAt!.getTime() - persisted.wateredAt!.getTime()).toBe(
    60000,
  );
  await expect(
    act(p, { kind: 'farm', plot: persisted.id, operation: 'harvest' }),
  ).rejects.toThrow('não está pronta');
  const reloaded = await new GameplayRepository(db).plots();
  expect(reloaded.find((v) => v.id === persisted.id)?.harvestAt).toBe(
    persisted.harvestAt!.getTime(),
  );
  await db.farmPlot.update({
    where: { id: persisted.id },
    data: { harvestAt: new Date(Date.now() - 1) },
  });
  const request: GameAction = {
    id: randomUUID(),
    revision: p.state.revision,
    kind: 'farm',
    plot: persisted.id,
    operation: 'harvest',
  };
  p.state = await service.act(p.id, request, position());
  expect(p.state.inventory.find((v) => v.itemId === 'turnip')?.quantity).toBe(
    3,
  );
  expect(
    p.state.inventory.find((v) => v.itemId === 'turnip_seed')?.quantity,
  ).toBe(6);
  expect(p.state.skills.find((v) => v.profession === 'farmer')?.xp).toBe(25);
  expect((await service.act(p.id, request, position())).revision).toBe(
    p.state.revision,
  );
  await expect(
    act(p, { kind: 'farm', plot: persisted.id, operation: 'harvest' }),
  ).rejects.toThrow('não está pronta');
  await act(p, { kind: 'farm', plot: persisted.id, operation: 'abandon' });
});
it('preserves a ripe pumpkin and XP when the bag is full', async () => {
  const p = await player();
  const plot = 'brumavale-farm-2',
    pos = position(1);
  await act(p, { kind: 'equip', from: 3 }, pos);
  await act(p, { kind: 'farm', plot, operation: 'prepare' }, pos);
  await act(
    p,
    { kind: 'farm', plot, operation: 'plant', crop: 'pumpkin' },
    pos,
  );
  await act(p, { kind: 'equip', from: 4 }, pos);
  await act(p, { kind: 'farm', plot, operation: 'water' }, pos);
  const planted = await db.farmPlot.findUniqueOrThrow({ where: { id: plot } });
  expect(planted.harvestAt!.getTime() - planted.wateredAt!.getTime()).toBe(
    120000,
  );
  await db.farmPlot.update({
    where: { id: plot },
    data: { harvestAt: new Date(Date.now() - 1) },
  });
  await db.inventorySlot.deleteMany({ where: { characterId: p.id } });
  await db.inventorySlot.createMany({
    data: Array.from({ length: 24 }, (_, index) => ({
      index,
      characterId: p.id,
      itemId: 'stone',
      quantity: 99,
    })),
  });
  const request: GameAction = {
    id: randomUUID(),
    revision: p.state.revision,
    kind: 'farm',
    plot,
    operation: 'harvest',
  };
  await expect(service.act(p.id, request, pos)).rejects.toThrow('cheio');
  expect(
    (await db.farmPlot.findUniqueOrThrow({ where: { id: plot } })).cropId,
  ).toBe('pumpkin');
  expect(await repo.receipt(p.id, request.id)).toBeNull();
  await db.inventorySlot.deleteMany({
    where: { characterId: p.id, index: { in: [22, 23] } },
  });
  const result = await service.act(p.id, request, pos);
  expect(result.inventory.find((v) => v.itemId === 'pumpkin')?.quantity).toBe(
    3,
  );
});
it('limits ownership and validates distance, tools and concurrent claims', async () => {
  const p = await player(),
    other = await player();
  await db.inventorySlot.deleteMany({
    where: { characterId: p.id, itemId: 'hoe' },
  });
  await expect(
    act(
      p,
      { kind: 'farm', plot: 'brumavale-farm-3', operation: 'prepare' },
      position(2),
    ),
  ).rejects.toThrow('enxada');
  await db.inventorySlot.create({
    data: { characterId: p.id, index: 3, itemId: 'hoe', quantity: 1 },
  });
  await act(p, { kind: 'equip', from: 3 });
  await act(other, { kind: 'equip', from: 3 });
  await expect(
    act(
      p,
      { kind: 'farm', plot: 'brumavale-farm-3', operation: 'prepare' },
      () => ({ x: 1040, y: 1040, direction: 'down' }),
    ),
  ).rejects.toThrow('alcance');
  const results = await Promise.allSettled([
    act(
      p,
      { kind: 'farm', plot: 'brumavale-farm-3', operation: 'prepare' },
      position(2),
    ),
    act(
      other,
      { kind: 'farm', plot: 'brumavale-farm-3', operation: 'prepare' },
      position(2),
    ),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const owner = (
    await db.farmPlot.findUniqueOrThrow({ where: { id: 'brumavale-farm-3' } })
  ).ownerId;
  const winner = owner === p.id ? p : other;
  for (let n = 5; n <= 7; n++)
    await act(
      winner,
      { kind: 'farm', plot: `brumavale-farm-${n}`, operation: 'prepare' },
      position(n - 5, 1),
    );
  await expect(
    act(
      winner,
      { kind: 'farm', plot: 'brumavale-farm-8', operation: 'prepare' },
      position(3, 1),
    ),
  ).rejects.toThrow('quatro');
});
