import Phaser from 'phaser';
import { gameBridge } from '../managers/game-bridge';
/** Original geometric illustration; the playable Tiled world starts in stage 2. */
export class FoundationScene extends Phaser.Scene {
  constructor() {
    super('foundation');
  }
  create() {
    const g = this.add.graphics();
    g.fillStyle(0x142521);
    g.fillRect(0, 0, 960, 640);
    for (let y = 0; y < 640; y += 32)
      for (let x = 0; x < 960; x += 32) {
        const n = (x * 13 + y * 7) % 11;
        g.fillStyle(n < 4 ? 0x1a3028 : 0x182b25);
        g.fillRect(x, y, 32, 32);
        if (n < 3) {
          g.fillStyle(0x294332);
          g.fillRect(x + 8, y + 12, 3, 5);
        }
      }
    // Winding stone approach to an unfinished Aether gate.
    for (let row = 0; row < 9; row++)
      for (let col = 0; col < 3; col++) {
        const x = 425 + col * 36 + Math.sin(row * 0.6) * 20;
        const y = 355 + row * 34;
        g.fillStyle((row + col) % 2 ? 0x586155 : 0x69705e);
        g.fillRect(Math.round(x), y, 32, 28);
        g.fillStyle(0x81836a);
        g.fillRect(Math.round(x) + 3, y + 2, 24, 3);
      }
    for (let i = 0; i < 20; i++) {
      const x = 35 + ((i * 173) % 900),
        y = 45 + ((i * 97) % 500);
      if (x > 340 && x < 640) continue;
      g.fillStyle(0x10231d);
      g.fillEllipse(x + 10, y + 88, 92, 25);
      g.fillStyle(0x514535);
      g.fillRect(x - 7, y + 28, 15, 60);
      g.fillStyle(0x203e2d);
      g.fillRect(x - 39, y - 4, 78, 54);
      g.fillRect(x - 26, y - 29, 52, 32);
      g.fillStyle(0x315438);
      g.fillRect(x - 33, y - 4, 61, 14);
      g.fillRect(x - 20, y - 29, 33, 9);
    }
    g.fillStyle(0x0c1d19);
    g.fillEllipse(480, 363, 230, 54);
    g.fillStyle(0x3f544b);
    g.fillRect(381, 197, 35, 160);
    g.fillRect(544, 197, 35, 160);
    g.fillRect(404, 162, 152, 36);
    g.fillStyle(0x718173);
    g.fillRect(381, 197, 9, 160);
    g.fillRect(404, 162, 152, 7);
    g.fillRect(544, 197, 8, 160);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x293d33);
      g.fillRect(390, 223 + i * 33, 26, 3);
      g.fillRect(553, 223 + i * 33, 26, 3);
    }
    const portal = this.add.rectangle(480, 273, 126, 149, 0x72d8ba, 0.14);
    this.tweens.add({
      targets: portal,
      alpha: 0.35,
      duration: 2200,
      yoyo: true,
      repeat: -1,
    });
    for (let i = 0; i < 6; i++) {
      const rune = this.add.rectangle(432 + i * 19, 183, 4, 7, 0xc7dc99);
      this.tweens.add({
        targets: rune,
        alpha: 0.3,
        duration: 1200 + i * 100,
        yoyo: true,
        repeat: -1,
      });
    }
    for (let i = 0; i < 14; i++) {
      const mote = this.add.rectangle(
        270 + ((i * 83) % 450),
        160 + ((i * 67) % 300),
        3,
        3,
        0xcfe3a0,
        0.7,
      );
      this.tweens.add({
        targets: mote,
        y: mote.y - 18,
        alpha: 0.1,
        duration: 1800 + i * 111,
        yoyo: true,
        repeat: -1,
      });
    }
    const fpsTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () =>
        gameBridge.update({ fps: Math.round(this.game.loop.actualFps) }),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => fpsTimer.remove());
  }
}
