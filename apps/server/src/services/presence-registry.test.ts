import { describe, it, expect } from 'vitest';
import { PresenceRegistry } from './presence-registry.js';

describe('presence lease', () => {
  it('rejeita conexões duplicadas quando force é false e ignora liberações obsoletas', () => {
    const p = new PresenceRegistry();
    p.acquire('hero', 'a', false);
    expect(() => p.acquire('hero', 'b', false)).toThrow('outra janela');
    p.release('hero', 'b');
    expect(p.has('hero')).toBe(true);
    p.release('hero', 'a');
    expect(() => p.acquire('hero', 'b', false)).not.toThrow();
  });

  it('permite takeover imediato ao atualizar a tela e retorna a sessão antiga para desconexão', () => {
    const p = new PresenceRegistry();
    p.acquire('hero', 'a');
    const oldSession = p.acquire('hero', 'b', true);
    expect(oldSession).toBe('a');
    expect(p.getActive('hero')).toBe('b');
    expect(p.has('hero')).toBe(true);
  });
});
