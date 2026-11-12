import type { Facing, PlayerAnimation } from './animation';

type Grip = readonly [x: number, y: number, angle: number];
type Direction = 'down' | 'side' | 'up';

// Coordenadas da mão no quadro original de 64px. Zero aponta a lâmina para cima.
const cut: Record<Direction, readonly Grip[]> = {
  down: [
    [26, 18, 0],
    [27, 17, 0],
    [28, 16, 0],
    [31, 40, 162],
    [33, 44, 172],
    [33, 44, 180],
    [24, 32, 195],
    [25, 23, -15],
  ],
  side: [
    [16, 29, -22],
    [15, 28, -25],
    [15, 27, -27],
    [47, 35, 97],
    [46, 36, 100],
    [44, 37, 97],
    [41, 40, 119],
    [37, 40, 117],
  ],
  up: [
    [33, 42, 165],
    [33, 42, 170],
    [33, 42, 175],
    [31, 35, 63],
    [30, 23, -11],
    [34, 27, -16],
    [37, 32, 13],
    [38, 34, 13],
  ],
};

const idleGrip: Record<Direction, readonly Grip[]> = {
  down: [
    [26, 40, -141],
    [26, 40, -141],
    [26, 41, -141],
    [26, 40, -141],
  ],
  side: [
    [27, 40, -153],
    [27, 40, -153],
    [27, 41, -153],
    [27, 40, -153],
  ],
  up: [
    [38, 40, 133],
    [38, 40, 133],
    [38, 41, 133],
    [38, 40, 133],
  ],
};

const hitGrip: Record<Direction, readonly Grip[]> = {
  down: [
    [26, 40, -141],
    [31, 35, -125],
    [28, 34, -127],
    [27, 37, -141],
  ],
  side: [
    [27, 40, -153],
    [22, 39, -140],
    [23, 39, -145],
    [27, 40, -153],
  ],
  up: [
    [38, 40, 133],
    [39, 36, 116],
    [39, 37, 120],
    [38, 38, 130],
  ],
};

const thrust: Record<Direction, readonly Grip[]> = {
  down: [
    [22, 31, 160],
    [22, 30, 170],
    [22, 29, 173],
    [29, 42, 180],
    [28, 40, 180],
    [27, 37, 188],
    [23, 35, 192],
    [22, 32, 185],
  ],
  side: [
    [34, 34, 104],
    [34, 34, 99],
    [33, 34, 96],
    [47, 39, 90],
    [44, 38, 90],
    [39, 38, 95],
    [36, 37, 112],
    [33, 37, 120],
  ],
  up: [
    [36, 36, 15],
    [35, 37, 10],
    [35, 38, 4],
    [32, 24, 0],
    [32, 25, 0],
    [32, 26, 4],
    [35, 30, 12],
    [37, 35, 16],
  ],
};

const steps: Record<Direction, readonly Grip[]> = {
  down: [
    [27, 39, -145],
    [26, 40, -140],
    [26, 39, -134],
    [27, 40, -140],
    [26, 40, -145],
    [26, 39, -142],
  ],
  side: [
    [27, 40, -146],
    [29, 40, -150],
    [30, 38, -156],
    [29, 40, -160],
    [27, 40, -155],
    [26, 39, -149],
  ],
  up: [
    [38, 41, 133],
    [37, 40, 136],
    [38, 39, 140],
    [37, 38, 133],
    [38, 40, 129],
    [38, 40, 130],
  ],
};

export function weaponGrip(
  state: PlayerAnimation,
  facing: Facing,
  frame: number,
) {
  const flip = facing === 'left';
  const direction = flip || facing === 'right' ? 'side' : facing;
  const grip =
    state === 'iron_thrust'
      ? thrust[direction][frame]
      : state === 'attack' || state === 'cleave'
        ? cut[direction][frame]
        : state === 'walk'
          ? steps[direction][frame]
          : state === 'idle'
            ? idleGrip[direction][frame]
            : state === 'hit'
              ? hitGrip[direction][frame]
              : undefined;
  if (!grip) return undefined;
  const [x, y, angle] = grip;
  return {
    x: (x - 32) * (flip ? -2 : 2),
    y: (y - 48) * 2,
    angle: flip ? -angle : angle,
    flip,
    // A mão deve aparecer sobre o cabo quando o personagem carrega a espada.
    behind:
      direction === 'up' ||
      state === 'idle' ||
      state === 'walk' ||
      state === 'hit',
  };
}
