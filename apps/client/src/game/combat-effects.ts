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
  const isCrit = !!event.isCrit;

  let textLabel = healing ? `+${event.amount} HP` : `−${event.amount}`;
  if (isCrit && !healing) {
    textLabel = `💥 CRÍTICO! −${event.amount}`;
  }

  const number = scene.add
    .text(event.x, event.y - (event.kind === 'strike' ? 33 : 53), textLabel, {
      fontFamily: 'Trebuchet MS, Arial, sans-serif',
      fontSize: isCrit ? (local ? '26px' : '20px') : local ? '22px' : '18px',
      fontStyle: 'bold',
      color: healing
        ? '#52b788'
        : isCrit
          ? '#ffd166'
          : event.kind === 'hurt'
            ? '#ff9588'
            : '#fff0b8',
      stroke: isCrit ? '#541212' : '#201d17',
      strokeThickness: isCrit ? 5 : 4,
    })
    .setOrigin(0.5)
    .setDepth(5003);

  if (isCrit) {
    number.setScale(1.4);
    scene.tweens.add({
      targets: number,
      scale: 1.0,
      duration: 150,
      ease: 'Back.Out',
    });
    if (local && scene.cameras?.main) {
      scene.cameras.main.shake(120, 0.006);
    }
  }

  scene.tweens.add({
    targets: number,
    y: number.y - (isCrit ? 45 : 35),
    alpha: 0,
    duration: isCrit ? 950 : 750,
    ease: 'Quad.Out',
    onComplete: () => number.destroy(),
  });

  if (event.kind === 'heal' && event.skillId === 'heal') {
    const ring = scene.add
      .ellipse(event.x, event.y, 22, 12)
      .setStrokeStyle(2, 0x8de5a7)
      .setDepth(5002);
    scene.tweens.add({
      targets: ring,
      scale: 2.4,
      alpha: 0,
      duration: 420,
      onComplete: () => ring.destroy(),
    });
  }
  if (event.kind !== 'strike') return;

  const angle = Math.atan2(event.y - event.origin.y, event.x - event.origin.x);
  const swing = scene.add.graphics().setDepth(5002);

  if (event.skillId === 'magic_dart') {
    const dart = scene.add
      .rectangle(event.origin.x, event.origin.y - 14, 13, 4, 0x9eefff)
      .setRotation(angle)
      .setDepth(5002);
    scene.tweens.add({
      targets: dart,
      x: event.x,
      y: event.y - 14,
      duration: 150,
      onComplete: () => {
        dart.destroy();
        const flash = scene.add
          .circle(event.x, event.y - 14, 6, 0x6cdfff)
          .setDepth(5002);
        scene.tweens.add({
          targets: flash,
          scale: 2,
          alpha: 0,
          duration: 180,
          onComplete: () => flash.destroy(),
        });
      },
    });
  } else if (event.skillId === 'charge' && event.dashFrom) {
    swing.lineStyle(7, 0xedbc77, 0.65);
    swing.lineBetween(
      event.dashFrom.x,
      event.dashFrom.y - 13,
      event.origin.x,
      event.origin.y - 13,
    );
    swing.lineStyle(2, 0xffe3a1, 0.9);
    swing.lineBetween(
      event.dashFrom.x,
      event.dashFrom.y - 16,
      event.origin.x,
      event.origin.y - 16,
    );
  } else if (event.skillId === 'cleave') {
    // Golpe Fendido: arco duplo incandescente
    swing.lineStyle(8, 0xff9f1c, 0.95).beginPath();
    swing
      .arc(event.origin.x, event.origin.y - 19, 44, angle - 1.1, angle + 1.1)
      .strokePath();
    swing.lineStyle(4, 0xffd166, 0.9);
    for (let i = -2; i <= 2; i++) {
      const ray = angle + i * 0.5;
      swing.lineBetween(
        event.x,
        event.y - 12,
        event.x + Math.cos(ray) * 28,
        event.y - 12 + Math.sin(ray) * 28,
      );
    }
  } else {
    // Golpe comum ou investida
    swing.lineStyle(6, isCrit ? 0xffd166 : 0xffe6a8, 0.95).beginPath();
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
  }

  scene.tweens.add({
    targets: swing,
    alpha: 0,
    duration: 220,
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
