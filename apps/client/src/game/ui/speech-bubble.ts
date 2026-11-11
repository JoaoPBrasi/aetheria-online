import Phaser from 'phaser';

/**
 * Cria um balão de fala flutuante acoplado ao PlayerAvatar no Phaser.
 * Segue o estilo clássico de MMORPG com cantos arredondados, ponta direcional e fade suave.
 */
export function makeSpeechBubble(
  scene: Phaser.Scene,
  message: string,
  durationMs = 5000,
  onDestroy?: () => void,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  const text = scene.add
    .text(0, 0, message, {
      fontFamily: 'Trebuchet MS, Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#fff5d6',
      stroke: '#0e1715',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: 165, useAdvancedWrap: true },
    })
    .setOrigin(0.5)
    .setResolution(2);

  const paddingX = 14;
  const paddingY = 8;
  const width = Math.max(54, Math.ceil(text.width + paddingX * 2));
  const height = Math.ceil(text.height + paddingY * 2);

  // Posiciona o centro do balão logo acima da placa de identificação (nameplate fica em y = -72)
  const bottomY = -84;
  const centerY = bottomY - height / 2;
  text.setPosition(0, centerY);

  const backing = scene.add.graphics();

  // Sombra translúcida suave
  backing.fillStyle(0x040807, 0.4);
  backing.fillRoundedRect(-width / 2 + 1, centerY - height / 2 + 2, width, height, 8);

  // Fundo escuro temático com alta opacidade
  backing.fillStyle(0x13211d, 0.94);
  backing.fillRoundedRect(-width / 2, centerY - height / 2, width, height, 8);

  // Borda dourada sutil
  backing.lineStyle(1.5, 0xd0b475, 0.9);
  backing.strokeRoundedRect(-width / 2, centerY - height / 2, width, height, 8);

  // Ponta/Triângulo apontando para baixo (direção do avatar)
  backing.fillStyle(0x13211d, 0.94);
  backing.beginPath();
  backing.moveTo(-6, centerY + height / 2 - 1);
  backing.lineTo(6, centerY + height / 2 - 1);
  backing.lineTo(0, centerY + height / 2 + 7);
  backing.closePath();
  backing.fillPath();

  // Traço do contorno da ponta
  backing.lineStyle(1.5, 0xd0b475, 0.9);
  backing.beginPath();
  backing.moveTo(-6, centerY + height / 2);
  backing.lineTo(0, centerY + height / 2 + 7);
  backing.lineTo(6, centerY + height / 2);
  backing.strokePath();

  container.add([backing, text]);
  container.setDepth(6000);

  // Animação de entrada suave
  container.setAlpha(0);
  container.setScale(0.85);

  scene.tweens.add({
    targets: container,
    alpha: 1,
    scale: 1,
    duration: 160,
    ease: 'Back.Out',
  });

  // Temporizador para desvanecimento e destruição
  const fadeOutDelay = Math.max(500, durationMs - 400);
  scene.time.delayedCall(fadeOutDelay, () => {
    if (!container.active) return;
    scene.tweens.add({
      targets: container,
      alpha: 0,
      y: container.y - 10,
      duration: 350,
      ease: 'Quad.In',
      onComplete: () => {
        onDestroy?.();
        container.destroy();
      },
    });
  });

  return container;
}
