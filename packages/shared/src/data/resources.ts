import { TILE_SIZE } from '../constants/index.js';
import type { ItemId } from './gameplay.js';

export const DEFAULT_TREE_GROWTH_MS = 120_000;

export interface ResourceDefinition {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: 'tree' | 'rock' | 'ore' | 'fiber' | 'flower';
  item: ItemId;
  tool?: ItemId;
  profession: string;
}

export type ResourceStates = Record<
  string,
  { readyAt: number; cutAt?: number }
>;

export function treeStage(
  state: ResourceStates[string] | undefined,
  now: number,
) {
  if (state?.cutAt === undefined || now >= state.readyAt) return 'adult';
  return now < (state.cutAt + state.readyAt) / 2 ? 'seedling' : 'young';
}

const quarryTypes = {
  ore: {
    kind: 'ore',
    item: 'iron_ore',
    name: 'Minério de ferro',
    tool: 'pickaxe',
    profession: 'miner',
  },
  rock: {
    kind: 'rock',
    item: 'stone',
    name: 'Pedra da pedreira',
    tool: 'pickaxe',
    profession: 'miner',
  },
} as const;

export const FORAGE_TYPES = {
  fiber: {
    kind: 'fiber',
    item: 'fiber',
    name: 'Fibras silvestres',
    tool: 'sickle',
    profession: 'farmer',
  },
  flower: {
    kind: 'flower',
    item: 'flower',
    name: 'Flores silvestres',
    profession: 'farmer',
  },
} as const;
export type ForageKind = keyof typeof FORAGE_TYPES;
export type ForageNode = ResourceDefinition & { kind: ForageKind };

export const GROVE_RESOURCES: readonly ResourceDefinition[] = [
  [6, 5],
  [11, 5],
  [15, 6],
  [19, 5],
  [8, 9],
  [12, 10],
  [17, 9],
  [20, 11],
  [5, 13],
  [10, 14],
  [14, 13],
  [18, 15],
  [7, 17],
  [12, 18],
  [16, 18],
  [20, 19],
  [5, 21],
  [9, 22],
  [14, 22],
  [18, 22],
].map(([x, y]) => ({
  id: `grove-tree-${x}-${y}`,
  name: 'Carvalho antigo',
  x: (x! + 0.5) * TILE_SIZE,
  y: (y! + 0.5) * TILE_SIZE,
  kind: 'tree',
  item: 'wood',
  tool: 'axe',
  profession: 'lumberjack',
}));

const quarryTiles = [
  [69, 13, 'ore'],
  [71, 14, 'ore'],
  [63, 6, 'ore'],
  [67, 9, 'ore'],
  [63, 12, 'ore'],
  [67, 6, 'rock'],
  [72, 6, 'rock'],
  [62, 9, 'rock'],
  [69, 10, 'rock'],
  [65, 12, 'rock'],
] as const;
export const QUARRY_RESOURCES: readonly ResourceDefinition[] = quarryTiles.map(
  ([x, y, kind]) => ({
    ...quarryTypes[kind],
    id: `quarry-${kind}-${x}-${y}`,
    x: (x + 0.5) * TILE_SIZE,
    y: (y + 0.5) * TILE_SIZE,
  }),
);
export const RESOURCES = [...GROVE_RESOURCES, ...QUARRY_RESOURCES];
