import { TILE_SIZE } from '../constants/index.js';
import { CEMETERY } from './cemetery.js';
import { BASE_MOVEMENT_SPEED } from './attributes.js';
export const MAP_SIZE = 96;
export const WORLD_ART_REVISION = 'brumavale-lakeside-quarry-v5';
export const QUARRY = { x: 60, y: 5, w: 13, h: 10 };
export const WOODLAND_CAMP = { x: 50, y: 41, w: 5, h: 4 };
export const CAMPFIRE = { x: 52.5 * TILE_SIZE, y: 43.5 * TILE_SIZE };
export const PLAZA_CAMPFIRE = { x: 32 * TILE_SIZE, y: 32 * TILE_SIZE };
export const REST_CAMPFIRES = [PLAZA_CAMPFIRE, CAMPFIRE] as const;
export const CAMPFIRE_REST_RANGE = 66;
export function isNearRestCampfire({ x, y }: { x: number; y: number }) {
  return REST_CAMPFIRES.some(
    (fire) => Math.hypot(x - fire.x, y - fire.y) <= CAMPFIRE_REST_RANGE,
  );
}
const woodland = { x: 43, y: 35, w: 17, h: 20 };
const woodlandTrees = [
  [46, 41],
  [47, 49],
  [49, 38],
  [51, 51],
  [54, 38],
  [57, 50],
  [57, 42],
  [59, 48],
] as const;
export const ANCIENT_GROVE = { x: 1, y: 1, w: 21, h: 24 };
// As copas ultrapassam o tile do tronco em até 1 tile na lateral e 6 ao norte.
const quarryTreeClearance = {
  x: QUARRY.x - 1,
  y: QUARRY.y,
  w: QUARRY.w + 2,
  h: QUARRY.h + 6,
};
export const WORLD_SPAWN = { x: 1040, y: 1040 };
export const landmarks = [
  { name: 'Casa', model: 'timber', x: 23, y: 24, w: 6, h: 4 },
  { name: 'Armazém', model: 'lodge', x: 37, y: 24, w: 6, h: 4 },
  { name: 'Ferreiro', model: 'smith', x: 39, y: 36, w: 6, h: 4 },
  { name: 'Estalagem', model: 'lodge', x: 23, y: 14, w: 6, h: 4 },
  { name: 'Casa do Pescador', model: 'riverside', x: 34, y: 8, w: 6, h: 4 },
  { name: 'Estufa', model: 'greenhouse', x: 21, y: 50, w: 5, h: 4 },
  { name: 'Casa da Horta', model: 'timber', x: 22, y: 39, w: 6, h: 4 },
  { name: 'Cabana do Caminho', model: 'lodge', x: 35, y: 57, w: 6, h: 4 },
] as const;
export const WORLD_REGIONS = [
  {
    id: 'quarry',
    name: 'Pedreira do Lago',
    ...QUARRY,
    danger: 'safe',
  },
  {
    id: 'professions',
    name: 'Zona de Profissões',
    x: 43,
    y: 23,
    w: 11,
    h: 7,
    danger: 'safe',
  },
  {
    id: 'woodland-camp',
    name: 'Acampamento do Bosque',
    ...WOODLAND_CAMP,
    danger: 'safe',
  },
  {
    id: 'village',
    name: 'Vila de Brumavale',
    x: 18,
    y: 16,
    w: 28,
    h: 33,
    danger: 'safe',
  },
  {
    id: 'gardens',
    name: 'Hortas de Brumavale',
    x: 8,
    y: 35,
    w: 22,
    h: 22,
    danger: 'safe',
  },
  {
    id: 'slimes',
    name: 'Prado dos Slimes',
    x: 44,
    y: 49,
    w: 14,
    h: 13,
    danger: 'low',
  },
  {
    id: 'south',
    name: 'Campos do Sul',
    x: 34,
    y: 73,
    w: 17,
    h: 14,
    danger: 'low',
  },
  {
    id: 'orcs',
    name: 'Acampamento dos Orcs',
    x: 74,
    y: 39,
    w: 16,
    h: 17,
    danger: 'medium',
  },
  {
    id: 'cemetery',
    name: 'Cemitério da Vigia',
    x: CEMETERY.x,
    y: CEMETERY.y,
    w: 17,
    h: 17,
    danger: 'medium',
  },
] as const;
export const WORLD_PATHS = [
  [
    [32, 22],
    [32, 80],
  ],
  [
    [1, 32],
    [88, 32],
  ],
  [
    [32, 42],
    [20, 42],
  ],
  [
    [32, 52],
    [26, 52],
  ],
  [
    [32, 62],
    [38, 62],
  ],
  [
    [32, 14],
    [37, 14],
    [41, 16],
  ],
  [
    [69, 32],
    [69, 17],
    [66.5, 14],
  ],
  [
    [58, 32],
    [69, 32],
    [76, 27],
    [83.5, 23],
    [83.5, 21],
  ],
  [
    [72, 32],
    [80, 41],
    [82, 53],
    [80, 63],
    [68, 67],
    [48, 74],
    [32, 78],
  ],
] as const;
export const BRIDGES = [
  { x: 58, y: 30, w: 9, h: 4 },
  { x: 63, y: 65, w: 10, h: 4 },
  { x: 40, y: 15, w: 5, h: 2 },
] as const;
export const VILLAGE_PROPS = [
  { id: 'camp-bench-west', kind: 'bench', x: 50, y: 43, w: 1, h: 1 },
  { id: 'camp-bench-east', kind: 'bench', x: 54, y: 43, w: 1, h: 1 },
  { id: 'market-west', kind: 'stall', x: 25, y: 30, w: 2, h: 1 },
  { id: 'market-south', kind: 'stall', x: 25, y: 34, w: 2, h: 1 },
  { id: 'fishing-crate', kind: 'crate', x: 40, y: 12, w: 1, h: 1 },
  { id: 'greenhouse-planter', kind: 'planter', x: 27, y: 54, w: 1, h: 1 },
  { id: 'orchard-planter', kind: 'planter', x: 21, y: 43, w: 1, h: 1 },
  { id: 'orc-crate', kind: 'crate', x: 79, y: 48, w: 1, h: 1 },
  { id: 'orc-crate-two', kind: 'crate', x: 84, y: 46, w: 1, h: 1 },
] as const;
export const ROCKS = [
  [61, 7],
  [65, 9],
  [70, 8],
  [72, 12],
  [77, 47],
  [85, 49],
  [81, 54],
] as const;
const RIVER = [
  [55, 19],
  [61, 26],
  [64, 42],
  [62, 55],
  [68, 75],
  [72, 96],
] as const;
const inRect = (
  x: number,
  y: number,
  r: { x: number; y: number; w: number; h: number },
) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
function nearPath(
  x: number,
  y: number,
  points: readonly (readonly [number, number])[],
  radius: number,
) {
  return points.slice(1).some((b, i) => {
    const a = points[i]!,
      dx = b[0] - a[0],
      dy = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)),
    );
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) <= radius;
  });
}
export function isBridgeTile(x: number, y: number) {
  return BRIDGES.some((b) => inRect(x, y, b));
}
export function isWaterTile(x: number, y: number) {
  return (
    ((x - 50) / 9) ** 2 + ((y - 15) / 7) ** 2 < 1 || nearPath(x, y, RIVER, 1.8)
  );
}
export function terrainAt(x: number, y: number) {
  if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return 4;
  if (x === 0 || y === 0 || x === MAP_SIZE - 1 || y === MAP_SIZE - 1) return 4;
  const cx = x - CEMETERY.x,
    cy = y - CEMETERY.y;
  const cell = CEMETERY.rows[cy]?.[cx];
  if (cell) {
    if (
      ['#', 'P', 'g'].includes(cell) ||
      (cx >= 6 && cx <= 10 && cy >= 1 && cy <= 4)
    )
      return 4;
    return cell === ':' ? 1 : 0;
  }
  if (
    landmarks.some(
      (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h,
    )
  )
    return 4;
  if (VILLAGE_PROPS.some((p) => inRect(x, y, p))) return 4;
  if (isBridgeTile(x, y)) return 1;
  if (isWaterTile(x, y)) return 3;
  if (x >= 8 && x <= 19 && y >= 36 && y <= 47) return 2;
  if ((x >= 30 && x <= 33) || (y >= 30 && y <= 33)) return 1;
  if (x >= 25 && x <= 38 && y >= 28 && y <= 35) return 1;
  // Praça e Zona de Profissões ao lado do Armazém
  if (x >= 43 && x <= 52 && y >= 24 && y <= 29) return 1;
  if (WORLD_PATHS.some((path) => nearPath(x + 0.5, y + 0.5, path, 1.1)))
    return 1;
  if (ROCKS.some(([rx, ry]) => x === rx && y === ry)) return 4;
  if (inRect(x, y, woodland))
    return woodlandTrees.some(([tx, ty]) => x === tx && y === ty) ? 4 : 0;
  if (inRect(x, y, quarryTreeClearance) || inRect(x, y, ANCIENT_GROVE))
    return 0;
  const field = WORLD_REGIONS.some(
    (r) => r.danger !== 'safe' && inRect(x, y, r),
  );
  if (field) return 0;
  if (x >= 73 && x <= 93 && y >= 3 && y <= 27) return 0;
  if (
    (x > 44 && y > 39 && (x * 7 + y * 3) % 19 < 3) ||
    ((x > 70 || y > 66) && (x * 17 + y * 7) % 31 < 4)
  )
    return 4;
  return 0;
}
export const worldTiles = Array.from({ length: MAP_SIZE }, (_, y) =>
  Array.from({ length: MAP_SIZE }, (_, x) => terrainAt(x, y)),
);
export interface WorldArtProp {
  id: string;
  frame: string;
  x: number;
  y: number;
  depth: number;
}
export interface WorldArtwork {
  revision: string;
  width: number;
  height: number;
  props: WorldArtProp[];
  buildingFrames: Record<string, string>;
}
export function canStand(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return [-9, 9].every((dx) =>
    [-6, 6].every((dy) => {
      const tile = terrainAt(
        Math.floor((x + dx) / TILE_SIZE),
        Math.floor((y + dy) / TILE_SIZE),
      );
      return tile !== 3 && tile !== 4;
    }),
  );
}
export function moveInWorld(
  x: number,
  y: number,
  dx: number,
  dy: number,
  seconds: number,
  speed = BASE_MOVEMENT_SPEED,
) {
  const length = Math.hypot(dx, dy);
  if (!length) return { x, y };
  const distance = speed * Math.min(Math.max(seconds, 0), 0.05);
  // Small substeps prevent tunnelling and allow sliding along walls.
  const steps = Math.max(1, Math.ceil(distance / 4));
  for (let i = 0; i < steps; i++) {
    const nx = x + ((dx / length) * distance) / steps;
    if (canStand(nx, y)) x = nx;
    const ny = y + ((dy / length) * distance) / steps;
    if (canStand(x, ny)) y = ny;
  }
  return { x, y };
}
