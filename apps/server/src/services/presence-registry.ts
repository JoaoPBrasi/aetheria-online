import { AppError } from './errors.js';
/** Process-local lease: reserve during auth, before an async room join can race. */
export class PresenceRegistry {
  private active = new Map<string, string>();
  acquire(characterId: string, sessionId: string) {
    const existing = this.active.get(characterId);
    if (existing && existing !== sessionId)
      throw new AppError(
        409,
        'ALREADY_CONNECTED',
        'Personagem já conectado em outra janela.',
      );
    this.active.set(characterId, sessionId);
  }
  release(characterId: string, sessionId: string) {
    if (this.active.get(characterId) === sessionId)
      this.active.delete(characterId);
  }
  has(characterId: string) {
    return this.active.has(characterId);
  }
}
