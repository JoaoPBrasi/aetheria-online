import { createDatabase } from '../apps/server/src/database/client.js';
import { readEnvironment } from '../apps/server/src/config/env.js';
import { GameplayRepository } from '../apps/server/src/repositories/gameplay-repository.js';
import { IdentityRepository } from '../apps/server/src/repositories/identity-repository.js';
const queryTimes: number[] = [];
const db = createDatabase(readEnvironment().DATABASE_URL, (ms) =>
  queryTimes.push(ms),
);
const identities = new IdentityRepository(db),
  repo = new GameplayRepository(db);
const session = await identities.session();
const account = await identities.authenticate(session.token);
try {
  const c = await identities.createCharacter(session.token, {
    name: 'Perfil Temporario',
    appearance: 'sage',
  });
  await repo.execute(c.id);
  queryTimes.length = 0;
  const times: number[] = [];
  const memory = process.memoryUsage().heapUsed;
  for (let i = 0; i < 20; i++) {
    const t = performance.now();
    await repo.execute(c.id);
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  console.info(
    JSON.stringify({
      operation: 'snapshot-private',
      samples: 20,
      p50Ms: times[9],
      p95Ms: times[18],
      queries: queryTimes.length,
      queryMs: queryTimes.reduce((a, b) => a + b, 0),
      heapDeltaBytes: process.memoryUsage().heapUsed - memory,
    }),
  );
  const plan =
    await db.$queryRaw`EXPLAIN SELECT * FROM "InventorySlot" WHERE "characterId"=${c.id}::uuid`;
  console.info(JSON.stringify(plan));
} finally {
  await db.account.delete({ where: { id: account.id } });
  await db.$disconnect();
}
