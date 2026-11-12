import { expect, it } from 'vitest';
import {
  addItem,
  transferItem,
  canCraft,
  craftItem,
  CRAFTING_RECIPES,
  GameActionSchema,
  levelForXp,
  combatWeapon,
  type Slot,
} from './gameplay.js';
it('honors the equipped sword before using the best one in the bag', () => {
  const inventory: Slot[] = [{ index: 0, itemId: 'iron_sword', quantity: 1 }];
  expect(
    combatWeapon({ equipment: [{ slot: 'tool', itemId: 'sword' }], inventory }),
  ).toBe('sword');
  expect(combatWeapon({ equipment: [], inventory })).toBe('iron_sword');
  expect(
    combatWeapon({
      equipment: [{ slot: 'tool', itemId: 'axe' }],
      inventory: [],
    }),
  ).toBeUndefined();
});
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
it('crafts items consuming materials and rejecting insufficient ingredients', () => {
  const bag: Slot[] = [
    { index: 0, itemId: 'wood', quantity: 5 },
    { index: 1, itemId: 'stone', quantity: 2 },
  ];
  expect(canCraft(bag, CRAFTING_RECIPES.plank)).toBe(true);
  expect(canCraft(bag, CRAFTING_RECIPES.sword)).toBe(true);
  expect(
    canCraft(
      [{ index: 0, itemId: 'wood', quantity: 1 }],
      CRAFTING_RECIPES.plank,
    ),
  ).toBe(false);

  const afterPlank = craftItem(bag, CRAFTING_RECIPES.plank);
  expect(afterPlank.find((s) => s.itemId === 'wood')?.quantity).toBe(3);
  expect(afterPlank.find((s) => s.itemId === 'plank')?.quantity).toBe(1);

  const afterSword = craftItem(bag, CRAFTING_RECIPES.sword);
  expect(afterSword.find((s) => s.itemId === 'wood')?.quantity).toBe(2);
  expect(afterSword.find((s) => s.itemId === 'stone')).toBeUndefined();
  expect(afterSword.find((s) => s.itemId === 'sword')?.quantity).toBe(1);
});

it('validates market buy and sell action schemas', () => {
  const validBuy = GameActionSchema.safeParse({
    id: '123e4567-e89b-12d3-a456-426614174000',
    revision: 1,
    kind: 'buy',
    itemId: 'turnip_seed',
    quantity: 5,
  });
  expect(validBuy.success).toBe(true);

  const validSell = GameActionSchema.safeParse({
    id: '123e4567-e89b-12d3-a456-426614174000',
    revision: 1,
    kind: 'sell',
    from: 0,
    quantity: 10,
  });
  expect(validSell.success).toBe(true);

  const invalidBuy = GameActionSchema.safeParse({
    id: '123e4567-e89b-12d3-a456-426614174000',
    revision: 1,
    kind: 'buy',
    itemId: 'non_existent_item',
    quantity: 1,
  });
  expect(invalidBuy.success).toBe(false);

  const invalidSell = GameActionSchema.safeParse({
    id: '123e4567-e89b-12d3-a456-426614174000',
    revision: 1,
    kind: 'sell',
    from: 25, // slot out of bounds
    quantity: 1,
  });
  expect(invalidSell.success).toBe(false);
});
