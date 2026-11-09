import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { readEnvironment } from '../apps/server/src/config/env.js';

const command = process.argv[2];
if (!['up', 'down', 'status'].includes(command ?? '')) {
  throw new Error('Use db:up, db:down ou db:status.');
}
const url = new URL(readEnvironment().DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
  throw new Error('O banco portátil aceita apenas DATABASE_URL local.');
}
const user = decodeURIComponent(url.username);
const password = decodeURIComponent(url.password);
const database = decodeURIComponent(url.pathname.slice(1));
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(database) || !user || !password) {
  throw new Error('Configure usuário, senha e nome do banco em DATABASE_URL.');
}
const port = Number(url.port || 5432);
const root = fileURLToPath(new URL('../', import.meta.url));
const dataDir = resolve(root, '.data/postgres');
const logFile = resolve(root, '.data/postgres.log');
const platform = process.platform === 'win32' ? 'windows' : process.platform;
const requireBinary = createRequire(import.meta.resolve('embedded-postgres'));
const { pg_ctl: pgCtl } = requireBinary(
  `@embedded-postgres/${platform}-${process.arch}`,
) as { pg_ctl: string };

function control(args: string[], quiet = false) {
  return new Promise<number>((resolveCode, reject) => {
    const child = spawn(pgCtl, ['-D', dataDir, ...args], {
      windowsHide: true,
      stdio: quiet ? 'ignore' : 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => resolveCode(code ?? 1));
  });
}

const initialised = existsSync(resolve(dataDir, 'PG_VERSION'));
const running = initialised && (await control(['status'], true)) === 0;
if (command === 'down') {
  if (running && (await control(['-w', '-m', 'fast', 'stop'])) !== 0) {
    throw new Error('Não foi possível parar o banco local.');
  }
  console.info('PostgreSQL local parado. Os dados foram preservados.');
} else if (command === 'status') {
  console.info(
    `PostgreSQL local: ${running ? 'ativo' : 'parado'}. Dados: ${dataDir}`,
  );
} else {
  await mkdir(resolve(root, '.data'), { recursive: true });
  if (!initialised) {
    const cluster = new EmbeddedPostgres({
      databaseDir: dataDir,
      user,
      password,
      authMethod: 'scram-sha-256',
      persistent: true,
      initdbFlags: ['--encoding=UTF8', '--locale=C'],
    });
    await cluster.initialise();
  }
  if (!running) {
    const code = await control([
      '-l',
      logFile,
      '-o',
      `-h 127.0.0.1 -p ${port}`,
      '-w',
      'start',
    ]);
    if (code !== 0)
      throw new Error(`Falha ao iniciar PostgreSQL. Consulte ${logFile}`);
  }
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const client = new pg.Client({
    connectionString: adminUrl.toString(),
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );
    if (result.rowCount === 0)
      await client.query(`CREATE DATABASE "${database}"`);
    console.info(`PostgreSQL local pronto em 127.0.0.1:${port}/${database}.`);
  } finally {
    await client.end();
  }
}
