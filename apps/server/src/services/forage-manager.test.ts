import { expect, it } from 'vitest';
import { canStand, QUARRY, TILE_SIZE, terrainAt } from '@aetheria/shared';
import { ForageManager } from './forage-manager.js';

it('distributes 5 to 8 of each forage type across distinct sectors and replaces harvested locations', () => {
  let seed = 3941;
  const forage = new ForageManager(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  });
  const initial = forage.nodes();
  for (const kind of ['fiber', 'flower']) {
    const nodes = initial.filter((node) => node.kind === kind);
    expect(nodes.length).toBeGreaterThanOrEqual(5);
    expect(nodes.length).toBeLessThanOrEqual(8);
    expect(
      new Set(
        nodes.map(
          ({ x, y }) => `${Math.floor(x / 1024)}:${Math.floor(y / 1024)}`,
        ),
      ).size,
    ).toBe(nodes.length);
  }
  for (const [i, node] of initial.entries()) {
    const x = Math.floor(node.x / TILE_SIZE);
    const y = Math.floor(node.y / TILE_SIZE);
    expect(canStand(node.x, node.y)).toBe(true);
    expect(terrainAt(x, y)).toBe(0);
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const)
      expect(terrainAt(x + dx, y + dy)).not.toBe(3);
    expect(
      x >= QUARRY.x &&
        x < QUARRY.x + QUARRY.w &&
        y >= QUARRY.y &&
        y < QUARRY.y + QUARRY.h,
    ).toBe(false);
    for (const other of initial.slice(i + 1))
      expect(
        Math.hypot(node.x - other.x, node.y - other.y),
      ).toBeGreaterThanOrEqual(96);
  }
  for (const node of initial) forage.collect(node.id, 1000);
  expect(forage.nodes()).toHaveLength(0);
  expect(forage.tick(5999)).toBe(false);
  expect(forage.tick(6000)).toBe(true);
  const restored = forage.nodes();
  expect(restored.map((node) => node.kind)).toEqual(
    initial.map((node) => node.kind),
  );
  for (const [i, node] of restored.entries()) {
    expect(node.id).not.toBe(initial[i]!.id);
    expect(
      Math.hypot(node.x - initial[i]!.x, node.y - initial[i]!.y),
    ).toBeGreaterThanOrEqual(128);
  }
});
