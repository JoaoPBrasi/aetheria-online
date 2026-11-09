import Phaser from 'phaser';
import { WorldScene } from './scenes/world-scene';
export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 640,
    backgroundColor: '#142521',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    scene: [WorldScene],
    audio: { noAudio: true },
  });
}
