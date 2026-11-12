import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.join(rootDir, 'apps/server');
const prismaCli = path.join(serverDir, 'node_modules/prisma/build/index.js');

if (!process.env.DATABASE_URL) {
  console.warn('[production] AVISO: DATABASE_URL não foi detectada no ambiente.');
} else {
  const masked = process.env.DATABASE_URL.replace(/:\/\/(.*?):(.*?)@/, '://$1:***@');
  console.info(`[production] PostgreSQL configurado: ${masked}`);
}

console.info('[production] Executando migrações do banco de dados com Prisma...');
try {
  execSync(`node "${prismaCli}" migrate deploy`, {
    cwd: serverDir,
    stdio: 'inherit',
    env: process.env,
  });
  console.info('[production] Migrações do banco de dados concluídas com sucesso.');
} catch (error) {
  console.error('[production] Falha ao aplicar migrações do banco de dados:', error);
  process.exit(1);
}

console.info('[production] Inicializando servidor autoritativo Aetheria Online...');
await import('../apps/server/dist/index.js');
