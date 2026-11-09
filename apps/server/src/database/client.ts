import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
export function createDatabase(
  url: string,
  onQuery?: (duration: number) => void,
) {
  const client = new PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
    adapter: new PrismaPg({
      connectionString: url,
      max: 10,
      connectionTimeoutMillis: 3000,
    }),
  });
  if (onQuery) client.$on('query', (event) => onQuery(event.duration));
  return client;
}
export type Database = ReturnType<typeof createDatabase>;
