import { createServer } from 'node:http';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { WORLD_ROOM } from '@aetheria/shared';
import { readEnvironment } from './config/env.js';
import { createHttpApp } from './config/http.js';
import { createDatabase } from './database/client.js';
import { IdentityRepository } from './repositories/identity-repository.js';
import { PresenceRegistry } from './services/presence-registry.js';
import { WorldRoom } from './rooms/world-room.js';
import { GameplayRepository } from './repositories/gameplay-repository.js';
import { GameplayService } from './services/gameplay-service.js';
const env = readEnvironment();
const db = createDatabase(env.DATABASE_URL);
const identities = new IdentityRepository(db);
const presence = new PresenceRegistry();
class ConfiguredWorldRoom extends WorldRoom {
  constructor() {
    super(
      identities,
      presence,
      env.DEV_IDENTITY_ENABLED,
      new GameplayService(new GameplayRepository(db)),
    );
  }
}
const httpServer = createServer(
  createHttpApp(db, identities, env.DEV_IDENTITY_ENABLED),
);
const server = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
  gracefullyShutdown: false,
  greet: false,
});
matchMaker.controller.exposedMethods = [];
server.define(WORLD_ROOM, ConfiguredWorldRoom);
try {
  await db.$connect();
  await server.listen(env.PORT, env.HOST);
  await matchMaker.createRoom(WORLD_ROOM, {});
  console.info(`Aetheria server ready on ${env.HOST}:${env.PORT}`);
} catch {
  console.error(
    'startup_failed: check database, migration and port configuration',
  );
  await db.$disconnect();
  process.exitCode = 1;
  await server.gracefullyShutdown(false);
}
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await server.gracefullyShutdown(false);
  await db.$disconnect();
}
process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
