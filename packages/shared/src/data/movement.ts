import { z } from 'zod';
import { moveInWorld } from './world.js';
export const MovementInputSchema = z
  .object({
    seq: z.number().int().min(1).max(2147483647),
    dx: z.number().int().min(-1).max(1),
    dy: z.number().int().min(-1).max(1),
  })
  .strict();
export type MovementInput = z.infer<typeof MovementInputSchema>;
export class MovementQueue {
  private queue: MovementInput[] = [];
  private lastReceived = 0;
  accept(input: unknown) {
    const parsed = MovementInputSchema.safeParse(input);
    if (
      !parsed.success ||
      parsed.data.seq <= this.lastReceived ||
      this.queue.length >= 4
    )
      return false;
    this.lastReceived = parsed.data.seq;
    this.queue.push(parsed.data);
    return true;
  }
  step(x: number, y: number, speed?: number) {
    const input = this.queue.shift();
    if (!input) return undefined;
    return {
      ...moveInWorld(x, y, input.dx, input.dy, 0.05, speed),
      seq: input.seq,
      direction:
        input.dy < 0
          ? 'up'
          : input.dy > 0
            ? 'down'
            : input.dx < 0
              ? 'left'
              : input.dx > 0
                ? 'right'
                : undefined,
    };
  }
  clear() {
    this.queue = [];
  }
}
