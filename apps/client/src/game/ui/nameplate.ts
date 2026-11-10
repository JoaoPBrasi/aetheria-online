import Phaser from 'phaser';

type PlateKind = 'player' | 'place' | 'npc' | 'object' | 'enemy';

const palette: Record<
  PlateKind,
  { ink: string; border: number; fill: number }
> = {
  player: { ink: '#fff2ce', border: 0xc1a974, fill: 0x172e29 },
  place: { ink: '#f9e9bb', border: 0xd3b778, fill: 0x19352c },
  npc: { ink: '#ffe4ab', border: 0xd0ae69, fill: 0x26362c },
  object: { ink: '#e5f2d6', border: 0x83ad86, fill: 0x19352c },
  enemy: { ink: '#ffe1c3', border: 0xc77c69, fill: 0x3a2828 },
};

/** A small sign with a shared type hierarchy and contrast over varied terrain. */
export function makeNameplate(
  scene: Phaser.Scene,
  label: string,
  kind: PlateKind,
  x = 0,
  y = 0,
) {
  const style = palette[kind];
  const isPlace = kind === 'place';
  const text = scene.add
    .text(0, -1, label, {
      fontFamily: isPlace
        ? 'Georgia, serif'
        : 'Trebuchet MS, Arial, sans-serif',
      fontSize: isPlace ? '15px' : kind === 'player' ? '12px' : '11px',
      fontStyle: 'bold',
      color: style.ink,
      stroke: '#10231f',
      strokeThickness: isPlace ? 3 : 2,
      align: 'center',
    })
    .setOrigin(0.5)
    .setResolution(2);
  text.setShadow(0, 2, '#06120f', 3, true, true);
  const width = Math.ceil(text.width + (isPlace ? 28 : 18));
  const height = isPlace ? 30 : 23;
  const backing = scene.add.graphics();
  backing
    .fillStyle(0x071712, 0.25)
    .fillRoundedRect(-width / 2 + 1, -height / 2 + 3, width, height, 7);
  backing
    .fillStyle(style.fill, 0.9)
    .fillRoundedRect(-width / 2, -height / 2, width, height, 7);
  backing
    .lineStyle(1, style.border, 0.8)
    .strokeRoundedRect(-width / 2, -height / 2, width, height, 7);
  if (isPlace) {
    backing.fillStyle(style.border, 0.8).fillCircle(-width / 2 + 9, 0, 2);
    backing.fillCircle(width / 2 - 9, 0, 2);
  }
  return scene.add.container(x, y, [backing, text]);
}
