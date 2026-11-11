import type Phaser from 'phaser';
import type { CombatFeedback } from '@aetheria/shared';

export type ToolEffectKind =
  | 'axe'
  | 'pickaxe'
  | 'sickle'
  | 'hoe'
  | 'water'
  | 'craft'
  | 'sword'
  | 'collect';

export function showCombatEffect(
  scene: Phaser.Scene,
  event: CombatFeedback,
  local: boolean,
) {
  const healing = event.kind === 'heal';
  const number = scene.add
    .text(
      event.x,
      event.y - (event.kind === 'strike' ? 33 : 53),
      healing ? `+${event.amount}` : `−${event.amount}`,
      {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: local ? '22px' : '18px',
        fontStyle: 'bold',
        color: healing
          ? '#a8ef8b'
          : event.kind === 'hurt'
            ? '#ff9588'
            : '#fff0b8',
        stroke: '#201d17',
        strokeThickness: 4,
      },
    )
    .setOrigin(0.5)
    .setDepth(5003);
  scene.tweens.add({
    targets: number,
    y: number.y - 35,
    alpha: 0,
    duration: 750,
    ease: 'Quad.Out',
    onComplete: () => number.destroy(),
  });
  if (event.kind !== 'strike') return;

  const angle = Math.atan2(event.y - event.origin.y, event.x - event.origin.x);
  const swing = scene.add.graphics().setDepth(5002);
  // Arco ampliado e mais impactante da lâmina
  swing.lineStyle(6, 0xffe6a8, 0.95).beginPath();
  swing
    .arc(event.origin.x, event.origin.y - 19, 38, angle - 0.9, angle + 0.9)
    .strokePath();
  swing.lineStyle(3, 0xffb764, 0.85);
  for (let i = -1; i <= 1; i++) {
    const ray = angle + i * 0.75;
    swing.lineBetween(
      event.x,
      event.y - 12,
      event.x + Math.cos(ray) * 22,
      event.y - 12 + Math.sin(ray) * 22,
    );
  }
  scene.tweens.add({
    targets: swing,
    alpha: 0,
    duration: 200,
    onComplete: () => swing.destroy(),
  });
}

export function showToolEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tool: ToolEffectKind,
  facing: string = 'down',
) {
  const angle =
    facing === 'up'
      ? -Math.PI / 2
      : facing === 'left'
        ? Math.PI
        : facing === 'right'
          ? 0
          : Math.PI / 2;

  const targetX = x + Math.cos(angle) * 26;
  const targetY = y - 10 + Math.sin(angle) * 22;

  const fx = scene.add.graphics().setDepth(y + 20);

  if (tool === 'axe') {
    // Corte amplo de machado com lascas de madeira
    fx.lineStyle(5, 0xe4eff0, 0.9).beginPath();
    fx.arc(x, y - 14, 36, angle - 0.85, angle + 0.85).strokePath();
    fx.fillStyle(0xb5804c, 0.9);
    for (let i = 0; i < 4; i++) {
      const spread = angle + (i - 1.5) * 0.45;
      fx.fillCircle(
        targetX + Math.cos(spread) * 14,
        targetY + Math.sin(spread) * 14,
        3.5,
      );
    }
  } else if (tool === 'pickaxe') {
    // Impacto de picareta com faíscas minerais douradas
    fx.lineStyle(5, 0xaed3e8, 0.95).beginPath();
    fx.arc(x, y - 14, 36, angle - 0.7, angle + 0.7).strokePath();
    fx.lineStyle(3, 0xffd000, 0.9);
    for (let i = 0; i < 4; i++) {
      const ray = angle + (i - 1.5) * 0.55;
      fx.lineBetween(
        targetX,
        targetY,
        targetX + Math.cos(ray) * 18,
        targetY + Math.sin(ray) * 18,
      );
    }
  } else if (tool === 'hoe') {
    // Enxada lavrando terra com partículas terrosas
    fx.lineStyle(5, 0x8b5e3c, 0.9).beginPath();
    fx.arc(x, y - 10, 32, angle - 0.6, angle + 0.6).strokePath();
    fx.fillStyle(0x613f23, 0.85);
    for (let i = 0; i < 5; i++) {
      fx.fillCircle(
        targetX + (Math.random() - 0.5) * 18,
        targetY + (Math.random() - 0.5) * 14,
        3,
      );
    }
  } else if (tool === 'water') {
    // Regador borrifando gotas d'água azuis
    fx.fillStyle(0x48cae4, 0.9);
    for (let i = 0; i < 6; i++) {
      const dist = 12 + i * 5;
      const spread = angle + (Math.random() - 0.5) * 0.6;
      fx.fillCircle(
        x + Math.cos(spread) * dist,
        y - 12 + Math.sin(spread) * dist,
        3,
      );
    }
  } else if (tool === 'sickle') {
    // Foice com corte veloz e folhas verdes
    fx.lineStyle(4, 0xd0e8d0, 0.9).beginPath();
    fx.arc(x, y - 14, 34, angle - 0.9, angle + 0.9).strokePath();
    fx.fillStyle(0x52b788, 0.85);
    for (let i = 0; i < 3; i++) {
      fx.fillCircle(
        targetX + (Math.random() - 0.5) * 16,
        targetY + (Math.random() - 0.5) * 12,
        2.5,
      );
    }
  } else if (tool === 'craft') {
    // Forja e carpintaria com faíscas brilhantes de metalurgia
    fx.fillStyle(0xffd166, 0.95);
    for (let i = 0; i < 6; i++) {
      const upRay = -Math.PI / 2 + (i - 2.5) * 0.4;
      fx.fillCircle(
        targetX + Math.cos(upRay) * 18,
        targetY + Math.sin(upRay) * 18,
        3,
      );
    }
  } else {
    // Coleta genérica
    fx.fillStyle(0xfaecc1, 0.8);
    fx.fillCircle(targetX, targetY, 4);
  }

  scene.tweens.add({
    targets: fx,
    alpha: 0,
    duration: 220,
    ease: 'Cubic.Out',
    onComplete: () => fx.destroy(),
  });
}
