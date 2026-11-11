import { describe, expect, it } from 'vitest';
import {
  canStand,
  moveInWorld,
  terrainAt,
  WORLD_SPAWN,
  MAP_SIZE,
  landmarks,
  worldTiles,
  BRIDGES,
  QUARRY,
} from './world.js';
import {
  MONSTERS,
  RESOURCES,
  QUARRY_RESOURCES,
  CRAFTING_STATIONS,
} from './gameplay.js';
import { FARM_PLOTS } from './index.js';
describe('world movement', () => {
  it('has a walkable spawn and blocks water, buildings and boundaries', () => {
    expect(canStand(WORLD_SPAWN.x, WORLD_SPAWN.y)).toBe(true);
    expect(canStand(45 * 32, 12 * 32)).toBe(false);
    expect(canStand(24 * 32, 25 * 32)).toBe(false);
    expect(canStand(-10, 1040)).toBe(false);
    expect(terrainAt(MAP_SIZE, 20)).toBe(4);
    expect(canStand(Number.NaN, 1040)).toBe(false);
  });
  it('connects the village, every mob spawn, farms and all house fronts in the expanded world', () => {
    const queue: [number, number][] = [[32, 32]],
      reached = new Set<string>();
    while (queue.length) {
      const [x, y] = queue.pop()!,
        key = `${x},${y}`;
      if (reached.has(key) || !canStand(x * 32 + 16, y * 32 + 16)) continue;
      reached.add(key);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        queue.push([x + dx!, y + dy!]);
    }
    expect(MAP_SIZE).toBe(96);
    expect(worldTiles).toHaveLength(96);
    for (const mob of MONSTERS) {
      expect(canStand(mob.spawnX, mob.spawnY), mob.id).toBe(true);
      expect(
        reached.has(
          `${Math.floor(mob.spawnX / 32)},${Math.floor(mob.spawnY / 32)}`,
        ),
        mob.id,
      ).toBe(true);
      expect(
        Math.hypot(mob.spawnX - WORLD_SPAWN.x, mob.spawnY - WORLD_SPAWN.y),
      ).toBeGreaterThan(mob.aggroRange + mob.returnRange);
    }
    for (const b of landmarks)
      expect(
        reached.has(`${b.x + Math.floor(b.w / 2)},${b.y + b.h}`),
        b.name,
      ).toBe(true);
    for (const p of FARM_PLOTS)
      expect(reached.has(`${p.tileX},${p.tileY}`), p.id).toBe(true);
    for (const p of [...RESOURCES, ...CRAFTING_STATIONS]) {
      expect(canStand(p.x, p.y), p.id).toBe(true);
      expect(
        reached.has(`${Math.floor(p.x / 32)},${Math.floor(p.y / 32)}`),
        p.id,
      ).toBe(true);
    }
    expect(reached.has('80,44')).toBe(true);
    expect(reached.has('40,80')).toBe(true);
    for (const b of BRIDGES)
      expect(reached.has(`${b.x + 2},${b.y + 1}`)).toBe(true);
  });
  it('keeps quarry nodes apart on reachable terrain and clear of the main routes', () => {
    expect(new Set(QUARRY_RESOURCES.map((node) => node.kind))).toEqual(
      new Set(['ore', 'rock']),
    );
    for (const [i, node] of QUARRY_RESOURCES.entries()) {
      const x = Math.floor(node.x / 32);
      const y = Math.floor(node.y / 32);
      expect(x).toBeGreaterThanOrEqual(QUARRY.x);
      expect(x).toBeLessThan(QUARRY.x + QUARRY.w);
      expect(y).toBeGreaterThanOrEqual(QUARRY.y);
      expect(y).toBeLessThan(QUARRY.y + QUARRY.h);
      expect(terrainAt(x, y)).toBe(0);
      for (const other of QUARRY_RESOURCES.slice(i + 1))
        expect(
          Math.hypot(node.x - other.x, node.y - other.y),
        ).toBeGreaterThanOrEqual(64);
    }
    expect(
      RESOURCES.some(
        ({ x, y }) => x >= 600 && x <= 1120 && y >= 960 && y <= 1120,
      ),
    ).toBe(false);
  });
  it('normalizes diagonals and caps a stalled frame', () => {
    const { x, y } = WORLD_SPAWN;
    const straight = moveInWorld(x, y, 1, 0, 0.05);
    const diagonal = moveInWorld(x, y, 1, 1, 0.05);
    expect(Math.hypot(diagonal.x - x, diagonal.y - y)).toBeCloseTo(
      straight.x - x,
    );
    expect(moveInWorld(x, y, 1, 0, 10).x - x).toBeCloseTo(8);
  });
  it('slides along walls and never tunnels through a building', () => {
    let p = { x: 23 * 32 - 10, y: 25 * 32 };
    for (let i = 0; i < 100; i++) p = moveInWorld(p.x, p.y, 1, 0, 0.05);
    expect(p.x).toBeLessThan(23 * 32);
    expect(canStand(p.x, p.y)).toBe(true);
  });
});
