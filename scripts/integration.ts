import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { readEnvironment } from '../apps/server/src/config/env.js';
const root = new URL('../', import.meta.url);
const base = readEnvironment();
const admin = new pg.Client({ connectionString: base.DATABASE_URL });
const databaseName = `aetheria_test_${randomUUID().replaceAll('-', '')}`;
const fixturePath = fileURLToPath(new URL(`work/${databaseName}.json`, root));
const url = new URL(base.DATABASE_URL);
url.pathname = `/${databaseName}`;
const serverUrl = 'http://127.0.0.1:2568';
const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: url.toString(),
  DEV_IDENTITY_ENABLED: 'true',
  HOST: '127.0.0.1',
  PORT: '2568',
  TEST_SERVER_URL: serverUrl,
  TEST_ADMIN_DATABASE_URL: base.DATABASE_URL,
  GAMEPLAY_FIXTURE_FILE: fixturePath,
};
function run(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const cli = process.env.npm_execpath;
    if (!cli) return reject(new Error('Execute a integração pelo pnpm.'));
    const p = spawn(process.execPath, [cli, ...args], {
      cwd: root,
      env,
      stdio: 'inherit',
    });
    p.on('error', reject);
    p.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Command failed: ${args.join(' ')} (${code})`)),
    );
  });
}
let child: ChildProcess | undefined;
async function stopServer() {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  const timeout = setTimeout(() => child?.kill('SIGKILL'), 7000);
  await exited;
  clearTimeout(timeout);
  child = undefined;
}
async function startServer() {
  child = spawn(process.execPath, ['apps/server/dist/index.js'], {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error('Integration server exited before readiness');
    try {
      const r = await fetch(`${serverUrl}/health/ready`, {
        signal: AbortSignal.timeout(1000),
      });
      if (r.ok) return;
    } catch {
      /* wait for boot */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Integration server readiness timed out');
}
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  await run([
    '--filter',
    '@aetheria/server',
    'exec',
    'prisma',
    'migrate',
    'deploy',
  ]);
  await run(['--filter', '@aetheria/server', 'exec', 'prisma', 'db', 'seed']);
  await run(['--filter', '@aetheria/server', 'exec', 'prisma', 'db', 'seed']);
  await startServer();
  await run(['--filter', '@aetheria/server', 'test:integration']);
  const session = (await (
    await fetch(`${serverUrl}/api/dev/session`, { method: 'POST' })
  ).json()) as { token: string };
  const headers = {
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json',
  };
  const created = (await (
    await fetch(`${serverUrl}/api/characters`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Stela Persistente', appearance: 'tide' }),
    })
  ).json()) as { id: string };
  if (!created.id) throw new Error('Restart fixture creation failed');
  await mkdir(new URL('work/', root), { recursive: true });
  await run([
    '--filter',
    '@aetheria/server',
    'exec',
    'tsx',
    'tests/restart-gameplay.ts',
    'prepare',
  ]);
  await stopServer();
  await startServer();
  await run([
    '--filter',
    '@aetheria/server',
    'exec',
    'tsx',
    'tests/restart-gameplay.ts',
    'verify',
  ]);
  const restored = (await (
    await fetch(`${serverUrl}/api/dev/session`, { method: 'POST', headers })
  ).json()) as { character: { id: string; name: string } };
  if (
    restored.character.id !== created.id ||
    restored.character.name !== 'Stela Persistente'
  )
    throw new Error('Restart persistence failed');
  console.info('PASS: character restored after actual server restart');
} finally {
  await stopServer();
  await unlink(fixturePath).catch(() => undefined);
  if (/^aetheria_test_[a-f0-9]{32}$/.test(databaseName))
    await admin
      .query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
      .catch(() => undefined);
  await admin.end();
}
