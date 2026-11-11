import type Phaser from 'phaser';
import type { cropStatus, CropId } from '@aetheria/shared';

export function paintFarmPlot(
  art: Phaser.GameObjects.Graphics,
  state: ReturnType<typeof cropStatus>,
  crop: CropId | null,
) {
  art.clear();
  if (state === 'empty') {
    // Cobre os sulcos do fundo e reaproveita a paleta da terra da horta.
    art.fillStyle(0x77503c).fillRect(-14, -14, 28, 28);
    art.fillStyle(0x533622).fillRect(-9, -5, 6, 4).fillRect(3, 3, 7, 4);
    art.fillStyle(0xa77550).fillRect(-8, -5, 4, 2).fillRect(4, 3, 5, 2);
    return;
  }
  if (state === 'prepared') return;

  if (state === 'thirsty') {
    art.fillStyle(0xc99962).fillRect(-5, -3, 10, 4).fillRect(-3, -6, 6, 3);
    art.fillStyle(0x89cfff).fillRect(7, -10, 2, 3).fillRect(5, -7, 6, 4);
    return;
  }
  art.fillStyle(0x302319, 0.7).fillEllipse(0, 4, 23, 9);
  art.fillStyle(0x3e7939).fillRect(-2, -14, 4, 17);
  art.fillStyle(0x6bad50).fillRect(-9, -13, 8, 5).fillRect(1, -17, 8, 6);
  art.fillStyle(0xa3cd67).fillRect(-9, -13, 5, 2).fillRect(4, -17, 5, 2);
  if (state !== 'ready') return;

  if (crop === 'pumpkin') {
    art.fillStyle(0x55301d).fillRect(-11, -7, 22, 13).fillRect(-8, -10, 16, 18);
    art.fillStyle(0xe9953f).fillRect(-9, -7, 18, 12).fillRect(-6, -9, 12, 16);
    art.fillStyle(0xffbf59).fillRect(-3, -8, 5, 13);
  } else {
    art.fillStyle(0x673b56).fillRect(-8, -8, 16, 10).fillRect(-5, 2, 10, 5);
    art.fillStyle(0xf1d9bb).fillRect(-7, -7, 14, 8).fillRect(-4, 1, 8, 4);
    art.fillStyle(0xc98ca4).fillRect(-7, -7, 14, 3);
    art.fillStyle(0xf1d9bb).fillRect(-2, 5, 3, 4);
  }
  art.fillStyle(0xffde8b).fillRect(10, -16, 2, 6).fillRect(8, -14, 6, 2);
}
