import Phaser from 'phaser';
import {
  landmarks,
  MAP_SIZE,
  TILE_SIZE,
  WORLD_SPAWN,
  WORLD_ART_REVISION,
  WORLD_REGIONS,
  RESOURCES,
  FARM_PLOTS,
  CRAFTING_STATIONS,
  cropStatus,
  interaction,
  MONSTERS,
  NPCS,
  type WorldArtwork,
} from '@aetheria/shared';
import { gameBridge } from '../managers/game-bridge';
import { movement } from '../networking/movement';
import { PlayerAvatar } from '../characters/player-avatar';
import type { Cosmetics } from '@aetheria/shared';

export class WorldScene extends Phaser.Scene {
  private avatar!: PlayerAvatar;
  private pressed = new Set<string>();
  private active = false;
  private focusRing!: Phaser.GameObjects.Graphics;
  private walking = false;
  private lastHealth = 100;
  private plots = new Map<string, Phaser.GameObjects.Rectangle>();
  private accumulator = 0;
  private remoteSprites = new Map<string, PlayerAvatar>();
  private monsterSprites = new Map<
    string,
    {
      container: Phaser.GameObjects.Container;
      body: Phaser.GameObjects.Ellipse | Phaser.GameObjects.Sprite;
      hpFill: Phaser.GameObjects.Rectangle;
      barWidth: number;
    }
  >();
  constructor() {
    super('world');
  }
  preload() {
    this.load.atlas(
      'player-art',
      '/sprites/player-atlas.png',
      '/maps/player-atlas.json',
    );
    this.load.image('world-ground', '/sprites/brumavale-ground.png');
    this.load.atlas(
      'world-props',
      '/sprites/brumavale-props.png',
      '/maps/brumavale-props.json',
    );
    this.load.json('world-art', '/maps/brumavale-art.json');
    this.load.spritesheet('npc-wizard', '/sprites/npc-wizard-idle.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('bonfire', '/sprites/bonfire-idle.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image('station-workbench', '/sprites/station-workbench.png');
    this.load.image('station-anvil', '/sprites/station-anvil.png');
    this.load.image('furnace-stone', '/sprites/furnace-stone.png');
    this.load.image('resource-wood-log', '/sprites/resource-wood-log.png');
    this.load.image('resource-rock', '/sprites/resource-rock.png');
    this.load.image('resource-bush', '/sprites/resource-bush.png');
    this.load.image('farm-plot-tilled', '/sprites/farm-plot-tilled.png');
  }
  create() {
    this.focusRing = this.add.graphics().setDepth(5001);

    const artwork = this.cache.json.get('world-art') as WorldArtwork;
    if (
      artwork.revision !== WORLD_ART_REVISION ||
      artwork.width !== MAP_SIZE * TILE_SIZE ||
      artwork.height !== MAP_SIZE * TILE_SIZE
    )
      throw new Error('O mapa visual precisa ser gerado novamente.');
    this.game.canvas.dataset.worldWidth = String(artwork.width);
    this.game.canvas.dataset.worldHeight = String(artwork.height);
    this.add.image(0, 0, 'world-ground').setOrigin(0).setDepth(-1);
    for (const p of artwork.props)
      this.add
        .image(p.x, p.y, 'world-props', p.frame)
        .setOrigin(0)
        .setDepth(p.depth);
    for (const kind of ['orc', 'skeleton'])
      if (!this.anims.exists(`${kind}-idle`))
        this.anims.create({
          key: `${kind}-idle`,
          frames: Array.from({ length: 4 }, (_, i) => ({
            key: 'world-props',
            frame: `${kind}-idle-${i}`,
          })),
          frameRate: 5,
          repeat: -1,
        });

    if (!this.anims.exists('npc-wizard-idle')) {
      this.anims.create({
        key: 'npc-wizard-idle',
        frames: this.anims.generateFrameNumbers('npc-wizard', {
          start: 0,
          end: 3,
        }),
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!this.anims.exists('bonfire-burn')) {
      this.anims.create({
        key: 'bonfire-burn',
        frames: this.anims.generateFrameNumbers('bonfire', {
          start: 0,
          end: 3,
        }),
        frameRate: 6,
        repeat: -1,
      });
    }

    // Fogueira animada no centro da vila (lado oeste da praça)
    this.add.ellipse(990, 1042, 28, 12, 0x132b24, 0.4).setDepth(1031);
    const bonfire = this.add
      .sprite(990, 1032, 'bonfire')
      .setScale(1.2)
      .setDepth(1032);
    bonfire.play('bonfire-burn');

    for (const plot of FARM_PLOTS) {
      const px = plot.tileX * 32 + 16;
      const py = plot.tileY * 32 + 16;
      this.add.image(px, py, 'farm-plot-tilled').setDepth(0.5);
      const shape = this.add
        .rectangle(px, py, 28, 28, 0x775037, 0.45)
        .setStrokeStyle(2, 0xc2ad79)
        .setDepth(1);
      this.plots.set(plot.id, shape);
      shape
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => gameBridge.interact?.(plot.id));
    }
    const minPlotX = Math.min(...FARM_PLOTS.map((p) => p.tileX * 32 + 16));
    const maxPlotX = Math.max(...FARM_PLOTS.map((p) => p.tileX * 32 + 16));
    const minPlotY = Math.min(...FARM_PLOTS.map((p) => p.tileY * 32 + 16));
    const maxPlotY = Math.max(...FARM_PLOTS.map((p) => p.tileY * 32 + 16));
    for (let fx = minPlotX - 16; fx <= maxPlotX + 16; fx += 32) {
      if (fx < minPlotX + 48 || fx > minPlotX + 112)
        this.add
          .image(fx, minPlotY - 24, 'world-props', 'fence:white')
          .setDepth(minPlotY - 24);
      this.add
        .image(fx, maxPlotY + 24, 'world-props', 'fence:white')
        .setDepth(maxPlotY + 24);
    }
    for (const node of RESOURCES) {
      const isWood = node.item === 'wood';
      const isStone = node.item === 'stone';
      const spriteKey = isWood
        ? 'resource-wood-log'
        : isStone
          ? 'resource-rock'
          : 'resource-bush';

      this.add
        .ellipse(
          node.x,
          node.y + (isWood ? 6 : isStone ? 8 : 10),
          isWood ? 28 : isStone ? 26 : 24,
          10,
          0x132b24,
          0.35,
        )
        .setDepth(node.y - 1);

      this.add
        .image(node.x, node.y, spriteKey)
        .setDepth(node.y)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => gameBridge.interact?.(node.id));

      this.add
        .text(node.x, node.y - 25, node.name, {
          fontSize: '10px',
          color: '#f6e7bc',
          backgroundColor: '#21372b',
        })
        .setOrigin(0.5)
        .setDepth(node.y + 1);
    }
    for (const station of CRAFTING_STATIONS) {
      const isForge = station.type === 'forge';
      const textureKey = isForge ? 'station-anvil' : 'station-workbench';
      this.add
        .ellipse(
          station.x,
          station.y + 12,
          isForge ? 46 : 42,
          14,
          0x132b24,
          0.35,
        )
        .setDepth(station.y - 1);
      this.add
        .image(station.x, station.y, textureKey)
        .setDepth(station.y)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => gameBridge.interact?.(station.id));

      if (isForge) {
        this.add
          .ellipse(station.x + 32, station.y + 14, 30, 12, 0x132b24, 0.35)
          .setDepth(station.y - 1);
        this.add
          .image(station.x + 32, station.y - 6, 'furnace-stone')
          .setDepth(station.y);
      }

      this.add
        .text(
          station.x,
          station.y - 25,
          isForge ? '🔨 ' + station.name : '🪵 ' + station.name,
          {
            fontSize: '10px',
            color: '#f6e7bc',
            backgroundColor: '#21372b',
            padding: { x: 4, y: 2 },
          },
        )
        .setOrigin(0.5)
        .setDepth(station.y + 1);
    }
    for (const npc of NPCS) {
      const shadow = this.add.ellipse(0, 4, 25, 10, 0x132b24, 0.4);
      const sprite = this.add.sprite(0, -10, 'npc-wizard').setScale(1.1);
      sprite.play('npc-wizard-idle');
      const label = this.add
        .text(0, -38, `✦ ${npc.name}`, {
          fontSize: '11px',
          color: '#f7df94',
          backgroundColor: '#1b2621',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5);
      const title = this.add
        .text(0, -52, npc.title, {
          fontSize: '9px',
          color: '#a3bfab',
        })
        .setOrigin(0.5);

      const npcContainer = this.add.container(npc.x, npc.y, [
        shadow,
        sprite,
        label,
        title,
      ]);
      npcContainer.setSize(32, 48);
      npcContainer.setDepth(npc.y);
      npcContainer
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => gameBridge.interact?.(npc.id));
    }
    for (const b of landmarks)
      this.label(
        b.name,
        (b.x + b.w / 2) * TILE_SIZE,
        (b.y + b.h) * TILE_SIZE + 24,
      );
    this.label('BRUMAVALE · PRAÇA', 1040, 910);
    this.label('LAGO DOS JUNCOS', 1600, 250);
    this.label('FAZENDA', 440, 1100);
    this.label('BOSQUE ANTIGO', 370, 300);
    this.label('PEDREIRA', 1670, 1240);
    for (const r of WORLD_REGIONS.filter((r) => r.danger !== 'safe'))
      this.label(
        r.name.toUpperCase(),
        (r.x + r.w / 2) * TILE_SIZE,
        r.y * TILE_SIZE - 24,
      );
    this.label('CAMPOS DO SUL ↓', 1040, 2030);
    this.label('ORCS →', 2260, 1040);
    this.avatar = new PlayerAvatar(this);
    gameBridge.animateCharacter = (action) => {
      const kind = action.kind;
      const resource = RESOURCES.find((r) => r.id === action.node);
      this.avatar.playGesture(
        kind === 'water'
          ? 'water'
          : kind === 'gather' && resource?.item === 'wood'
            ? 'chop'
            : kind === 'gather' && resource?.item === 'stone'
              ? 'mine'
              : 'collect',
        this.time.now,
      );
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameBridge.animateCharacter = undefined;
    });
    this.avatar.setVisible(false);
    this.cameras.main.setBounds(
      0,
      0,
      MAP_SIZE * TILE_SIZE,
      MAP_SIZE * TILE_SIZE,
    );
    this.cameras.main.startFollow(this.avatar, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);
    const resize = (size: Phaser.Structs.Size) =>
      this.cameras.main.setViewport(0, 0, size.width, size.height);
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, resize),
    );
    this.input.keyboard!.enabled = false;
    this.input.keyboard!.clearCaptures();
    const editable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      !!target.closest('input,textarea,select,[contenteditable=true]');
    const keydown = (event: KeyboardEvent) => {
      if (!this.active || editable(event.target)) return;
      const key = event.key.toLowerCase().replace('arrow', '');
      if (['w', 'a', 's', 'd', 'up', 'down', 'left', 'right'].includes(key)) {
        this.pressed.add(key);
        if (event.key.startsWith('Arrow')) event.preventDefault();
      }
    };
    const keyup = (event: KeyboardEvent) =>
      this.pressed.delete(event.key.toLowerCase().replace('arrow', ''));
    const focus = (event: FocusEvent) => {
      if (editable(event.target)) this.pressed.clear();
    };
    const blur = () => this.pressed.clear();
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('keyup', keyup, true);
    window.addEventListener('focusin', focus);
    window.addEventListener('blur', blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('keyup', keyup, true);
      window.removeEventListener('focusin', focus);
      window.removeEventListener('blur', blur);
    });
    const unsubscribe = gameBridge.subscribe(() => {
      const next = gameBridge.getSnapshot().status === 'connected';
      if (next && !this.active)
        this.avatar.setPosition(WORLD_SPAWN.x, WORLD_SPAWN.y);
      this.active = next;
      this.avatar.setVisible(next);
    });
    this.active = gameBridge.getSnapshot().status === 'connected';
    this.avatar.setVisible(this.active);
    const timer = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        gameBridge.update({
          fps: Math.round(this.game.loop.actualFps),
          worldTime: Date.now(),
          position: {
            x: Math.round(this.avatar.x),
            y: Math.round(this.avatar.y),
          },
          motion: this.walking ? 'walking' : 'idle',
          nearby: [...movement.remotes.values()].map((p) => ({
            name: p.name,
            x: p.samples[p.samples.length - 1]!.x,
            y: p.samples[p.samples.length - 1]!.y,
          })),
        });
      },
    });
    const clear = () => this.pressed.clear();
    this.game.events.on(Phaser.Core.Events.BLUR, clear);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      timer.remove();
      this.game.events.off(Phaser.Core.Events.BLUR, clear);
    });
  }
  private label(text: string, x: number, y: number) {
    this.add
      .text(x, y, text, {
        fontFamily: 'Georgia',
        fontSize: '14px',
        color: '#eee1ba',
        backgroundColor: '#253c32cc',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(5000);
  }
  update(time: number, delta: number) {
    const farmState = gameBridge.getSnapshot();
    this.focusRing?.clear();
    if (
      farmState.gameplay &&
      farmState.position &&
      farmState.status === 'connected' &&
      !farmState.inputBlocked
    ) {
      const target = interaction(
        farmState.gameplay,
        farmState.position,
        farmState.plots ?? [],
        farmState.resources ?? {},
        Date.now(),
        'turnip',
        undefined,
        farmState.monsters ?? [],
      );
      if (target)
        this.focusRing
          .lineStyle(2, target.enabled ? 0xf0d783 : 0x9caa94, 0.9)
          .strokeEllipse(target.x, target.y, 44, 26);
    }
    for (const plot of farmState.plots ?? []) {
      const status = cropStatus(plot, Date.now());
      const color =
        status === 'ready'
          ? 0xe8b64e
          : status === 'growing'
            ? 0x659c54
            : status === 'thirsty'
              ? 0x91ae68
              : status === 'prepared'
                ? 0x493323
                : 0x775037;
      this.plots
        .get(plot.id)
        ?.setFillStyle(color)
        .setStrokeStyle(
          2,
          plot.ownerId === farmState.gameplay?.characterId
            ? 0xf2e0a3
            : 0xa59670,
        );
    }
    if (!this.avatar) return;
    const health = farmState.health ?? 100;
    if (this.active && health < this.lastHealth)
      this.avatar.playGesture('hit', time);
    this.lastHealth = health;
    const focused = document.activeElement;
    const typing =
      focused instanceof HTMLSelectElement ||
      focused instanceof HTMLInputElement ||
      focused instanceof HTMLTextAreaElement ||
      (focused instanceof HTMLElement && focused.isContentEditable);
    const down = (key: string) => (this.pressed.has(key.toLowerCase()) ? 1 : 0);
    const dx =
      this.active && !typing
        ? down('D') + down('RIGHT') - down('A') - down('LEFT')
        : 0;
    const dy =
      this.active && !typing
        ? down('S') + down('DOWN') - down('W') - down('UP')
        : 0;
    if (this.active) {
      this.accumulator += Math.min(delta, 100);
      while (this.accumulator >= 50) {
        movement.input(dx, dy);
        this.accumulator -= 50;
      }
    } else this.accumulator = 0;
    const next = movement.position;
    const pose = this.avatar.updatePose(
      time,
      next.x,
      next.y,
      movement.direction,
      movement.cosmetics,
    );
    this.walking = this.avatar.state === 'walk';
    this.game.canvas.dataset.playerPose = `${this.avatar.state}:${this.avatar.facing}:${pose.frame}`;
    for (const [id, remote] of movement.remotes) {
      let sprite = this.remoteSprites.get(id);
      if (!sprite) {
        sprite = new PlayerAvatar(this, remote.name);
        this.remoteSprites.set(id, sprite);
      }
      const point = movement.interpolate(remote.samples, performance.now());
      sprite.updatePose(time, point.x, point.y, remote.direction, {
        ...remote,
        hairStyle: remote.hairStyle as Cosmetics['hairStyle'],
      });
      sprite.setAlpha(remote.connected ? 1 : 0.4);
    }
    for (const [id, sprite] of this.remoteSprites)
      if (!movement.remotes.has(id)) {
        sprite.destroy();
        this.remoteSprites.delete(id);
      }

    const liveMonsters = new Set<string>();
    for (const m of farmState.monsters ?? []) {
      liveMonsters.add(m.id);
      let entry = this.monsterSprites.get(m.id);
      if (!entry) {
        const def = MONSTERS.find((d) => d.id === m.id);
        const name = def?.name ?? 'Monstro';
        const hostile = !!def && def.kind !== 'slime';
        const barWidth = hostile ? 36 : 26;
        const shadow = this.add.ellipse(0, 0, 26, 10, 0x132b24, 0.4);
        const body = hostile
          ? this.add
              .sprite(0, 4, 'world-props', `${def.kind}-idle-0`)
              .setOrigin(0.5, 1)
              .play(`${def.kind}-idle`)
          : this.add.ellipse(0, -12, 28, 22, 0x5cd65c);
        const eyeLeft = this.add
          .ellipse(-5, -14, 4, 6, 0x132b24)
          .setVisible(!hostile);
        const eyeRight = this.add
          .ellipse(5, -14, 4, 6, 0x132b24)
          .setVisible(!hostile);
        const pupilLeft = this.add
          .ellipse(-4, -15, 2, 2, 0xffffff)
          .setVisible(!hostile);
        const pupilRight = this.add
          .ellipse(6, -15, 2, 2, 0xffffff)
          .setVisible(!hostile);
        const label = this.add
          .text(0, hostile ? -68 : -32, name, {
            fontSize: '10px',
            color: hostile ? '#efd0af' : '#bbf2b6',
            backgroundColor: '#183820',
          })
          .setOrigin(0.5);
        const hpBg = this.add.rectangle(
          0,
          hostile ? -54 : -22,
          barWidth,
          4,
          0x222222,
        );
        const hpFill = this.add
          .rectangle(-barWidth / 2, hostile ? -54 : -22, barWidth, 4, 0x33cc33)
          .setOrigin(0, 0.5);

        const container = this.add.container(m.x, m.y, [
          shadow,
          body,
          eyeLeft,
          eyeRight,
          pupilLeft,
          pupilRight,
          label,
          hpBg,
          hpFill,
        ]);
        container.setSize(hostile ? 48 : 32, hostile ? 64 : 32);
        container
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => gameBridge.interact?.(m.id));

        entry = { container, body, hpFill, barWidth };
        this.monsterSprites.set(m.id, entry);
      }

      if (m.state === 'dead' || m.health <= 0) {
        entry.container.setVisible(false);
      } else {
        entry.container.setVisible(true);
        entry.container.setPosition(m.x, m.y).setDepth(m.y);
        const squish = 1 + Math.sin(time / 150 + m.x) * 0.12;
        if (entry.body instanceof Phaser.GameObjects.Ellipse)
          entry.body.setScale(1 / squish, squish);
        const pct = Math.max(0, Math.min(1, m.health / m.maxHealth));
        entry.hpFill.width = entry.barWidth * pct;
        entry.hpFill.setFillStyle(pct > 0.3 ? 0x33cc33 : 0xcc3333);
      }
    }

    for (const [id, entry] of this.monsterSprites) {
      if (!liveMonsters.has(id)) {
        entry.container.destroy();
        this.monsterSprites.delete(id);
      }
    }
  }
}
