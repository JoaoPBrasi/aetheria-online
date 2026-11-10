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
it('restores facing and preserves the last predicted direction through idle inputs', () => {
  const state = new WorldState(),
    player = new PlayerPresence();
  player.direction = 'left';
  state.players.set('self', player);
  movement.reconcile(state, 'self');
  expect(movement.direction).toBe('left');
  movement.send = () => undefined;
  movement.input(0, -1);
  movement.input(0, 0);
  movement.reconcile(state, 'self');
  expect(movement.direction).toBe('up');
});
it('updates the direction and cosmetics of an already visible remote player', () => {
  const state = new WorldState(),
    remote = new PlayerPresence();
  remote.direction = 'right';
  remote.hairStyle = 'long';
  remote.clothingColor = '#578ba7';
  state.players.set('other', remote);
  movement.reconcile(state, 'self');
  expect(movement.remotes.get('other')).toMatchObject({
    direction: 'right',
    hairStyle: 'long',
    clothingColor: '#578ba7',
  });
  remote.direction = 'left';
  remote.clothingColor = '#7d699a';
  movement.reconcile(state, 'self');
  expect(movement.remotes.get('other')).toMatchObject({
    direction: 'left',
    clothingColor: '#7d699a',
  });
});
