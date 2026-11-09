import { describe, it, expect } from 'vitest';
import { readEnvironment } from './env.js';
describe('configuration', () => {
  const base = { DATABASE_URL: 'postgresql://user:secret@localhost/game' };
  it('blocks local identity in production', () => {
    expect(() =>
      readEnvironment({
        ...base,
        NODE_ENV: 'production',
        DEV_IDENTITY_ENABLED: 'true',
      }),
    ).toThrow('Local development identity');
  });
  it('does not leak an invalid URL into errors', () => {
    expect(() => readEnvironment({ DATABASE_URL: 'secret-value' })).toThrow(
      'DATABASE_URL',
    );
    try {
      readEnvironment({ DATABASE_URL: 'secret-value' });
    } catch (error) {
      expect(String(error)).not.toContain('secret-value');
    }
  });
  it('requires a valid port', () => {
    expect(() => readEnvironment({ ...base, PORT: 99999 })).toThrow('PORT');
  });
});
