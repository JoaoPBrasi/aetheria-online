import { describe, expect, it } from 'vitest';
import { canStand, moveInWorld, terrainAt, WORLD_SPAWN } from './world.js';
describe('world movement', () => {
  it('has a walkable spawn and blocks water, buildings and boundaries', () => {
    expect(canStand(WORLD_SPAWN.x, WORLD_SPAWN.y)).toBe(true);
    expect(canStand(45 * 32, 12 * 32)).toBe(false);
    expect(canStand(24 * 32, 25 * 32)).toBe(false);
    expect(canStand(-10, 1040)).toBe(false);
    expect(terrainAt(64, 20)).toBe(4);
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
