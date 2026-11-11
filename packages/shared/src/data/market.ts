import type { ItemId, Slot } from './gameplay.js';

export const MERCHANT_NPC_ID = 'mira-merchant';
export const MERCHANT_MAX_RANGE = 140;

/**
 * Preços de compra (quanto o jogador paga em ouro para adquirir o item da loja).
 */
export const MARKET_BUY_PRICES: Partial<Record<ItemId, number>> = {
  turnip_seed: 4,
  pumpkin_seed: 8,
  roasted_turnip: 15,
  axe: 25,
  pickaxe: 25,
  sickle: 25,
  sword: 50,
};

/**
 * Preços de venda (quanto a loja paga em ouro ao jogador por seus recursos/produtos).
 */
export const MARKET_SELL_PRICES: Partial<Record<ItemId, number>> = {
  turnip: 6,
  pumpkin: 14,
  roasted_turnip: 10,
  slime_goo: 5,
  wood: 2,
  stone: 2,
  fiber: 2,
  flower: 3,
  iron_ore: 8,
  iron_ingot: 20,
  plank: 5,
};

export interface MarketItemEntry {
  itemId: ItemId;
  buyPrice?: number;
  sellPrice?: number;
}

/**
 * Lista dos itens oferecidos no mostruário de compra da Mercadora.
 */
export const MERCHANT_STOCK: readonly ItemId[] = [
  'turnip_seed',
  'pumpkin_seed',
  'roasted_turnip',
  'axe',
  'pickaxe',
  'sickle',
  'sword',
];

/**
 * Valida se uma compra é viável com base no saldo de ouro e quantidade.
 */
export function canBuyItem(
  currentGold: number,
  itemId: ItemId,
  quantity: number,
): { ok: boolean; totalCost: number; error?: string } {
  if (quantity <= 0) return { ok: false, totalCost: 0, error: 'Quantidade inválida.' };
  const unitPrice = MARKET_BUY_PRICES[itemId];
  if (!unitPrice) return { ok: false, totalCost: 0, error: 'Este item não está disponível para compra.' };
  const totalCost = unitPrice * quantity;
  if (currentGold < totalCost) {
    return { ok: false, totalCost, error: `Ouro insuficiente. Você precisa de ${totalCost} moedas de ouro.` };
  }
  return { ok: true, totalCost };
}

/**
 * Valida se uma venda é viável com base no slot do inventário.
 */
export function canSellItem(
  slots: Slot[],
  slotIndex: number,
  quantity: number,
): { ok: boolean; revenue: number; itemId?: ItemId; error?: string } {
  if (quantity <= 0) return { ok: false, revenue: 0, error: 'Quantidade inválida.' };
  const slot = slots.find((s) => s.index === slotIndex);
  if (!slot || slot.quantity <= 0) {
    return { ok: false, revenue: 0, error: 'Slot vazio.' };
  }
  if (slot.quantity < quantity) {
    return { ok: false, revenue: 0, error: 'Quantidade insuficiente no slot.' };
  }
  const unitPrice = MARKET_SELL_PRICES[slot.itemId];
  if (!unitPrice) {
    return { ok: false, revenue: 0, error: 'A comerciante não compra este tipo de item.' };
  }
  return {
    ok: true,
    revenue: unitPrice * quantity,
    itemId: slot.itemId,
  };
}
