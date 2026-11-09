import { expect, it } from 'vitest';
import { CosmeticsSchema, CreateCharacterSchema } from '../schemas/index.js';
import { cosmeticsOf, DEFAULT_COSMETICS } from './cosmetics.js';
it('keeps legacy creation compatible and validates colors and styles', () => {
  expect(
    CreateCharacterSchema.parse({ name: 'WASD Ágata', appearance: 'sage' }),
  ).toMatchObject(DEFAULT_COSMETICS);
  expect(
    CosmeticsSchema.safeParse({
      ...DEFAULT_COSMETICS,
      skinColor: 'red;url(evil)',
    }).success,
  ).toBe(false);
  expect(
    CosmeticsSchema.safeParse({ ...DEFAULT_COSMETICS, hairStyle: 'script' })
      .success,
  ).toBe(false);
});
it('sends only cosmetic fields when editing an existing character', () => {
  const character = { ...DEFAULT_COSMETICS, id: 'private-id', name: 'Luna' };
  expect(cosmeticsOf(character)).toEqual(DEFAULT_COSMETICS);
  expect(CosmeticsSchema.safeParse(cosmeticsOf(character)).success).toBe(true);
});
