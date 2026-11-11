import type { ItemId } from '@aetheria/shared';
import farm from '../../../../../art/sprites/farm.png';
import resources from '../../../../../art/sprites/resources.png';
import vegetation from '../../../../../art/sprites/vegetation.png';
import weapons from '../../../../../art/sprites/wood-weapons.png';

const atlases = {
  farm: { url: farm, width: 400, height: 400 },
  resources: { url: resources, width: 400, height: 400 },
  vegetation: { url: vegetation, width: 400, height: 432 },
  weapons: { url: weapons, width: 192, height: 112 },
};
type Frame = [
  atlas: keyof typeof atlases,
  x: number,
  y: number,
  width: number,
  height: number,
];

const frames: Partial<Record<ItemId, Frame>> = {
  sword: ['weapons', 0, 0, 16, 34],
  iron_sword: ['weapons', 0, 0, 16, 34],
  axe: ['weapons', 48, 16, 16, 32],
  iron_axe: ['weapons', 48, 16, 16, 32],
  turnip_seed: ['farm', 0, 32, 16, 16],
  pumpkin_seed: ['farm', 0, 0, 16, 16],
  turnip: ['farm', 80, 48, 16, 16],
  pumpkin: ['farm', 112, 16, 16, 16],
  roasted_turnip: ['farm', 80, 48, 16, 16],
  fiber: ['farm', 144, 16, 16, 16],
  flower: ['vegetation', 192, 160, 16, 32],
  plank: ['resources', 32, 64, 32, 16],
};

const drawnIcons = new Set<ItemId>(['pickaxe', 'hoe', 'sickle', 'wood', 'iron_ingot', 'watering_can', 'slime_goo']);

export function ItemIcon({ item }: { item: ItemId }) {
  const frame = frames[item];
  const className = `item-art item-art--${item}`;
  if (frame) {
    const [key, x, y, width, height] = frame;
    const atlas = atlases[key];
    const scale = Math.max(width, height) <= 16 ? 2 : 1;
    return (
      <span
        className={className}
        aria-hidden="true"
        style={{
          width: width * scale,
          height: height * scale,
          backgroundImage: `url("${atlas.url}")`,
          backgroundPosition: `${-x * scale}px ${-y * scale}px`,
          backgroundSize: `${atlas.width * scale}px ${atlas.height * scale}px`,
        }}
      />
    );
  }
  if (drawnIcons.has(item))
    return <span className={className} aria-hidden="true" />;
  return (
    <img
      className={className}
      src={
        item === 'charcoal'
          ? '/sprites/resource-wood-log.png'
          : '/sprites/resource-rock.png'
      }
      alt=""
      draggable={false}
    />
  );
}

export function MetalCorners() {
  return (
    <span className="metal-corners" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
