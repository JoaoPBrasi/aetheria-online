import { expect, it } from 'vitest';
import {
  addItem,
  transferItem,
  GameActionSchema,
  levelForXp,
  type Slot,
} from './gameplay.js';
it('stacks up to the item limit and splits without losing quantity', () => {
  const slots = addItem(
    [{ index: 0, itemId: 'wood', quantity: 98 }],
    'wood',
    5,
  );
  expect(slots.map((s) => s.quantity)).toEqual([99, 4]);
  const moved = transferItem(slots, 0, 5, 40);
  expect(moved.find((s) => s.index === 5)?.quantity).toBe(40);
  expect(moved.reduce((a, b) => a + b.quantity, 0)).toBe(103);
});
it('fails atomically on full bags, invalid swaps and excessive amounts', () => {
  const full: Slot[] = Array.from({ length: 24 }, (_, index) => ({
    index,
    itemId: 'wood',
    quantity: 99,
  }));
  expect(() => addItem(full, 'stone', 1)).toThrow('cheio');
  expect(full.every((s) => s.quantity === 99)).toBe(true);
  expect(() =>
    transferItem([{ index: 0, itemId: 'wood', quantity: 2 }], 0, 1, 3),
  ).toThrow();
});
it('validates action ownership boundaries and configurable level curve', () => {
  expect(
    GameActionSchema.safeParse({
      kind: 'equip',
      id: 'invalid',
      revision: 0,
      from: 24,
    }).success,
  ).toBe(false);
  expect(levelForXp(0)).toBe(1);
  expect(levelForXp(100)).toBe(2);
  expect(levelForXp(400)).toBe(3);
});
