import type { CombatFeedback, Cosmetics } from '@aetheria/shared';

export type Facing = 'down' | 'up' | 'left' | 'right';
export const CLEAVE_CONTACT_MS = 108;
export const CLEAVE_DURATION_MS = 365;
export const THRUST_CONTACT_MS = 74;
export const THRUST_DURATION_MS = 292;
// Segura a silhueta do corte mesmo quando a taxa de quadros cai.
const CLEAVE_FRAMES = [0, 50, 82, CLEAVE_CONTACT_MS, 206, 242, 275, 315];
const THRUST_FRAMES = [0, 25, 49, THRUST_CONTACT_MS, 142, 176, 212, 250];
export const PLAYER_ANIMATIONS = {
  idle: { frames: 4, fps: 5 },
  walk: { frames: 6, fps: 10 },
  collect: { frames: 8, fps: 12 },
  chop: { frames: 8, fps: 12 },
  mine: { frames: 8, fps: 12 },
  water: { frames: 8, fps: 12 },
  hit: { frames: 4, fps: 12 },
  attack: { frames: 5, fps: 18 },
  cleave: { frames: 8, fps: 25 },
  iron_thrust: { frames: 8, fps: 27 },
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
export function isIronThrust(event: CombatFeedback) {
  return (
    event.kind === 'strike' && event.weapon === 'iron_sword' && !event.skillId
  );
}
export function facingForCleave(
  dx: number,
  dy: number,
  fallback: Facing,
): Facing {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return facingFromInput(dx, dy, fallback);
}
export function poseAt(
  state: PlayerAnimation,
  direction: Facing,
  elapsed: number,
  durationMs?: number,
) {
  const { frames, fps } = PLAYER_ANIMATIONS[state];
  let frame: number;
  if (state === 'cleave' || state === 'iron_thrust') {
    const starts = state === 'cleave' ? CLEAVE_FRAMES : THRUST_FRAMES;
    frame = starts.length - 1;
    while (frame > 0 && elapsed < starts[frame]!) frame--;
  } else if (state === 'idle' || state === 'walk') {
    const step = Math.max(0, Math.floor((elapsed * fps) / 1000));
    frame = step % frames;
  } else if (durationMs && durationMs > 0) {
    const progress = Math.max(0, Math.min(0.999, elapsed / durationMs));
    frame = Math.min(frames - 1, Math.floor(progress * frames));
  } else {
    const step = Math.max(0, Math.floor((elapsed * fps) / 1000));
    frame = Math.min(frames - 1, step);
  }
  return {
    key: `${state === 'attack' || state === 'cleave' ? 'chop' : state}-${direction === 'left' || direction === 'right' ? 'side' : direction}-${frame}`,
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
