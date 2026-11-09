import { describe, it, expect } from 'vitest';
import { PresenceRegistry } from './presence-registry.js';
describe('presence lease', () => {
  it('rejects duplicate connections and ignores stale releases', () => {
    const p = new PresenceRegistry();
    p.acquire('hero', 'a');
    expect(() => p.acquire('hero', 'b')).toThrow('outra janela');
    p.release('hero', 'b');
    expect(p.has('hero')).toBe(true);
    p.release('hero', 'a');
    expect(() => p.acquire('hero', 'b')).not.toThrow();
  });
});
