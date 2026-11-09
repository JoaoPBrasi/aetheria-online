import { describe, it, expect } from 'vitest';
import { CreateCharacterSchema, JoinWorldSchema } from './index.js';
describe('network boundaries', () => {
  it('normalizes a valid original character name', () => {
    expect(
      CreateCharacterSchema.parse({
        name: '  Íris do Vale  ',
        appearance: 'sage',
      }).name,
    ).toBe('Íris do Vale');
  });
  it.each(['', 'aa', '<script>', 'x'.repeat(21)])(
    'rejects invalid name %s',
    (name) => {
      expect(
        CreateCharacterSchema.safeParse({ name, appearance: 'sage' }).success,
      ).toBe(false);
    },
  );
  it('rejects client-supplied position and character ownership', () => {
    expect(
      CreateCharacterSchema.safeParse({
        name: 'Íris',
        appearance: 'sage',
        x: 999,
      }).success,
    ).toBe(false);
    expect(
      JoinWorldSchema.safeParse({ token: 'a'.repeat(64), characterId: 'other' })
        .success,
    ).toBe(false);
  });
});
