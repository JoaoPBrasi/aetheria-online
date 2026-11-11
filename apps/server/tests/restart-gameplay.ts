import { Client } from '@colyseus/sdk';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import {
  GROVE_RESOURCES,
  type CharacterQuestState,
  type GameplaySnapshot,
  type ResourceStates,
  type WorldState,
} from '@aetheria/shared';
const base = process.env.TEST_SERVER_URL!,
  path = process.env.GAMEPLAY_FIXTURE_FILE!;
if (!base || !path || !process.env.DATABASE_URL?.includes('/aetheria_test_'))
  throw new Error('Use integration runner');
async function post(route: string, token?: string, body?: unknown) {
  const r = await fetch(base + route, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!r.ok) throw new Error('Fixture request failed');
  return r.json();
}
const prepare = process.argv[2] === 'prepare';
const fixture = prepare
  ? ((await post('/api/dev/session')) as {
      token: string;
      x?: number;
      y?: number;
      harvestAt?: number;
      treeReadyAt?: number;
    })
  : (JSON.parse(await readFile(path, 'utf8')) as {
      token: string;
      x: number;
      y: number;
      harvestAt?: number;
      treeReadyAt?: number;
    });
if (prepare)
  await post('/api/characters', fixture.token, {
    name: 'Retorno do Coletor',
    appearance: 'sage',
  });
const room = await new Client(base).consumeSeatReservation<WorldState>(
  await post('/api/world/seat', fixture.token),
);
room.reconnection.enabled = false;
let snapshot: GameplaySnapshot | undefined;
let quests: CharacterQuestState[] | undefined;
room.onMessage('quests', (value: CharacterQuestState[]) => {
  quests = value;
});
room.onMessage('gameplay', (s: GameplaySnapshot) => {
  snapshot = s;
});
const tree = GROVE_RESOURCES.find(({ x, y }) => x === 592 && y === 720)!;
let resources: ResourceStates = {};
room.onMessage('resources', (state: ResourceStates) => {
  resources = state;
});
room.onMessage('forage', () => undefined);
room.onMessage('monsters', () => undefined);
let plots: import('@aetheria/shared').FarmSnapshot[] = [];
room.onMessage('plots', (p: import('@aetheria/shared').FarmSnapshot[]) => {
  plots = p;
});
room.onMessage('gameplayError', () => {
  throw new Error('Fixture gameplay failed');
});
async function wait(condition: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (condition()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Fixture timeout');
}
try {
  room.send('sync');
  await wait(() => !!snapshot);
  if (prepare) {
    room.send('quest:accept', { questId: 'tutorial_first_steps' });
    await wait(() => quests?.[0]?.status === 'in_progress');
    const act = async (payload: Record<string, unknown>) => {
      const rev = snapshot!.revision;
      room.send('action', { ...payload, id: randomUUID(), revision: rev });
      await wait(() => snapshot!.revision > rev);
    };
    let seq = 0;
    const move = async (dx: number, dy: number, count: number) => {
      for (let i = 0; i < count; i += 4) {
        for (let j = 0; j < Math.min(4, count - i); j++)
          room.send('move', { seq: ++seq, dx, dy });
        await wait(() => room.state.players.get(room.sessionId)?.ack === seq);
      }
    };
    await move(-1, 0, 56);
    await move(0, -1, 40);
    await act({ kind: 'gather', node: tree.id });
    await wait(
      () => quests?.[0]?.progress.gather_wood === 3 && !!resources[tree.id],
    );
    await move(0, 1, 40);
    await move(-1, 0, 8);
    await move(0, 1, 48);
    await act({ kind: 'equip', from: 3 });
    await act({
      kind: 'farm',
      plot: 'brumavale-farm-16',
      operation: 'prepare',
    });
    await act({
      kind: 'farm',
      plot: 'brumavale-farm-16',
      operation: 'plant',
      crop: 'pumpkin',
    });
    await act({ kind: 'equip', from: 4 });
    await act({ kind: 'farm', plot: 'brumavale-farm-16', operation: 'water' });
    await wait(
      () => !!plots.find((p) => p.id === 'brumavale-farm-16')?.harvestAt,
    );
    const p = room.state.players.get(room.sessionId)!;
    await writeFile(
      path,
      JSON.stringify({
        token: fixture.token,
        x: p.x,
        y: p.y,
        harvestAt: plots.find((p) => p.id === 'brumavale-farm-16')?.harvestAt,
        treeReadyAt: resources[tree.id]!.readyAt,
      }),
      { mode: 0o600 },
    );
  } else {
    await wait(() => !!resources[tree.id]);
    if (resources[tree.id]!.readyAt !== fixture.treeReadyAt)
      throw new Error('Tree growth deadline changed on restart');
    await wait(() => quests?.[0]?.progress.gather_wood === 3);
    if (quests?.[0]?.status !== 'in_progress')
      throw new Error('Quest status changed on restart');
    await wait(
      () => !!plots.find((p) => p.id === 'brumavale-farm-16')?.harvestAt,
    );
    if (
      plots.find((p) => p.id === 'brumavale-farm-16')?.harvestAt !==
      fixture.harvestAt
    )
      throw new Error('Crop deadline changed on restart');
    await wait(() => room.state.players.has(room.sessionId));
    const p = room.state.players.get(room.sessionId)!;
    if (
      p.x !== fixture.x ||
      p.y !== fixture.y ||
      snapshot!.inventory.find((s) => s.itemId === 'wood')?.quantity !== 3 ||
      snapshot!.skills.find((s) => s.profession === 'lumberjack')?.xp !== 10
    )
      throw new Error('Gameplay was not restored after restart');
    console.info(
      'PASS: quest progress, position, inventory, XP and crop/tree deadlines restored after actual server restart',
    );
  }
} finally {
  await room.leave();
}
