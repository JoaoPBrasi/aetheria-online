import { z } from 'zod';
export const ITEMS = {
  wood: { name: 'Madeira', stack: 99, tool: false },
  stone: { name: 'Pedra', stack: 99, tool: false },
  fiber: { name: 'Fibra', stack: 99, tool: false },
  axe: { name: 'Machado inicial', stack: 1, tool: true },
  pickaxe: { name: 'Picareta inicial', stack: 1, tool: true },
  sickle: { name: 'Foice inicial', stack: 1, tool: true },
  hoe: { name: 'Enxada', stack: 1, tool: true },
  watering_can: { name: 'Regador', stack: 1, tool: true },
  turnip_seed: { name: 'Semente de nabo', stack: 99, tool: false },
  pumpkin_seed: { name: 'Semente de abóbora', stack: 99, tool: false },
  turnip: { name: 'Nabo', stack: 99, tool: false },
  pumpkin: { name: 'Abóbora', stack: 99, tool: false },
} as const;
export type ItemId = keyof typeof ITEMS;
export interface Slot {
  index: number;
  itemId: ItemId;
  quantity: number;
}
export interface GameplaySnapshot {
  characterId: string;
  revision: number;
  inventory: Slot[];
  equipment: { slot: string; itemId: ItemId }[];
  skills: { profession: string; xp: number }[];
}
export const PROFESSION_NAMES: Record<string, string> = {
  lumberjack: 'Lenhador',
  miner: 'Mineiro',
  farmer: 'Agricultor',
  blacksmith: 'Ferreiro',
  warrior: 'Guerreiro',
};
export const XP_PER_LEVEL = 100;
export const levelForXp = (xp: number) =>
  1 + Math.floor(Math.sqrt(xp / XP_PER_LEVEL));
export const RESOURCES = [
  {
    id: 'wood-plaza',
    name: 'Tronco caído',
    x: 1080,
    y: 1080,
    item: 'wood',
    tool: 'axe',
    profession: 'lumberjack',
  },
  {
    id: 'stone-plaza',
    name: 'Rocha',
    x: 1000,
    y: 1080,
    item: 'stone',
    tool: 'pickaxe',
    profession: 'miner',
  },
  {
    id: 'fiber-plaza',
    name: 'Fibras silvestres',
    x: 1040,
    y: 1112,
    item: 'fiber',
    tool: 'sickle',
    profession: 'farmer',
  },
  {
    id: 'wood-forest',
    name: 'Tronco do bosque',
    x: 600,
    y: 990,
    item: 'wood',
    tool: 'axe',
    profession: 'lumberjack',
  },
  {
    id: 'stone-quarry',
    name: 'Veio da pedreira',
    x: 1488,
    y: 1120,
    item: 'stone',
    tool: 'pickaxe',
    profession: 'miner',
  },
] as const;
const slot = z.number().int().min(0).max(23);
const base = { id: z.uuid(), revision: z.number().int().nonnegative() };
export const GameActionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      ...base,
      kind: z.literal('farm'),
      plot: z.string().max(50),
      operation: z.enum(['prepare', 'plant', 'water', 'harvest', 'abandon']),
      crop: z.enum(['turnip', 'pumpkin']).optional(),
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('transfer'),
      from: slot,
      to: slot,
      quantity: z.number().int().min(1).max(99),
    })
    .strict(),
  z.object({ ...base, kind: z.literal('equip'), from: slot }).strict(),
  z.object({ ...base, kind: z.literal('unequip') }).strict(),
  z
    .object({ ...base, kind: z.literal('gather'), node: z.string().max(40) })
    .strict(),
]);
export type GameAction = z.infer<typeof GameActionSchema>;
export function addItem(slots: Slot[], itemId: ItemId, quantity: number) {
  const result = slots.map((s) => ({ ...s }));
  for (const s of result)
    if (s.itemId === itemId) {
      const amount = Math.min(quantity, ITEMS[itemId].stack - s.quantity);
      s.quantity += amount;
      quantity -= amount;
    }
  for (let index = 0; index < 24 && quantity > 0; index++)
    if (!result.some((s) => s.index === index)) {
      const amount = Math.min(quantity, ITEMS[itemId].stack);
      result.push({ index, itemId, quantity: amount });
      quantity -= amount;
    }
  if (quantity) throw new Error('Inventário cheio.');
  return result;
}
export function transferItem(
  slots: Slot[],
  from: number,
  to: number,
  quantity: number,
) {
  if (from === to) throw new Error('Escolha outro slot.');
  const result = slots.map((s) => ({ ...s }));
  const source = result.find((s) => s.index === from),
    target = result.find((s) => s.index === to);
  if (!source || source.quantity < quantity)
    throw new Error('Quantidade indisponível.');
  if (target && target.itemId !== source.itemId) {
    if (quantity !== source.quantity)
      throw new Error('Para trocar, mova a pilha inteira.');
    target.index = from;
    source.index = to;
    return result;
  }
  if (target) {
    if (target.quantity + quantity > ITEMS[source.itemId].stack)
      throw new Error('Limite da pilha excedido.');
    target.quantity += quantity;
  } else result.push({ index: to, itemId: source.itemId, quantity });
  source.quantity -= quantity;
  return result.filter((s) => s.quantity > 0);
}
