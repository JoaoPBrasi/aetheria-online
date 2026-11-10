import Phaser from 'phaser';
import {
  landmarks,
  MAP_SIZE,
  TILE_SIZE,
  WORLD_SPAWN,
  worldTiles,
  RESOURCES,
  FARM_PLOTS,
  CRAFTING_STATIONS,
  cropStatus,
  interaction,
  MONSTERS,
  NPCS,
} from '@aetheria/shared';
import { gameBridge } from '../managers/game-bridge';
import { movement } from '../networking/movement';

export class WorldScene extends Phaser.Scene {
  private avatar!: Phaser.GameObjects.Container;
  private bodyShape!: Phaser.GameObjects.Rectangle;
  private headShape!: Phaser.GameObjects.Rectangle;
  private hairShape!: Phaser.GameObjects.Rectangle;
  private backHair!: Phaser.GameObjects.Rectangle;
  private bun!: Phaser.GameObjects.Rectangle;
  private pressed = new Set<string>();
  private active = false;
  private focusRing!: Phaser.GameObjects.Graphics;
  private walking = false;
  private plots = new Map<string, Phaser.GameObjects.Rectangle>();
  private accumulator = 0;
  private remoteSprites = new Map<string, Phaser.GameObjects.Container>();
  private monsterSprites = new Map<
    string,
    {
      container: Phaser.GameObjects.Container;
      body: Phaser.GameObjects.Ellipse;
      hpFill: Phaser.GameObjects.Rectangle;
    }
  >();
  constructor() {
    super('world');
  }
  preload() {
    this.load.tilemapTiledJSON('brumavale', '/maps/brumavale.tmj');
    this.load.image('world-tiles', '/sprites/tileset-brumavale.png');
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
    this.load.image('tree-large', '/sprites/tree-large.png');
    this.load.image('tree-medium', '/sprites/tree-medium.png');
    this.load.image('farm-plot-tilled', '/sprites/farm-plot-tilled.png');
    this.load.image('farm-fence', '/sprites/farm-fence.png');
    this.load.image('building-house', '/sprites/building-house.png');
    this.load.image('building-warehouse', '/sprites/building-warehouse.png');
    this.load.image('building-blacksmith', '/sprites/building-blacksmith.png');
  }
  create() {
    this.focusRing = this.add.graphics().setDepth(5001);

    const map = this.make.tilemap({ key: 'brumavale' });
    const tiles = map.addTilesetImage('world-tiles');
    if (!tiles) throw new Error('Tileset indisponível');
    map.createLayer('Ground', tiles, 0, 0);

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
      this.add.image(fx, minPlotY - 24, 'farm-fence').setDepth(minPlotY - 24);
      this.add.image(fx, maxPlotY + 24, 'farm-fence').setDepth(maxPlotY + 24);
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
        .ellipse(station.x, station.y + 12, isForge ? 46 : 42, 14, 0x132b24, 0.35)
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
    for (const b of landmarks) {
      const x = b.x * 32,
        y = b.y * 32,
        w = b.w * 32,
        h = b.h * 32;
      const key =
        b.name === 'Casa'
          ? 'building-house'
          : b.name === 'Armazém'
            ? 'building-warehouse'
            : 'building-blacksmith';

      // Sombra projetada sob a fachada
      this.add
        .rectangle(x + w / 2, y + h - 6, w, 16, 0x132b24, 0.35)
        .setDepth(y + h - 1);

      // Fachada em pixel art com telhado medieval
      this.add
        .image(x + w / 2, y + h / 2, key)
        .setDepth(y + h);

      this.label(b.name, x + w / 2, y - 28);
    }
    this.label('BRUMAVALE · PRAÇA', 1040, 910);
    this.label('LAGO DOS JUNÇOS', 1600, 250);
    this.label('FAZENDA', 440, 1100);
    this.label('BOSQUE ANTIGO', 370, 300);
    this.label('PEDREIRA', 1670, 1240);
    this.label('PRADO DOS SLIMES', 1540, 1720);
    // Árvores com profundidade: o jogador pode passar por trás de suas copas
    for (let ty = 1; ty < 25; ty++)
      for (let tx = 1; tx < 22; tx++) {
        if (worldTiles[ty]?.[tx] !== 4) continue;
        const x = tx * 32 + 16,
          y = ty * 32 + 16;
        const isBig = (tx * 7 + ty * 13) % 2 === 0;
        if (isBig) {
          this.add.ellipse(x, y + 4, 38, 14, 0x132b24, 0.35).setDepth(y - 1);
          this.add.image(x, y - 40, 'tree-large').setDepth(y);
        } else {
          this.add.ellipse(x, y + 2, 28, 10, 0x132b24, 0.35).setDepth(y - 1);
          this.add.image(x, y - 16, 'tree-medium').setDepth(y);
        }
      }
    for (let i = 0; i < 13; i++) {
      const x = 1490 + ((i * 53) % 350),
        y = 1320 + ((i * 71) % 230);
      this.add.ellipse(x, y + 8, 26, 10, 0x132b24, 0.35).setDepth(y - 1);
      this.add.image(x, y, 'resource-rock').setDepth(y);
    }
    const shadow = this.add.ellipse(0, 0, 25, 10, 0x132b24, 0.4);
    const legs = this.add.rectangle(0, -6, 14, 12, 0x35434c);
    this.bodyShape = this.add.rectangle(0, -18, 22, 19, 0xc4d597);
    const head = this.add.rectangle(0, -34, 16, 16, 0xe1b68c);
    const hair = this.add.rectangle(0, -42, 18, 7, 0x59422f);
    this.headShape = head;
    this.hairShape = hair;
    this.backHair = this.add
      .rectangle(0, -27, 24, 30, 0x59422f)
      .setVisible(false);
    this.bun = this.add.rectangle(0, -49, 10, 10, 0x59422f).setVisible(false);
    this.avatar = this.add.container(WORLD_SPAWN.x, WORLD_SPAWN.y, [
      shadow,
      legs,
      this.backHair,
      this.bodyShape,
      head,
      hair,
      this.bun,
    ]);
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
    const look = movement.cosmetics;
    const color = (hex: string) => parseInt(hex.slice(1), 16);
    this.bodyShape.setFillStyle(color(look.clothingColor));
    this.headShape.setFillStyle(color(look.skinColor));
    this.hairShape
      .setFillStyle(color(look.hairColor))
      .setVisible(look.hairStyle !== 'none');
    this.backHair
      .setFillStyle(color(look.hairColor))
      .setVisible(look.hairStyle === 'long');
    this.bun
      .setFillStyle(color(look.hairColor))
      .setVisible(look.hairStyle === 'bun');
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
    this.walking = next.x !== this.avatar.x || next.y !== this.avatar.y;
    this.avatar.setPosition(next.x, next.y).setDepth(next.y);
    this.bodyShape.y = -18 + (this.walking ? Math.sin(time / 80) * 2 : 0);
    for (const [id, remote] of movement.remotes) {
      let sprite = this.remoteSprites.get(id);
      if (!sprite) {
        const coat = parseInt(remote.clothingColor.slice(1), 16);
        sprite = this.add.container(0, 0, [
          this.add.ellipse(0, 0, 25, 10, 0x132b24, 0.4),
          this.add.rectangle(0, -6, 14, 12, 0x35434c),
          this.add
            .rectangle(0, -27, 24, 30, parseInt(remote.hairColor.slice(1), 16))
            .setVisible(remote.hairStyle === 'long'),
          this.add.rectangle(0, -18, 22, 19, coat),
          this.add.rectangle(
            0,
            -34,
            16,
            16,
            parseInt(remote.skinColor.slice(1), 16),
          ),
          this.add
            .rectangle(0, -42, 18, 7, parseInt(remote.hairColor.slice(1), 16))
            .setVisible(remote.hairStyle !== 'none'),
          this.add
            .rectangle(0, -49, 10, 10, parseInt(remote.hairColor.slice(1), 16))
            .setVisible(remote.hairStyle === 'bun'),
          this.add
            .text(0, -58, remote.name, {
              fontSize: '12px',
              color: '#fff5d0',
              backgroundColor: '#253c32',
            })
            .setOrigin(0.5),
        ]);
        this.remoteSprites.set(id, sprite);
      }
      const point = movement.interpolate(remote.samples, performance.now());
      sprite
        .setPosition(point.x, point.y)
        .setDepth(point.y)
        .setAlpha(remote.connected ? 1 : 0.4);
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
        const name = def?.name ?? 'Slime';
        const shadow = this.add.ellipse(0, 0, 26, 10, 0x132b24, 0.4);
        const body = this.add.ellipse(0, -12, 28, 22, 0x5cd65c);
        const eyeLeft = this.add.ellipse(-5, -14, 4, 6, 0x132b24);
        const eyeRight = this.add.ellipse(5, -14, 4, 6, 0x132b24);
        const pupilLeft = this.add.ellipse(-4, -15, 2, 2, 0xffffff);
        const pupilRight = this.add.ellipse(6, -15, 2, 2, 0xffffff);
        const label = this.add
          .text(0, -32, name, {
            fontSize: '10px',
            color: '#bbf2b6',
            backgroundColor: '#183820',
          })
          .setOrigin(0.5);
        const hpBg = this.add.rectangle(0, -22, 26, 4, 0x222222);
        const hpFill = this.add
          .rectangle(-13, -22, 26, 4, 0x33cc33)
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
        container.setSize(32, 32);
        container
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => gameBridge.interact?.(m.id));

        entry = { container, body, hpFill };
        this.monsterSprites.set(m.id, entry);
      }

      if (m.state === 'dead' || m.health <= 0) {
        entry.container.setVisible(false);
      } else {
        entry.container.setVisible(true);
        entry.container.setPosition(m.x, m.y).setDepth(m.y);
        const squish = 1 + Math.sin(time / 150 + m.x) * 0.12;
        entry.body.setScale(1 / squish, squish);
        const pct = Math.max(0, Math.min(1, m.health / m.maxHealth));
        entry.hpFill.width = 26 * pct;
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
