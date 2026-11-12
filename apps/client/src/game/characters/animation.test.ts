import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_COSMETICS } from '@aetheria/shared';
import {
  appearanceLayers,
  facingFromInput,
  PLAYER_ANIMATIONS,
  PLAYER_LAYERS,
  poseAt,
  THRUST_CONTACT_MS,
  type PlayerAnimation,
} from './animation';
import { weaponGrip } from './weapon-pose';

it('keeps facing at rest and matches authoritative diagonal priority', () => {
  expect(facingFromInput(0, 0, 'left')).toBe('left');
  expect(facingFromInput(1, -1, 'down')).toBe('up');
  expect(poseAt('walk', 'left', 100)).toMatchObject({
    key: 'walk-side-1',
    flip: true,
  });
  expect(poseAt('walk', 'right', 100).flip).toBe(false);
});
it('loops locomotion and holds the last frame of one-shot gestures', () => {
  expect(poseAt('walk', 'up', 600).frame).toBe(0);
  expect(poseAt('collect', 'down', 10000).frame).toBe(7);
  expect(poseAt('idle', 'down', -100).frame).toBe(0);
});
it('keeps skin and clothing independently tinted with every hairstyle', () => {
  const layers = appearanceLayers({ ...DEFAULT_COSMETICS, hairStyle: 'none' });
  expect(layers.map((l) => l.layer)).toEqual(['base', 'skin', 'clothes']);
  expect(layers.find((l) => l.layer === 'skin')?.color).toBe(
    DEFAULT_COSMETICS.skinColor,
  );
  expect(
    appearanceLayers({ ...DEFAULT_COSMETICS, hairStyle: 'long' }).map(
      (l) => l.layer,
    ),
  ).toEqual(['backHair', 'base', 'skin', 'clothes', 'long']);
});
it('starts the iron thrust contact on the extended pose and mirrors the grip', () => {
  expect(poseAt('iron_thrust', 'right', THRUST_CONTACT_MS - 1).frame).toBe(2);
  expect(poseAt('iron_thrust', 'left', THRUST_CONTACT_MS)).toMatchObject({
    key: 'iron_thrust-side-3',
    flip: true,
  });
  const left = weaponGrip('iron_thrust', 'left', 3)!;
  const right = weaponGrip('iron_thrust', 'right', 3)!;
  expect(left).toMatchObject({
    x: -right.x,
    y: right.y,
    angle: -right.angle,
    flip: true,
  });
});
it('exports every animation layer inside the actual PNG bounds without trimming the foot pivot', () => {
  const readAtlas = (name: string) => {
    const atlas = JSON.parse(
      readFileSync(
        new URL(`../../../public/maps/${name}.json`, import.meta.url),
        'utf8',
      ),
    );
    const png = readFileSync(
      new URL(`../../../public/sprites/${name}.png`, import.meta.url),
    );
    expect(atlas.meta.size).toEqual({
      w: png.readUInt32BE(16),
      h: png.readUInt32BE(20),
    });
    return atlas;
  };
  const atlas = readAtlas('player-atlas');
  const combat = readAtlas('player-combat-atlas');
  for (const direction of ['down', 'side', 'up']) {
    for (const weapon of ['sword', 'iron_sword']) {
      expect(atlas.frames[`weapon:${weapon}`]).toBeDefined();
      for (const frame of [3, 4]) {
        expect(
          atlas.frames[`chop-${direction}-${frame}:trail-${weapon}`],
        ).toBeDefined();
      }
    }
  }
  for (const [state, animation] of Object.entries(PLAYER_ANIMATIONS))
    for (const direction of ['down', 'up', 'right'] as const)
      for (let frame = 0; frame < animation.frames; frame++)
        for (const layer of PLAYER_LAYERS) {
          const gesture = state as PlayerAnimation;
          const slash = gesture === 'attack' || gesture === 'cleave';
          const owner = slash || gesture === 'iron_thrust' ? combat : atlas;
          const key = `${slash ? 'chop' : state}-${direction === 'right' ? 'side' : direction}-${frame}:${layer}`;
          const entry = owner.frames[key];
          expect(entry, key).toBeDefined();
          expect(entry.trimmed).toBe(false);
          expect(entry.frame.w).toBe(64);
          expect(entry.frame.h).toBe(64);
          expect(entry.frame.x + 64).toBeLessThanOrEqual(owner.meta.size.w);
          expect(entry.frame.y + 64).toBeLessThanOrEqual(owner.meta.size.h);
        }
});
