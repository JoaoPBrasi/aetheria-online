import Phaser from 'phaser';
import { makeNameplate } from '../ui/nameplate';
import { makeSpeechBubble } from '../ui/speech-bubble';
import type { Cosmetics, WeaponId } from '@aetheria/shared';
import { weaponGrip } from './weapon-pose';
import {
  appearanceLayers,
  PLAYER_LAYERS,
  PLAYER_ANIMATIONS,
  CLEAVE_DURATION_MS,
  THRUST_DURATION_MS,
  poseAt,
  type Facing,
  type PlayerAnimation,
} from './animation';

/** All layers use the original 64px frame and the same foot pivot, including actions. */
export class PlayerAvatar extends Phaser.GameObjects.Container {
  private layers = new Map<string, Phaser.GameObjects.Sprite>();
  private weapon: Phaser.GameObjects.Sprite;
  private trail: Phaser.GameObjects.Sprite;
  private lookKey = '';
  private frameKey = '';
  private startedAt = 0;
  private movingUntil = 0;
  private currentSpeechBubble?: Phaser.GameObjects.Container;
  private action?: {
    state: PlayerAnimation;
    until: number;
    facing?: Facing;
    durationMs?: number;
    weapon?: WeaponId | null;
  };
  state: PlayerAnimation = 'idle';
  facing: Facing = 'down';
  constructor(scene: Phaser.Scene, name?: string) {
    super(scene, 1040, 1040);
    this.add(scene.add.ellipse(0, 0, 25, 9, 0x10251e, 0.35));
    this.weapon = scene.add
      .sprite(0, 0, 'player-art', 'weapon:sword')
      .setScale(2)
      .setOrigin(0.5, 0.75)
      .setVisible(false);
    this.add(this.weapon);
    for (const layer of PLAYER_LAYERS) {
      const sprite = scene.add
        .sprite(0, 0, 'player-art', `idle-down-0:${layer}`)
        .setScale(2)
        .setOrigin(0.5, 0.75);
      this.add(sprite);
      this.layers.set(layer, sprite);
    }
    this.trail = scene.add
      .sprite(0, 0, 'player-art', 'chop-side-3:trail-iron_sword')
      .setScale(2)
      .setOrigin(0.5, 0.75)
      .setVisible(false);
    this.add(this.trail);
    if (name) this.add(makeNameplate(scene, name, 'player', 0, -72));
    scene.add.existing(this);
  }
  playGesture(
    state: PlayerAnimation,
    time: number,
    facing?: Facing,
    durationMs?: number,
    weapon?: WeaponId | null,
  ) {
    if (
      state === 'hit' &&
      (this.action?.state === 'cleave' ||
        this.action?.state === 'iron_thrust') &&
      time < this.action.until
    )
      return;
    const animation = PLAYER_ANIMATIONS[state];
    const dur =
      state === 'cleave'
        ? CLEAVE_DURATION_MS
        : state === 'iron_thrust'
          ? THRUST_DURATION_MS
          : (durationMs ?? (animation.frames * 1000) / animation.fps);
    this.action = {
      state,
      until: time + dur,
      facing,
      durationMs: dur,
      weapon,
    };
    this.startedAt = time;
    this.state = state;
    this.frameKey = '';
  }
  showSpeechBubble(message: string, durationMs = 5000) {
    if (this.currentSpeechBubble) {
      this.currentSpeechBubble.destroy();
      this.currentSpeechBubble = undefined;
    }
    const bubble = makeSpeechBubble(this.scene, message, durationMs, () => {
      if (this.currentSpeechBubble === bubble) {
        this.currentSpeechBubble = undefined;
      }
    });
    this.add(bubble);
    this.currentSpeechBubble = bubble;
  }
  updatePose(
    time: number,
    x: number,
    y: number,
    facing: Facing,
    look: Cosmetics,
    equipped?: WeaponId,
  ) {
    const distance = Math.hypot(x - this.x, y - this.y);
    if (distance > 0.02 && distance < 80) {
      this.movingUntil = time + 120;
      if (
        this.action?.state !== 'cleave' &&
        this.action?.state !== 'iron_thrust'
      )
        this.action = undefined;
    }
    this.setPosition(x, y).setDepth(y);
    const action =
      this.action && time < this.action.until ? this.action : undefined;
    if (!action) this.action = undefined;
    const state = action
      ? action.state
      : time < this.movingUntil
        ? 'walk'
        : 'idle';
    if (action) facing = action.facing ?? facing;
    if (state !== this.state || facing !== this.facing) {
      if (!action) this.startedAt = time;
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
    const pose = poseAt(
        state,
        facing,
        time - this.startedAt,
        action?.durationMs,
      ),
      melee =
        state === 'cleave' || state === 'attack' || state === 'iron_thrust',
      weapon = melee && action?.weapon !== undefined ? action.weapon : equipped,
      frameKey = `${state}:${pose.key}:${facing}:${weapon ?? ''}`;
    if (frameKey !== this.frameKey) {
      for (const [layer, sprite] of this.layers) {
        sprite
          .setTexture(
            melee ? 'player-combat-art' : 'player-art',
            `${pose.key}:${layer}`,
          )
          .setFlipX(pose.flip);
      }
      const grip = weapon && weaponGrip(state, facing, pose.frame);
      this.weapon.setVisible(!!grip);
      if (grip && weapon) {
        this.weapon
          .setFrame(`weapon:${weapon}`)
          .setFlipX(grip.flip)
          .setPosition(grip.x, grip.y)
          .setAngle(grip.angle);
        this.moveTo(this.weapon, grip.behind ? 1 : this.layers.size + 2);
      }
      const trail =
        !!weapon &&
        (state === 'attack' || state === 'cleave') &&
        (pose.frame === 3 || (state === 'cleave' && pose.frame === 4));
      this.trail.setVisible(trail);
      if (trail)
        this.trail.setFrame(`${pose.key}:trail-${weapon}`).setFlipX(pose.flip);
      this.frameKey = frameKey;
    }
    return pose;
  }
}
