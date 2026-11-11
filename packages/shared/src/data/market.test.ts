import { describe, expect, it } from 'vitest';
import {
  canBuyItem,
  canSellItem,
  MARKET_BUY_PRICES,
  MARKET_SELL_PRICES,
  MERCHANT_STOCK,
} from './market.js';
import type { Slot } from './gameplay.js';

describe('Market & Shop Data', () => {
  it('has consistent stock and pricing', () => {
    for (const itemId of MERCHANT_STOCK) {
      expect(MARKET_BUY_PRICES[itemId]).toBeGreaterThan(0);
    }
  });

  it('validates buying item successfully when player has enough gold', () => {
    const res = canBuyItem(100, 'turnip_seed', 5);
    expect(res.ok).toBe(true);
    expect(res.totalCost).toBe(20); // 4 * 5
  });

  it('rejects buying when gold is insufficient', () => {
    const res = canBuyItem(10, 'sword', 1);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Ouro insuficiente');
  });

  it('rejects buying unknown or non-stock items', () => {
    // @ts-expect-error test invalid item
    const res = canBuyItem(100, 'unknown_item', 1);
    expect(res.ok).toBe(false);
  });

  it('validates selling items from inventory correctly', () => {
    const inventory: Slot[] = [
      { index: 0, itemId: 'turnip', quantity: 10 },
      { index: 1, itemId: 'wood', quantity: 20 },
    ];

    const res = canSellItem(inventory, 0, 5);
    expect(res.ok).toBe(true);
    expect(res.revenue).toBe(30); // 6 * 5
    expect(res.itemId).toBe('turnip');
  });

  it('rejects selling empty slots or exceeding available quantity', () => {
    const inventory: Slot[] = [
      { index: 0, itemId: 'pumpkin', quantity: 2 },
    ];

    expect(canSellItem(inventory, 0, 5).ok).toBe(false);
    expect(canSellItem(inventory, 3, 1).ok).toBe(false);
  });

  it('rejects selling items not accepted by the merchant', () => {
    const inventory: Slot[] = [
      // @ts-expect-error test non-purchasable item
      { index: 0, itemId: 'special_item_not_in_market', quantity: 1 },
    ];
    expect(canSellItem(inventory, 0, 1).ok).toBe(false);
  });
});
