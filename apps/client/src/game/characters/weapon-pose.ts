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

const carry: Record<Direction, Grip> = {
  down: [26, 39, -141],
  side: [28, 39, 126],
  up: [38, 39, 133],
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
    [27, 38, -145],
    [26, 39, -140],
    [26, 39, -132],
    [26, 39, -140],
    [26, 38, -145],
    [26, 39, -142],
  ],
  side: [
    [28, 37, 116],
    [29, 37, 122],
    [30, 38, 131],
    [29, 39, 136],
    [29, 39, 129],
    [27, 38, 120],
  ],
  up: [
    [36, 39, 133],
    [37, 38, 136],
    [37, 39, 140],
    [38, 39, 133],
    [38, 40, 129],
    [37, 39, 130],
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
          : state === 'idle' || state === 'hit'
            ? carry[direction]
            : undefined;
  if (!grip) return undefined;
  const [x, y, angle] = grip;
  return {
    x: (x - 32) * (flip ? -2 : 2),
    y: (y - 48) * 2,
    angle: flip ? -angle : angle,
    flip,
    behind: direction === 'up',
  };
}
