import { z } from 'zod';
import { CAMPFIRE, CAMPFIRE_REST_RANGE, PLAZA_CAMPFIRE } from './world.js';
import { EQUIPMENT_SLOTS } from './equipment.js';
import { TALENT_IDS, type TalentRanks } from './talents.js';
import { ATTRIBUTE_IDS, type AttributeRanks } from './attributes.js';
export * from './resources.js';
export const ITEMS = {
  wood: { name: 'Madeira', stack: 99, tool: false },
  stone: { name: 'Pedra', stack: 99, tool: false },
  fiber: { name: 'Fibra', stack: 99, tool: false },
  flower: { name: 'Flor silvestre', stack: 99, tool: false },
  iron_ore: { name: 'Minério de ferro', stack: 99, tool: false },
  iron_ingot: { name: 'Lingote de ferro', stack: 99, tool: false },
  charcoal: { name: 'Carvão vegetal', stack: 99, tool: false },
  axe: { name: 'Machado inicial', stack: 1, tool: true },
  iron_axe: { name: 'Machado de ferro', stack: 1, tool: true },
  pickaxe: { name: 'Picareta inicial', stack: 1, tool: true },
  sickle: { name: 'Foice inicial', stack: 1, tool: true },
  hoe: { name: 'Enxada', stack: 1, tool: true },
  watering_can: { name: 'Regador', stack: 1, tool: true },
  turnip_seed: { name: 'Semente de nabo', stack: 99, tool: false },
  pumpkin_seed: { name: 'Semente de abóbora', stack: 99, tool: false },
  turnip: { name: 'Nabo', stack: 99, tool: false },
  roasted_turnip: { name: 'Nabo assado', stack: 99, tool: false },
  pumpkin: { name: 'Abóbora', stack: 99, tool: false },
  plank: { name: 'Tábua de madeira', stack: 99, tool: false },
  sword: { name: 'Espada de treino', stack: 1, tool: true },
  iron_sword: { name: 'Espada de ferro', stack: 1, tool: true },
  slime_goo: { name: 'Gosma de slime', stack: 99, tool: false },
  cloth_hood: { name: 'Capuz de pano', stack: 1, tool: false },
  iron_helmet: { name: 'Elmo de ferro', stack: 1, tool: false },
  leather_tunic: { name: 'Túnica de couro', stack: 1, tool: false },
  iron_armor: { name: 'Armadura de ferro', stack: 1, tool: false },
  linen_pants: { name: 'Calças de linho', stack: 1, tool: false },
  iron_greaves: { name: 'Grevas de ferro', stack: 1, tool: false },
  leather_boots: { name: 'Botas de couro', stack: 1, tool: false },
  wooden_shield: { name: 'Escudo de madeira', stack: 1, tool: false },
  iron_shield: { name: 'Escudo de ferro', stack: 1, tool: false },
  forest_amulet: { name: 'Amuleto da floresta', stack: 1, tool: false },
} as const;
export type ItemId = keyof typeof ITEMS;
export const ROASTED_TURNIP_HEAL = 20;
export const PLAYER_ATTACK_RANGE = 64;
export const PLAYER_ATTACK_COOLDOWN_MS = 400;
export const UNARMED_DAMAGE = 20;
export const WEAPON_DAMAGE = { sword: 30, iron_sword: 45 } as const;
export interface Slot {
  index: number;
  itemId: ItemId;
  quantity: number;
}
export interface GameplaySnapshot {
  characterId: string;
  revision: number;
  gold: number;
  inventory: Slot[];
  equipment: { slot: string; itemId: ItemId }[];
  skills: { profession: string; xp: number }[];
  talents?: TalentRanks;
  attributes?: AttributeRanks;
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
export const CRAFTING_INTERACTION_RANGE = 140;
export const CRAFTING_SERVER_MAX_RANGE = 160;

export const CRAFTING_STATIONS = [
  {
    id: 'workbench-plaza',
    name: 'Bancada de trabalho',
    type: 'workbench',
    x: 1456,
    y: 832,
  },
  {
    id: 'forge-blacksmith',
    name: 'Forja do Ferreiro',
    type: 'forge',
    x: 1552,
    y: 832,
  },
  {
    id: 'furnace-blacksmith',
    name: 'Fornalha',
    type: 'furnace',
    x: 1648,
    y: 832,
  },
  {
    id: 'campfire-plaza',
    name: 'Fogueira da Praça',
    type: 'campfire',
    ...PLAZA_CAMPFIRE,
  },
  {
    id: 'campfire-woodland',
    name: 'Fogueira do Bosque',
    type: 'campfire',
    ...CAMPFIRE,
  },
] as const;
export type CraftingStationId = (typeof CRAFTING_STATIONS)[number]['id'];
export type CraftingStationType = (typeof CRAFTING_STATIONS)[number]['type'];

export function craftingStationRange(
  type: CraftingStationType,
  defaultRange = CRAFTING_INTERACTION_RANGE,
) {
  return type === 'campfire' ? CAMPFIRE_REST_RANGE : defaultRange;
}

const recipeIds = [
  'plank',
  'sword',
  'charcoal',
  'iron_ingot',
  'iron_axe',
  'iron_sword',
  'roasted_turnip',
] as const;
export type RecipeId = (typeof recipeIds)[number];

export interface CraftingRecipe {
  id: RecipeId;
  name: string;
  station: CraftingStationType;
  inputs: { itemId: ItemId; quantity: number }[];
  output: { itemId: ItemId; quantity: number };
  profession: string;
  xp: number;
}

export const CRAFTING_RECIPES: Record<RecipeId, CraftingRecipe> = {
  roasted_turnip: {
    id: 'roasted_turnip',
    name: 'Nabo assado',
    station: 'campfire',
    inputs: [{ itemId: 'turnip', quantity: 1 }],
    output: { itemId: 'roasted_turnip', quantity: 1 },
    profession: 'farmer',
    xp: 5,
  },
  plank: {
    id: 'plank',
    name: 'Tábua de madeira',
    station: 'workbench',
    inputs: [{ itemId: 'wood', quantity: 2 }],
    output: { itemId: 'plank', quantity: 1 },
    profession: 'blacksmith',
    xp: 10,
  },
  sword: {
    id: 'sword',
    name: 'Espada de treino',
    station: 'forge',
    inputs: [
      { itemId: 'wood', quantity: 3 },
      { itemId: 'stone', quantity: 2 },
    ],
    output: { itemId: 'sword', quantity: 1 },
    profession: 'blacksmith',
    xp: 25,
  },
  charcoal: {
    id: 'charcoal',
    name: 'Carvão vegetal',
    station: 'furnace',
    inputs: [{ itemId: 'wood', quantity: 2 }],
    output: { itemId: 'charcoal', quantity: 2 },
    profession: 'blacksmith',
    xp: 10,
  },
  iron_ingot: {
    id: 'iron_ingot',
    name: 'Lingote de ferro',
    station: 'furnace',
    inputs: [
      { itemId: 'iron_ore', quantity: 2 },
      { itemId: 'charcoal', quantity: 1 },
    ],
    output: { itemId: 'iron_ingot', quantity: 1 },
    profession: 'blacksmith',
    xp: 15,
  },
  iron_axe: {
    id: 'iron_axe',
    name: 'Machado de ferro',
    station: 'forge',
    inputs: [
      { itemId: 'iron_ingot', quantity: 1 },
      { itemId: 'wood', quantity: 2 },
    ],
    output: { itemId: 'iron_axe', quantity: 1 },
    profession: 'blacksmith',
    xp: 30,
  },
  iron_sword: {
    id: 'iron_sword',
    name: 'Espada de ferro',
    station: 'forge',
    inputs: [
      { itemId: 'iron_ingot', quantity: 2 },
      { itemId: 'wood', quantity: 1 },
    ],
    output: { itemId: 'iron_sword', quantity: 1 },
    profession: 'blacksmith',
    xp: 40,
  },
};

export type MonsterKind = 'slime' | 'orc' | 'skeleton';
export interface MonsterDefinition {
  id: string;
  kind: MonsterKind;
  name: string;
  spawnX: number;
  spawnY: number;
  maxHealth: number;
  damage: number;
  speed: number;
  aggroRange: number;
  attackRange: number;
  returnRange: number;
  xp: number;
  drop: { itemId: ItemId; quantity: number };
}

export const MONSTERS: readonly MonsterDefinition[] = [
  {
    id: 'slime-1',
    kind: 'slime',
    name: 'Slime Saltitante',
    spawnX: 1540,
    spawnY: 1700,
    maxHealth: 60,
    damage: 10,
    speed: 80,
    aggroRange: 120,
    attackRange: 36,
    returnRange: 220,
    xp: 30,
    drop: { itemId: 'slime_goo', quantity: 2 },
  },
  {
    id: 'slime-2',
    kind: 'slime',
    name: 'Slime Espinhoso',
    spawnX: 1580,
    spawnY: 1730,
    maxHealth: 60,
    damage: 10,
    speed: 80,
    aggroRange: 120,
    attackRange: 36,
    returnRange: 220,
    xp: 30,
    drop: { itemId: 'slime_goo', quantity: 2 },
  },
  {
    id: 'slime-3',
    kind: 'slime',
    name: 'Slime Musgoso',
    spawnX: 1500,
    spawnY: 1740,
    maxHealth: 60,
    damage: 10,
    speed: 80,
    aggroRange: 120,
    attackRange: 36,
    returnRange: 220,
    xp: 30,
    drop: { itemId: 'slime_goo', quantity: 2 },
  },
  ...[
    {
      id: 'south-slime-1',
      name: 'Slime do Campo',
      kind: 'slime' as const,
      spawnX: 1232,
      spawnY: 2480,
    },
    {
      id: 'south-slime-2',
      name: 'Slime do Campo',
      kind: 'slime' as const,
      spawnX: 1392,
      spawnY: 2544,
    },
    {
      id: 'south-slime-3',
      name: 'Slime do Campo',
      kind: 'slime' as const,
      spawnX: 1456,
      spawnY: 2640,
    },
    {
      id: 'orc-1',
      name: 'Orc Batedor',
      kind: 'orc' as const,
      spawnX: 2480,
      spawnY: 1392,
    },
    {
      id: 'orc-2',
      name: 'Orc Saqueador',
      kind: 'orc' as const,
      spawnX: 2672,
      spawnY: 1456,
    },
    {
      id: 'orc-3',
      name: 'Orc Batedor',
      kind: 'orc' as const,
      spawnX: 2544,
      spawnY: 1648,
    },
    {
      id: 'orc-4',
      name: 'Orc Saqueador',
      kind: 'orc' as const,
      spawnX: 2768,
      spawnY: 1616,
    },
    {
      id: 'skeleton-1',
      name: 'Vigia Esquecido',
      kind: 'skeleton' as const,
      spawnX: 2672,
      spawnY: 624,
    },
    {
      id: 'skeleton-2',
      name: 'Vigia Esquecido',
      kind: 'skeleton' as const,
      spawnX: 2640,
      spawnY: 816,
    },
  ].map((m) => ({
    ...m,
    maxHealth: m.kind === 'slime' ? 60 : 90,
    damage: m.kind === 'slime' ? 10 : 14,
    speed: m.kind === 'orc' ? 72 : 64,
    aggroRange: 120,
    attackRange: 36,
    returnRange: 180,
    xp: m.kind === 'slime' ? 30 : 40,
    drop: {
      itemId: (m.kind === 'slime'
        ? 'slime_goo'
        : m.kind === 'orc'
          ? 'fiber'
          : 'stone') as ItemId,
      quantity: 2,
    },
  })),
] as const;

export interface MonsterSnapshot {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  state: 'idle' | 'patrol' | 'chase' | 'windup' | 'attack' | 'return' | 'dead';
  targetId?: string;
  strikeAt?: number;
  attackRange: number;
}

export type CombatFeedback =
  | {
      kind: 'strike';
      attackerId: string;
      monsterId: string;
      origin: { x: number; y: number };
      dashFrom?: { x: number; y: number };
      x: number;
      y: number;
      amount: number;
      lethal: boolean;
      isCrit?: boolean;
      skillId?: string;
    }
  | {
      kind: 'hurt' | 'heal' | 'dodge';
      source?: 'food' | 'skill';
      playerId: string;
      x: number;
      y: number;
      amount: number;
      isCrit?: boolean;
      skillId?: string;
    };

const itemIds = Object.keys(ITEMS) as [ItemId, ...ItemId[]];
const slot = z.number().int().min(0).max(23);
const base = { id: z.uuid(), revision: z.number().int().nonnegative() };
export const GameActionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      ...base,
      kind: z.literal('allocate_attribute'),
      attribute: z.enum(ATTRIBUTE_IDS),
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('allocate_talent'),
      talent: z.enum(TALENT_IDS),
    })
    .strict(),
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
  z
    .object({
      ...base,
      kind: z.literal('equip'),
      from: slot,
      slot: z.enum(EQUIPMENT_SLOTS).optional(),
    })
    .strict(),
  z.object({ ...base, kind: z.literal('consume'), from: slot }).strict(),
  z
    .object({
      ...base,
      kind: z.literal('unequip'),
      slot: z.enum(EQUIPMENT_SLOTS).optional(),
    })
    .strict(),
  z
    .object({ ...base, kind: z.literal('gather'), node: z.string().max(40) })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('craft'),
      recipeId: z.enum(recipeIds),
      stationId: z.string().max(40),
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('attack'),
      targetId: z.string().max(40),
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('buy'),
      itemId: z.enum(itemIds),
      quantity: z.number().int().min(1).max(99),
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('sell'),
      from: slot,
      quantity: z.number().int().min(1).max(99),
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('skill'),
      skillId: z.enum(['cleave', 'charge', 'heal', 'magic_dart']),
      targetId: z.string().max(40).optional(),
    })
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

export function canCraft(slots: Slot[], recipe: CraftingRecipe): boolean {
  for (const input of recipe.inputs) {
    const available = slots
      .filter((s) => s.itemId === input.itemId)
      .reduce((sum, s) => sum + s.quantity, 0);
    if (available < input.quantity) return false;
  }
  return true;
}

export function consumeItems(
  slots: Slot[],
  inputs: { itemId: ItemId; quantity: number }[],
): Slot[] {
  const result = slots.map((s) => ({ ...s }));
  for (const input of inputs) {
    let needed = input.quantity;
    for (const s of result) {
      if (s.itemId === input.itemId && needed > 0) {
        const taken = Math.min(needed, s.quantity);
        s.quantity -= taken;
        needed -= taken;
      }
    }
    if (needed > 0) throw new Error('Materiais insuficientes.');
  }
  return result.filter((s) => s.quantity > 0);
}

export function craftItem(slots: Slot[], recipe: CraftingRecipe): Slot[] {
  if (!canCraft(slots, recipe)) throw new Error('Materiais insuficientes.');
  const afterConsumption = consumeItems(slots, recipe.inputs);
  return addItem(
    afterConsumption,
    recipe.output.itemId,
    recipe.output.quantity,
  );
}
