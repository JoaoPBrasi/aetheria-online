import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { type ErrorRequestHandler, type Request } from 'express';
import { matchMaker } from '@colyseus/core';
import { WORLD_ROOM, MAX_PLAYERS } from '@aetheria/shared';
import type { Database } from '../database/client.js';
import type { IdentityRepository } from '../repositories/identity-repository.js';
import { AppError } from '../services/errors.js';
function bearer(req: Request, required = true) {
  const value = req.headers.authorization;
  if (!value && !required) return undefined;
  if (!value?.startsWith('Bearer ') || value.length !== 71)
    throw new AppError(401, 'INVALID_SESSION', 'Sessão inválida.');
  return value.slice(7);
}
export function createHttpApp(
  db: Database,
  identities: IdentityRepository,
  devIdentity: boolean,
) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(express.json({ limit: '4kb' }));
  app.get('/health/live', (_req, res) => {
    res.json({ status: 'alive' });
  });
  app.get('/health/ready', async (_req, res, next) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.json({ status: 'ready', database: 'connected' });
    } catch {
      next(
        new AppError(
          503,
          'DATABASE_UNAVAILABLE',
          'Banco de dados indisponível.',
        ),
      );
    }
  });
  app.post('/api/dev/session', async (req, res, next) => {
    try {
      if (!devIdentity)
        throw new AppError(404, 'NOT_FOUND', 'Rota indisponível.');
      res.json(await identities.session(bearer(req, false)));
    } catch (error) {
      next(error);
    }
  });
  app.post('/api/characters', async (req, res, next) => {
    try {
      if (!devIdentity)
        throw new AppError(404, 'NOT_FOUND', 'Rota indisponível.');
      const token = bearer(req)!;
      const character = await identities.createCharacter(token, req.body);
      res.status(201).json(character);
    } catch (error) {
      next(error);
    }
  });
  // Matchmaking is routed explicitly to the one pre-created room. No joinOrCreate overflow.
  app.post('/api/character/appearance', async (req, res, next) => {
    try {
      if (!devIdentity)
        throw new AppError(404, 'NOT_FOUND', 'Rota indisponível.');
      res.json(await identities.customize(bearer(req)!, req.body));
    } catch (error) {
      next(error);
    }
  });
  app.post('/api/world/seat', async (req, res, next) => {
    try {
      if (!devIdentity)
        throw new AppError(
          503,
          'AUTH_NOT_CONFIGURED',
          'Autenticação pública ainda não configurada.',
        );
      const token = bearer(req)!;
      await identities.loadCharacter(token);
      const rooms = await matchMaker.query({ name: WORLD_ROOM });
      const room = rooms[0];
      if (!room)
        throw new AppError(503, 'WORLD_UNAVAILABLE', 'Mundo indisponível.');
      if (room.clients >= MAX_PLAYERS || room.locked)
        throw new AppError(409, 'WORLD_FULL', 'A vila está cheia.');
      const seat = await matchMaker.joinById(room.roomId, { token });
      res.json(seat);
    } catch (error) {
      next(error);
    }
  });
  const clientDist = fileURLToPath(
    new URL('../../../client/dist', import.meta.url),
  );
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (
        req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        !req.path.startsWith('/health')
      ) {
        res.sendFile(path.join(clientDist, 'index.html'));
        return;
      }
      next();
    });
  }
  const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof AppError) {
      res
        .status(error.status)
        .json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error instanceof SyntaxError) {
      res
        .status(400)
        .json({ error: { code: 'INVALID_JSON', message: 'JSON inválido.' } });
      return;
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      error.type === 'entity.too.large'
    ) {
      res.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Mensagem muito grande.',
        },
      });
      return;
    }
    // Exibe o erro real em ambiente de desenvolvimento para diagnóstico claro.
    console.error('request_failed:', error);
    res.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Serviço temporariamente indisponível.',
      },
    });
  };
  app.use(errorHandler);
  return app;
}
