import { expect, it } from 'vitest';
import { MovementQueue } from './movement.js';
it('rejects positions, invalid directions and replayed inputs', () => {
  const queue = new MovementQueue();
  expect(queue.accept({ seq: 1, dx: 1, dy: 0, x: 9999 })).toBe(false);
  expect(queue.accept({ seq: 1, dx: 2, dy: 0 })).toBe(false);
  expect(queue.accept({ seq: 1, dx: 1, dy: 0 })).toBe(true);
  expect(queue.accept({ seq: 1, dx: 1, dy: 0 })).toBe(false);
  expect(queue.step(1040, 1040)?.x).toBe(1048);
  expect(queue.step(1048, 1040)).toBeUndefined();
});
it('caps backlog and executes only one fixed step at a time', () => {
  const queue = new MovementQueue();
  for (let i = 1; i <= 4; i++)
    expect(queue.accept({ seq: i, dx: 1, dy: 1 })).toBe(true);
  expect(queue.accept({ seq: 5, dx: 1, dy: 1 })).toBe(false);
  const next = queue.step(1040, 1040)!;
  expect(Math.hypot(next.x - 1040, next.y - 1040)).toBeCloseTo(8);
  queue.clear();
  expect(queue.step(next.x, next.y)).toBeUndefined();
});
