import { TILE_SIZE } from '../constants/index.js';
import type { ItemId } from './gameplay.js';
import { QUARRY, ROCKS, terrainAt } from './world.js';

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

const quarryTypes = [
  {
    kind: 'ore',
    item: 'iron_ore',
    name: 'Minério de ferro',
    tool: 'pickaxe',
    profession: 'miner',
  },
  {
    kind: 'rock',
    item: 'stone',
    name: 'Pedra da pedreira',
    tool: 'pickaxe',
    profession: 'miner',
  },
  {
    kind: 'fiber',
    item: 'fiber',
    name: 'Fibras silvestres',
    tool: 'sickle',
    profession: 'farmer',
  },
  {
    kind: 'flower',
    item: 'flower',
    name: 'Flores silvestres',
    profession: 'farmer',
  },
] as const;

function quarryResources(): ResourceDefinition[] {
  const candidates: { x: number; y: number }[] = [];
  for (let y = QUARRY.y + 1; y < QUARRY.y + QUARRY.h - 1; y++)
    for (let x = QUARRY.x + 3; x < QUARRY.x + QUARRY.w - 1; x++) {
      // Reserve the approach from the village and the route to the meadow.
      if (y === 43 || x === 52) continue;
      if (terrainAt(x, y) !== 0) continue;
      if (
        ROCKS.some(
          ([rx, ry]) => Math.abs(rx - x) <= 1 && y >= ry - 2 && y <= ry + 1,
        )
      )
        continue;
      candidates.push({ x: (x + 0.5) * TILE_SIZE, y: (y + 0.5) * TILE_SIZE });
    }
  // Stable pseudorandom layout, shared by the room and every client.
  let seed = 193_047;
  for (let i = candidates.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    const j = seed % (i + 1);
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }
  const nodes: ResourceDefinition[] = [];
  for (const point of candidates) {
    if (
      nodes.some((node) => Math.hypot(node.x - point.x, node.y - point.y) < 64)
    )
      continue;
    const type = quarryTypes[nodes.length % quarryTypes.length]!;
    nodes.push({
      ...point,
      ...type,
      id: `quarry-${type.kind}-${nodes.length + 1}`,
    });
    if (nodes.length === 20) break;
  }
  return nodes;
}

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

export const QUARRY_RESOURCES: readonly ResourceDefinition[] =
  quarryResources();
export const RESOURCES = [...GROVE_RESOURCES, ...QUARRY_RESOURCES];
