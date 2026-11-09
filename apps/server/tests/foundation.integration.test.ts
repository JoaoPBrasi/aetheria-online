import { afterAll, describe, expect, it } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import type { WorldState } from '@aetheria/shared';
import { createHash } from 'node:crypto';
import pg from 'pg';
const base = process.env.TEST_SERVER_URL!;
if (!base || !process.env.DATABASE_URL?.includes('/aetheria_test_'))
  throw new Error('Run through pnpm test:integration with isolated database');
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
db.on('error', () => {
  /* idle connections are deliberately terminated in the outage test */
});
const rooms: Room[] = [];
async function post(path: string, token?: string, body?: unknown) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
}
async function identity(name: string) {
  const session = (await (await post('/api/dev/session')).json()) as {
    token: string;
  };
  const response = await post('/api/characters', session.token, {
    name,
    appearance: 'sage',
  });
  expect(response.status).toBe(201);
  const character = (await response.json()) as { id: string; name: string };
  return { ...session, character };
}
async function join(token: string) {
  const response = await post('/api/world/seat', token);
  expect(response.status).toBe(200);
  const reservation = (await response.json()) as Parameters<
    Client['consumeSeatReservation']
  >[0];
  const room = await new Client(base).consumeSeatReservation<WorldState>(
    reservation,
  );
  rooms.push(room);
  room.onMessage('gameplay', () => undefined);
  room.onMessage('resources', () => undefined);
  room.onMessage('plots', () => undefined);
  room.onMessage('monsters', () => undefined);
  return room;
}
afterAll(async () => {
  await Promise.all(
    rooms
      .filter((room) => room.connection.isOpen)
      .map((room) => room.leave().catch(() => undefined)),
  );
  await db.end();
});
describe.sequential('foundation against real PostgreSQL and WebSockets', () => {
  it('persists cosmetics, rejects invalid ownership fields and replicates the appearance', async () => {
    const a = await identity('Paleta Um'),
      b = await identity('Paleta Dois');
    const look = {
      clothingColor: '#578ba7',
      hairColor: '#bf9253',
      skinColor: '#754834',
      hairStyle: 'long',
    };
    expect(
      (await post('/api/character/appearance', a.token, look)).status,
    ).toBe(200);
    expect(
      (
        await post('/api/character/appearance', a.token, {
          ...look,
          characterId: b.character.id,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await post('/api/character/appearance', a.token, {
          ...look,
          skinColor: 'url(evil)',
        })
      ).status,
    ).toBe(400);
    const own = await (await post('/api/dev/session', a.token)).json();
    expect(own.character).toMatchObject(look);
    const other = await (await post('/api/dev/session', b.token)).json();
    expect(other.character.clothingColor).toBe('#c4d597');
    const ra = await join(a.token),
      rb = await join(b.token);
    await expect
      .poll(() => rb.state.players.get(ra.sessionId)?.clothingColor)
      .toBe(look.clothingColor);
    expect(rb.state.players.get(ra.sessionId)?.hairColor).toBe(look.hairColor);
    expect(rb.state.players.get(ra.sessionId)?.skinColor).toBe(look.skinColor);
    await ra.leave();
    await expect.poll(() => rb.state.players.has(ra.sessionId)).toBe(false);
    await rb.leave();
  });
  it('replicates authoritative movement, rejects teleport and restores a dropped connection', async () => {
    const a = await identity('Movimento Um');
    const b = await identity('Movimento Dois');
    const ra = await join(a.token),
      rb = await join(b.token);
    await expect.poll(() => rb.state.players.get(ra.sessionId)?.x).toBe(1040);
    ra.send('move', { seq: 1, dx: 1, dy: 0, x: 9999 });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(rb.state.players.get(ra.sessionId)?.x).toBe(1040);
    ra.send('move', { seq: 1, dx: 1, dy: 0 });
    await expect.poll(() => rb.state.players.get(ra.sessionId)?.x).toBe(1048);
    ra.send('move', { seq: 1, dx: 1, dy: 0 });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(rb.state.players.get(ra.sessionId)?.x).toBe(1048);
    ra.reconnection.minUptime = 0;
    ra.reconnection.minDelay = 100;
    let reconnected = false;
    ra.onReconnect(() => {
      reconnected = true;
    });
    ra.connection.close(4010);
    await expect.poll(() => reconnected, { timeout: 7000 }).toBe(true);
    await expect
      .poll(() => ra.state.players.get(ra.sessionId)?.connected)
      .toBe(true);
    expect(ra.state.players.get(ra.sessionId)?.x).toBe(1048);
    ra.send('move', { seq: 2, dx: 0, dy: 1 });
    await expect.poll(() => rb.state.players.get(ra.sessionId)?.y).toBe(1048);
    await ra.leave();
    await expect.poll(() => rb.state.players.size).toBe(1);
    await rb.leave();
  });
  it('reports real health and seeds idempotently', async () => {
    expect((await fetch(`${base}/health/live`)).status).toBe(200);
    expect((await fetch(`${base}/health/ready`)).status).toBe(200);
    expect(
      Number(
        (await db.query('SELECT count(*) AS n FROM "FarmPlot"')).rows[0].n,
      ),
    ).toBe(16);
  });
  it('reserves a dropped player for 15 seconds and releases its lease after expiry', async () => {
    const a = await identity('Janela Reconexao');
    const b = await identity('Observador Queda');
    const ra = await join(a.token),
      rb = await join(b.token);
    try {
      await expect.poll(() => rb.state.players.has(ra.sessionId)).toBe(true);
      ra.reconnection.enabled = false;
      ra.connection.close(4010);
      await expect
        .poll(() => rb.state.players.get(ra.sessionId)?.connected)
        .toBe(false);
      const duplicate = await post('/api/world/seat', a.token);
      // Authentication at the socket boundary still protects the held character.
      if (duplicate.ok) {
        const reservation = await duplicate.json();
        await expect(
          new Client(base).consumeSeatReservation(reservation),
        ).rejects.toThrow('ALREADY_CONNECTED');
      }
      await expect
        .poll(() => rb.state.players.has(ra.sessionId), { timeout: 18000 })
        .toBe(false);
      const returned = await join(a.token);
      await returned.leave();
    } finally {
      await rb.leave();
    }
  });
  it('rejects invalid and unknown sessions', async () => {
    expect((await post('/api/dev/session', 'bad')).status).toBe(401);
    expect((await post('/api/dev/session', '0'.repeat(64))).status).toBe(401);
    expect(
      (
        await post('/api/characters', undefined, {
          name: 'Intruso',
          appearance: 'sage',
        })
      ).status,
    ).toBe(401);
  });
  it('stores only token hashes, enforces ownership and validates creation', async () => {
    const a = await identity('Íris Teste');
    const b = await identity('Nilo Teste');
    expect(a.character.id).not.toBe(b.character.id);
    const stored = await db.query(
      'SELECT "devTokenHash" FROM "Account" WHERE "devTokenHash"=$1',
      [createHash('sha256').update(a.token).digest('hex')],
    );
    expect(stored.rowCount).toBe(1);
    expect(stored.rows[0].devTokenHash).not.toBe(a.token);
    expect(
      (
        await post('/api/characters', a.token, {
          name: 'Outro Nome',
          appearance: 'sage',
        })
      ).status,
    ).toBe(409);
    const recovered = await (await post('/api/dev/session', a.token)).json();
    expect(recovered.character.id).toBe(a.character.id);
    const fresh = await (await post('/api/dev/session')).json();
    expect(
      (
        await post('/api/characters', fresh.token, {
          name: 'Valid Name',
          appearance: 'sage',
          accountId: a.character.id,
        })
      ).status,
    ).toBe(400);
    const results = await Promise.all([
      post('/api/characters', fresh.token, {
        name: 'Concurrent A',
        appearance: 'sage',
      }),
      post('/api/characters', fresh.token, {
        name: 'Concurrent B',
        appearance: 'tide',
      }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const skills = await db.query(
      'SELECT * FROM "CharacterSkill" WHERE "characterId"=$1',
      [a.character.id],
    );
    expect(skills.rowCount).toBe(5);
  });
  it('synchronizes two presences, blocks duplicate sessions and permits return after leaving', async () => {
    const a = await identity('Arin Presença');
    const b = await identity('Bela Presença');
    const ra = await join(a.token);
    const rb = await join(b.token);
    await expect.poll(() => ra.state.players.size).toBe(2);
    await expect.poll(() => rb.state.players.size).toBe(2);
    await expect(join(a.token)).rejects.toThrow('ALREADY_CONNECTED');
    await ra.leave();
    await expect.poll(() => rb.state.players.size).toBe(1);
    const again = await join(a.token);
    await expect.poll(() => again.state.players.size).toBe(2);
    await again.leave();
    await rb.leave();
  });
  it('requires character creation before joining', async () => {
    const fresh = await (await post('/api/dev/session')).json();
    expect((await post('/api/world/seat', fresh.token)).status).toBe(409);
  });
  it('disables raw room creation and keeps a single bounded world', async () => {
    const forbidden = await post('/matchmake/create/world');
    const result = await forbidden.json();
    expect(result.error).toContain('invalid method');
    const occupied: Room[] = [];
    try {
      for (let i = 0; i < 16; i++) {
        const account = await identity(`Lotação ${i}`);
        occupied.push(await join(account.token));
      }
      const extra = await identity('Viajante Extra');
      expect((await post('/api/world/seat', extra.token)).status).toBe(409);
      expect(new Set(occupied.map((r) => r.roomId)).size).toBe(1);
    } finally {
      await Promise.all(occupied.map((r) => r.leave()));
    }
  });
  it('enforces inventory slot and quantity constraints in PostgreSQL', async () => {
    const a = await identity('Teste Integridade');
    await expect(
      db.query(
        `INSERT INTO "InventorySlot" (id, "characterId", index, "itemId", quantity) VALUES (gen_random_uuid(), $1, 24, 'wood', 1)`,
        [a.character.id],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        `INSERT INTO "InventorySlot" (id, "characterId", index, "itemId", quantity) VALUES (gen_random_uuid(), $1, 0, 'wood', -1)`,
        [a.character.id],
      ),
    ).rejects.toThrow();
  });
  it('reports an actual isolated database outage and recovers', async () => {
    const admin = new pg.Client({
      connectionString: process.env.TEST_ADMIN_DATABASE_URL,
    });
    const name = new URL(process.env.DATABASE_URL!).pathname.slice(1);
    if (!/^aetheria_test_[a-f0-9]{32}$/.test(name))
      throw new Error('Refusing to change a non-test database');
    await admin.connect();
    try {
      await admin.query(`ALTER DATABASE "${name}" ALLOW_CONNECTIONS false`);
      await admin.query(
        'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1',
        [name],
      );
      await expect
        .poll(async () => (await fetch(`${base}/health/ready`)).status, {
          timeout: 10000,
        })
        .toBe(503);
      expect((await fetch(`${base}/health/live`)).status).toBe(200);
    } finally {
      await admin.query(`ALTER DATABASE "${name}" ALLOW_CONNECTIONS true`);
      await admin.end();
    }
    await expect
      .poll(async () => (await fetch(`${base}/health/ready`)).status, {
        timeout: 10000,
      })
      .toBe(200);
  });
});
