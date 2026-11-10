import type { Cosmetics } from '@aetheria/shared';

export type Facing = 'down' | 'up' | 'left' | 'right';
export const PLAYER_ANIMATIONS = {
  idle: { frames: 4, fps: 5 },
  walk: { frames: 6, fps: 10 },
  collect: { frames: 8, fps: 12 },
  chop: { frames: 8, fps: 12 },
  mine: { frames: 8, fps: 12 },
  water: { frames: 8, fps: 12 },
  hit: { frames: 4, fps: 12 },
} as const;
export type PlayerAnimation = keyof typeof PLAYER_ANIMATIONS;
export const PLAYER_LAYERS = [
  'backHair',
  'base',
  'skin',
  'clothes',
  'short',
  'long',
  'bun',
] as const;
export function facingFromInput(
  dx: number,
  dy: number,
  previous: Facing,
): Facing {
  return dy < 0
    ? 'up'
    : dy > 0
      ? 'down'
      : dx < 0
        ? 'left'
        : dx > 0
          ? 'right'
          : previous;
}
export function validFacing(value: string): Facing {
  return ['up', 'left', 'right'].includes(value) ? (value as Facing) : 'down';
}
export function poseAt(
  state: PlayerAnimation,
  direction: Facing,
  elapsed: number,
) {
  const { frames, fps } = PLAYER_ANIMATIONS[state];
  const step = Math.max(0, Math.floor((elapsed * fps) / 1000));
  const frame =
    state === 'idle' || state === 'walk'
      ? step % frames
      : Math.min(frames - 1, step);
  return {
    key: `${state}-${direction === 'left' || direction === 'right' ? 'side' : direction}-${frame}`,
    flip: direction === 'left',
    frame,
  };
}
export function appearanceLayers(look: Cosmetics) {
  return [
    ...(look.hairStyle === 'long'
      ? [{ layer: 'backHair', color: look.hairColor }]
      : []),
    { layer: 'base', color: undefined },
    { layer: 'skin', color: look.skinColor },
    { layer: 'clothes', color: look.clothingColor },
    ...(look.hairStyle !== 'none'
      ? [{ layer: look.hairStyle, color: look.hairColor }]
      : []),
  ];
}
