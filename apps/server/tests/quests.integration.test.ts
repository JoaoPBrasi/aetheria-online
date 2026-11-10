import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  CRAFTING_STATIONS,
  type GameAction,
  type GameplaySnapshot,
} from '@aetheria/shared';
import { createDatabase } from '../src/database/client.js';
import { GameplayRepository } from '../src/repositories/gameplay-repository.js';
import { GameplayService } from '../src/services/gameplay-service.js';
import { IdentityRepository } from '../src/repositories/identity-repository.js';

if (!process.env.DATABASE_URL?.includes('/aetheria_test_'))
  throw new Error('Use test:integration');
const db = createDatabase(process.env.DATABASE_URL);
const identities = new IdentityRepository(db);
const service = () => new GameplayService(new GameplayRepository(db));
const accounts: string[] = [];
const command = { questId: 'tutorial_first_steps' };
const near = () => ({ x: 1040, y: 980, direction: 'up' });
const far = () => ({ x: 1700, y: 1700, direction: 'down' });
const progress = { gather_wood: 5, craft_planks: 2, defeat_slimes: 2 };
const quantity = (s: GameplaySnapshot, itemId: string) =>
  s.inventory
    .filter((i) => i.itemId === itemId)
    .reduce((n, i) => n + i.quantity, 0);
const xp = (s: GameplaySnapshot) =>
  s.skills.find((s) => s.profession === 'warrior')?.xp ?? 0;
async function fixture() {
  const session = await identities.session();
  accounts.push((await identities.authenticate(session.token)).id);
  const c = await identities.createCharacter(session.token, {
    name: 'Missão Teste',
    appearance: 'sage',
  });
  const s = service();
  await s.sync(c.id);
  return { id: c.id, s };
}
async function ready(id: string, s: GameplayService) {
  await s.acceptQuest(id, command, near);
  await db.characterQuest.update({
    where: { characterId_questId: { characterId: id, ...command } },
    data: { status: 'ready_to_turn_in', progress },
  });
}
afterAll(async () => {
  await db.account.deleteMany({ where: { id: { in: accounts } } });
  await db.$disconnect();
});

it('validates quest commands, proximity and character ownership; persists acceptance', async () => {
  const a = await fixture(),
    b = await fixture();
  await expect(a.s.acceptQuest(a.id, command, far)).rejects.toThrow(
    'Aproxime-se',
  );
  await expect(a.s.acceptQuest(a.id, command, () => undefined)).rejects.toThrow(
    'Entre',
  );
  await expect(
    a.s.acceptQuest(a.id, { ...command, characterId: b.id }, near),
  ).rejects.toThrow('inválido');
  await expect(
    a.s.acceptQuest(a.id, { questId: 'unknown' }, near),
  ).rejects.toThrow('inválido');
  await a.s.acceptQuest(a.id, command, near);
  await a.s.acceptQuest(a.id, command, near);
  expect(await service().quests(a.id)).toHaveLength(1);
  expect(await b.s.quests(b.id)).toEqual([]);
  await expect(a.s.turnInQuest(a.id, command, near)).rejects.toThrow(
    'objetivos',
  );
  await expect(b.s.turnInQuest(b.id, command, near)).rejects.toThrow('aceitou');
});

it('persists actual gather/craft/kill progress and grants exact rewards once across concurrent services', async () => {
  const { id, s } = await fixture();
  await s.acceptQuest(id, command, near);
  let state = await s.sync(id);
  const act = async (
    payload: object,
    position: () => { x: number; y: number; direction: string },
  ) => {
    const action = {
      ...payload,
      id: randomUUID(),
      revision: state.revision,
    } as GameAction;
    state = await s.act(id, action, position);
    return action;
  };
  const first = await act({ kind: 'gather', node: 'wood-plaza' }, () => ({
    x: 1080,
    y: 1080,
    direction: 'down',
  }));
  expect((await s.quests(id))[0]?.progress.gather_wood).toBe(3);
  await s.act(id, first, near); // retry must not count twice
  expect((await s.quests(id))[0]?.progress.gather_wood).toBe(3);
  await act({ kind: 'gather', node: 'wood-forest' }, () => ({
    x: 600,
    y: 990,
    direction: 'down',
  }));
  expect((await s.quests(id))[0]?.progress.gather_wood).toBe(5);
  for (let n = 0; n < 2; n++)
    await act(
      { kind: 'craft', recipeId: 'plank', stationId: 'workbench-plaza' },
      () => ({
        x: CRAFTING_STATIONS[0]!.x,
        y: CRAFTING_STATIONS[0]!.y,
        direction: 'down',
      }),
    );
  for (const monsterId of ['slime-1', 'slime-2']) {
    const m = s.monstersManager.get(monsterId)!;
    m.health = 20;
    await act({ kind: 'attack', targetId: monsterId }, () => ({
      x: m.x,
      y: m.y,
      direction: 'down',
    }));
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  const restored = service();
  expect((await restored.quests(id))[0]).toMatchObject({
    status: 'ready_to_turn_in',
    progress,
  });
  await expect(restored.turnInQuest(id, command, far)).rejects.toThrow(
    'Aproxime-se',
  );
  const before = await s.sync(id);
  const results = await Promise.all([
    s.turnInQuest(id, command, near),
    restored.turnInQuest(id, command, near),
  ]);
  const after = await s.sync(id);
  expect(results).toHaveLength(2);
  expect(quantity(after, 'turnip_seed') - quantity(before, 'turnip_seed')).toBe(
    5,
  );
  expect(
    quantity(after, 'pumpkin_seed') - quantity(before, 'pumpkin_seed'),
  ).toBe(2);
  expect(xp(after) - xp(before)).toBe(50);
  expect(after.revision).toBe(before.revision + 1);
  await service().turnInQuest(id, command, near);
  expect(await s.sync(id)).toEqual(after);
  await restored.acceptQuest(id, command, near);
  expect((await service().quests(id))[0]).toMatchObject({
    status: 'completed',
    progress,
    completedAt: expect.any(Number),
  });
});

it('grants orc loot and XP without advancing the slime objective', async () => {
  const { id, s } = await fixture();
  await s.acceptQuest(id, command, near);
  const before = await s.sync(id);
  const monster = s.monstersManager.get('orc-1')!;
  monster.health = 20;
  const after = await s.act(
    id,
    {
      id: randomUUID(),
      revision: before.revision,
      kind: 'attack',
      targetId: monster.id,
    },
    () => ({ x: monster.x, y: monster.y, direction: 'down' }),
  );
  expect(xp(after) - xp(before)).toBe(40);
  expect(quantity(after, 'fiber') - quantity(before, 'fiber')).toBe(2);
  expect((await service().quests(id))[0]?.progress.defeat_slimes).toBe(0);
});

it('keeps a quest claimable when the second reward does not fit; retry grants both rewards', async () => {
  const { id, s } = await fixture();
  await ready(id, s);
  await db.inventorySlot.deleteMany({ where: { characterId: id } });
  await db.inventorySlot.createMany({
    data: Array.from({ length: 24 }, (_, index) => ({
      characterId: id,
      index,
      itemId: index === 0 ? 'turnip_seed' : 'sword',
      quantity: index === 0 ? 94 : 1,
    })),
  });
  const before = await s.sync(id);
  await expect(s.turnInQuest(id, command, near)).rejects.toThrow(
    'Inventário cheio',
  );
  expect(await s.sync(id)).toEqual(before);
  expect((await service().quests(id))[0]?.status).toBe('ready_to_turn_in');
  await db.inventorySlot.deleteMany({ where: { characterId: id, index: 23 } });
  const after = await s.turnInQuest(id, command, near);
  expect(quantity(after, 'turnip_seed')).toBe(99);
  expect(quantity(after, 'pumpkin_seed')).toBe(2);
  expect(xp(after) - xp(before)).toBe(50);
});

it('rolls back inventory and completion when a database write fails after adding rewards', async () => {
  const { id, s } = await fixture();
  await ready(id, s);
  await db.characterSkill.update({
    where: {
      characterId_profession: { characterId: id, profession: 'warrior' },
    },
    data: { xp: 2147483647 },
  });
  const before = await s.sync(id);
  await expect(s.turnInQuest(id, command, near)).rejects.toThrow(); // PostgreSQL integer overflow on +50 XP
  expect(await s.sync(id)).toEqual(before);
  expect((await service().quests(id))[0]?.status).toBe('ready_to_turn_in');
  await db.characterSkill.update({
    where: {
      characterId_profession: { characterId: id, profession: 'warrior' },
    },
    data: { xp: 0 },
  });
  expect(xp(await s.turnInQuest(id, command, near))).toBe(50);
});
