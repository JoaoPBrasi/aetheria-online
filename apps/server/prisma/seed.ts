import { config } from 'dotenv';
import { FARM_PLOTS } from '@aetheria/shared';
import { createDatabase } from '../src/database/client.js';
config({ path: new URL('../../../.env', import.meta.url), quiet: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const db = createDatabase(process.env.DATABASE_URL);
try {
  await db.$transaction(
    FARM_PLOTS.map((plot) =>
      db.farmPlot.upsert({
        where: { id: plot.id },
        create: plot,
        update: { mapId: plot.mapId, tileX: plot.tileX, tileY: plot.tileY },
      }),
    ),
  );
  console.info('Seed ready: 16 farm plots');
} finally {
  await db.$disconnect();
}
