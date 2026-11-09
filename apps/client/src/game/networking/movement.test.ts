import { beforeEach, expect, it } from 'vitest';
import { WorldState, PlayerPresence } from '@aetheria/shared';
import { movement } from './movement';
beforeEach(() => movement.reset());
it('replays only inputs not acknowledged by the server', () => {
  movement.send = () => undefined;
  movement.input(1, 0);
  movement.input(1, 0);
  const state = new WorldState();
  const player = new PlayerPresence();
  player.x = 1048;
  player.y = 1040;
  player.ack = 1;
  state.players.set('self', player);
  movement.reconcile(state, 'self');
  expect(movement.position.x).toBe(1056);
  expect(movement.pending.map((i) => i.seq)).toEqual([2]);
  movement.send = undefined;
  movement.input(1, 0);
  expect(movement.position.x).toBe(1056);
});
it('interpolates remote snapshots 100 ms in the past without extrapolation', () => {
  const samples = [
    { at: 100, x: 0, y: 0 },
    { at: 200, x: 8, y: 0 },
  ];
  expect(movement.interpolate(samples, 250).x).toBe(4);
  expect(movement.interpolate(samples, 500).x).toBe(8);
});
