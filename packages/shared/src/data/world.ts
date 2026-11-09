import { TILE_SIZE } from '../constants/index.js';
export const MAP_SIZE = 64;
export const WORLD_SPAWN = { x: 1040, y: 1040 };
export const landmarks = [
  { name: 'Casa', x: 23, y: 24, w: 5, h: 4 },
  { name: 'Armazém', x: 37, y: 24, w: 6, h: 4 },
  { name: 'Ferreiro', x: 37, y: 36, w: 6, h: 4 },
] as const;
export function terrainAt(x: number, y: number) {
  if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return 4;
  if (x === 0 || y === 0 || x === 63 || y === 63) return 4;
  if (x >= 43 && x <= 56 && y >= 9 && y <= 21) return 3;
  if (
    landmarks.some(
      (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h,
    )
  )
    return 4;
  if (x >= 8 && x <= 19 && y >= 36 && y <= 47) return 2;
  if ((x >= 30 && x <= 33) || (y >= 30 && y <= 33)) return 1;
  if (x >= 25 && x <= 38 && y >= 28 && y <= 35) return 1;
  if (
    (x < 22 && y < 25 && (x * 7 + y * 13) % 17 < 3) ||
    (x > 44 && y > 39 && (x * 7 + y * 3) % 19 < 3)
  )
    return 4;
  return 0;
}
export const worldTiles = Array.from({ length: MAP_SIZE }, (_, y) =>
  Array.from({ length: MAP_SIZE }, (_, x) => terrainAt(x, y)),
);
export function canStand(x: number, y: number) {
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
) {
  const length = Math.hypot(dx, dy);
  if (!length) return { x, y };
  const distance = 160 * Math.min(Math.max(seconds, 0), 0.05);
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
