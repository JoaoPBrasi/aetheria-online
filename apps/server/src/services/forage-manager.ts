import {
  CEMETERY,
  CRAFTING_STATIONS,
  FORAGE_TYPES,
  GROVE_RESOURCES,
  MAP_SIZE,
  MONSTERS,
  NPCS,
  QUARRY,
  TILE_SIZE,
  WOODLAND_CAMP,
  WORLD_SPAWN,
  landmarks,
  terrainAt,
  worldTiles,
  type ForageKind,
  type ForageNode,
} from '@aetheria/shared';

const RESPAWN_MS = 5_000;
const SECTOR_SIZE = (MAP_SIZE / 3) * TILE_SIZE;
const TILE_NEIGHBORS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;
type Site = { x: number; y: number; sector: number };
const sectorAt = (x: number, y: number) =>
  Math.floor(x / SECTOR_SIZE) + 3 * Math.floor(y / SECTOR_SIZE);
const nearObjects = [
  ...CRAFTING_STATIONS,
  ...NPCS,
  ...MONSTERS.map(({ spawnX: x, spawnY: y }) => ({ x, y })),
];

function findSites(): Site[] {
  const sites: Site[] = [];
  const visited = new Set<number>();
  const queue = [
    [
      Math.floor(WORLD_SPAWN.x / TILE_SIZE),
      Math.floor(WORLD_SPAWN.y / TILE_SIZE),
    ],
  ];
  while (queue.length) {
    const [tx, ty] = queue.pop()!;
    const tile = worldTiles[ty!]?.[tx!];
    if (tile === undefined || tile === 3 || tile === 4) continue;
    const index = ty! * MAP_SIZE + tx!;
    if (visited.has(index)) continue;
    visited.add(index);
    const [x, y] = [tx!, ty!];
    for (const [dx, dy] of TILE_NEIGHBORS) queue.push([x + dx, y + dy]);
    if (tile !== 0) continue;
    // A arte das margens ocupa parte do tile de grama vizinho à água.
    if (TILE_NEIGHBORS.some(([dx, dy]) => terrainAt(x + dx, y + dy) === 3))
      continue;
    if (
      [QUARRY, WOODLAND_CAMP, { ...CEMETERY, w: 17, h: 17 }].some(
        (rect) =>
          x >= rect.x - 1 &&
          x < rect.x + rect.w + 1 &&
          y >= rect.y - 1 &&
          y < rect.y + rect.h + 1,
      )
    )
      continue;
    if (
      landmarks.some(
        (house) =>
          x >= house.x - 2 &&
          x < house.x + house.w + 2 &&
          y >= house.y - 6 &&
          y <= house.y + house.h,
      )
    )
      continue;
    // Deixa o ponto livre de obstáculos e de copas em primeiro plano.
    if (
      [-1, 0, 1].some((dx) =>
        [-1, 0, 1, 2, 3, 4, 5].some((dy) => terrainAt(x + dx, y + dy) === 4),
      )
    )
      continue;
    const px = (x + 0.5) * TILE_SIZE;
    const py = (y + 0.5) * TILE_SIZE;
    if (
      nearObjects.some(
        (object) => Math.hypot(px - object.x, py - object.y) < 128,
      )
    )
      continue;
    if (
      GROVE_RESOURCES.some(
        (tree) =>
          Math.abs(px - tree.x) < 64 && py <= tree.y + 32 && py >= tree.y - 192,
      )
    )
      continue;
    sites.push({
      x: px,
      y: py,
      sector: sectorAt(px, py),
    });
  }
  return sites;
}

const sites = findSites();

export class ForageManager {
  private readonly active = new Map<string, ForageNode>();
  private readonly pending: { node: ForageNode; readyAt: number }[] = [];
  private sequence = 0;

  constructor(private readonly random = Math.random) {
    for (const kind of ['fiber', 'flower'] as const) {
      const count = 5 + Math.floor(this.random() * 4);
      for (let i = 0; i < count; i++) this.spawn(kind);
    }
  }

  get(id: string) {
    return this.active.get(id);
  }

  nodes(): ForageNode[] {
    return [...this.active.values()];
  }

  collect(id: string, now: number) {
    const node = this.active.get(id);
    if (!node) return;
    this.active.delete(id);
    this.pending.push({ node, readyAt: now + RESPAWN_MS });
  }

  tick(now: number) {
    let changed = false;
    while (this.pending[0] && this.pending[0].readyAt <= now) {
      const { node } = this.pending.shift()!;
      this.spawn(node.kind, node);
      changed = true;
    }
    return changed;
  }

  private spawn(kind: ForageKind, previous?: ForageNode) {
    const active = [...this.active.values()];
    const counts = Array<number>(9).fill(0);
    for (const node of active) {
      if (node.kind !== kind) continue;
      const sector = sectorAt(node.x, node.y);
      counts[sector] = counts[sector]! + 1;
    }

    let best = Infinity;
    let candidates: Site[] = [];
    for (const site of sites) {
      const count = counts[site.sector]!;
      if (count > best) continue;
      if (
        previous &&
        Math.hypot(site.x - previous.x, site.y - previous.y) < 128
      )
        continue;
      if (
        active.some((node) => Math.hypot(site.x - node.x, site.y - node.y) < 96)
      )
        continue;
      if (count < best) {
        best = count;
        candidates = [];
      }
      candidates.push(site);
    }
    const site = candidates[Math.floor(this.random() * candidates.length)];
    if (!site) throw new Error('Sem local livre para os coletáveis.');
    this.sequence++;
    this.active.set(`forage-${kind}-${this.sequence}`, {
      ...FORAGE_TYPES[kind],
      x: site.x,
      y: site.y,
      id: `forage-${kind}-${this.sequence}`,
    });
  }
}
