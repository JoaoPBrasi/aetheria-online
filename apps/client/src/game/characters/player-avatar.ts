import Phaser from 'phaser';
import { makeNameplate } from '../ui/nameplate';
import type { Cosmetics } from '@aetheria/shared';
import {
  appearanceLayers,
  PLAYER_LAYERS,
  PLAYER_ANIMATIONS,
  poseAt,
  type Facing,
  type PlayerAnimation,
} from './animation';

/** All layers use the original 64px frame and the same foot pivot, including actions. */
export class PlayerAvatar extends Phaser.GameObjects.Container {
  private layers = new Map<string, Phaser.GameObjects.Sprite>();
  private lookKey = '';
  private frameKey = '';
  private startedAt = 0;
  private movingUntil = 0;
  private action?: { state: PlayerAnimation; until: number; facing?: Facing };
  state: PlayerAnimation = 'idle';
  facing: Facing = 'down';
  constructor(scene: Phaser.Scene, name?: string) {
    super(scene, 1040, 1040);
    this.add(scene.add.ellipse(0, 0, 25, 9, 0x10251e, 0.35));
    for (const layer of PLAYER_LAYERS) {
      const sprite = scene.add
        .sprite(0, 0, 'player-art', `idle-down-0:${layer}`)
        .setScale(2)
        .setOrigin(0.5, 0.75);
      this.add(sprite);
      this.layers.set(layer, sprite);
    }
    if (name) this.add(makeNameplate(scene, name, 'player', 0, -72));
    scene.add.existing(this);
  }
  playGesture(state: PlayerAnimation, time: number, facing?: Facing) {
    const animation = PLAYER_ANIMATIONS[state];
    this.action = {
      state,
      until: time + (animation.frames * 1000) / animation.fps,
      facing,
    };
    this.startedAt = time;
    this.state = state;
    this.frameKey = '';
  }
  updatePose(
    time: number,
    x: number,
    y: number,
    facing: Facing,
    look: Cosmetics,
  ) {
    const distance = Math.hypot(x - this.x, y - this.y);
    if (distance > 0.02 && distance < 80) {
      this.movingUntil = time + 120;
      this.action = undefined;
    }
    this.setPosition(x, y).setDepth(y);
    const state =
      this.action && time < this.action.until
        ? this.action.state
        : time < this.movingUntil
          ? 'walk'
          : 'idle';
    if (this.action && time < this.action.until)
      facing = this.action.facing ?? facing;
    if (state !== this.state || facing !== this.facing) {
      this.startedAt = time;
      this.state = state;
      this.facing = facing;
    }
    const key = [
      look.clothingColor,
      look.hairColor,
      look.skinColor,
      look.hairStyle,
    ].join('|');
    if (key !== this.lookKey) {
      this.lookKey = key;
      for (const sprite of this.layers.values()) sprite.setVisible(false);
      for (const { layer, color } of appearanceLayers(look)) {
        const sprite = this.layers.get(layer)!;
        sprite.setVisible(true);
        if (color) sprite.setTint(parseInt(color.slice(1), 16));
        else sprite.clearTint();
      }
    }
    const pose = poseAt(state, facing, time - this.startedAt),
      frameKey = pose.key + facing;
    if (frameKey !== this.frameKey) {
      for (const [layer, sprite] of this.layers)
        sprite.setFrame(`${pose.key}:${layer}`).setFlipX(pose.flip);
      this.frameKey = frameKey;
    }
    return pose;
  }
}
