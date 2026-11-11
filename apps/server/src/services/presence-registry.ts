import { AppError } from './errors.js';

/**
 * Process-local lease: reserva o personagem durante a autenticação.
 * Permite takeover automático (force = true) para que um reload de página ou nova aba
 * encerre a conexão anterior e permita o login imediato sem bloquear o jogador.
 */
export class PresenceRegistry {
  private active = new Map<string, string>();

  acquire(characterId: string, sessionId: string, force = true): string | undefined {
    const existing = this.active.get(characterId);
    if (existing && existing !== sessionId) {
      if (!force) {
        throw new AppError(
          409,
          'ALREADY_CONNECTED',
          'Personagem já conectado em outra janela.',
        );
      }
      this.active.set(characterId, sessionId);
      return existing;
    }
    this.active.set(characterId, sessionId);
    return undefined;
  }

  getActive(characterId: string): string | undefined {
    return this.active.get(characterId);
  }

  release(characterId: string, sessionId: string) {
    if (this.active.get(characterId) === sessionId)
      this.active.delete(characterId);
  }

  has(characterId: string) {
    return this.active.has(characterId);
  }
}
