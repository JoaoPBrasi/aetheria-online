import type Phaser from 'phaser';
import type { CombatFeedback } from '@aetheria/shared';

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
  swing.lineStyle(4, 0xffe0a0, 0.9).beginPath();
  swing
    .arc(event.origin.x, event.origin.y - 19, 28, angle - 0.85, angle + 0.85)
    .strokePath();
  swing.lineStyle(2, 0xffb764, 0.8);
  for (let i = -1; i <= 1; i++) {
    const ray = angle + i * 0.8;
    swing.lineBetween(
      event.x,
      event.y - 12,
      event.x + Math.cos(ray) * 15,
      event.y - 12 + Math.sin(ray) * 15,
    );
  }
  scene.tweens.add({
    targets: swing,
    alpha: 0,
    duration: 165,
    onComplete: () => swing.destroy(),
  });
}
