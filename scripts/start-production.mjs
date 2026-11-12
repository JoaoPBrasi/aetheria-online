import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prismaCli = path.join(rootDir, 'apps/server/node_modules/prisma/build/index.js');
const prismaSchema = path.join(rootDir, 'apps/server/prisma/schema.prisma');

console.info('[production] Executando migrações do banco de dados com Prisma...');
try {
  execSync(`node "${prismaCli}" migrate deploy --schema="${prismaSchema}"`, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });
  console.info('[production] Migrações do banco de dados concluídas.');
} catch (error) {
  console.error('[production] Falha ao aplicar migrações do banco de dados:', error);
  process.exit(1);
}

console.info('[production] Inicializando servidor Aetheria Online...');
await import('../apps/server/dist/index.js');
