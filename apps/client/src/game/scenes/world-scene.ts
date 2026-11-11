import Phaser from 'phaser';
import {
  landmarks,
  MAP_SIZE,
  TILE_SIZE,
  WORLD_SPAWN,
  WORLD_ART_REVISION,
  WORLD_REGIONS,
  QUARRY,
  CAMPFIRE,
  RESOURCES,
  treeStage,
  FARM_PLOTS,
  CRAFTING_STATIONS,
  cropStatus,
  nearbyFarmTarget,
  interaction,
  MONSTERS,
  NPCS,
  type WorldArtwork,
  type ResourceStates,
  type ResourceDefinition,
  type ForageNode,
  type CombatFeedback,
} from '@aetheria/shared';
import { paintFarmPlot } from '../farm-plot-art';
import { gameBridge } from '../managers/game-bridge';
import { movement } from '../networking/movement';
import { PlayerAvatar } from '../characters/player-avatar';
import { makeNameplate } from '../ui/nameplate';
import type { Cosmetics } from '@aetheria/shared';
import { facingFromInput } from '../characters/animation';
import { playCombatSound } from '../combat-audio';
import {
  showCombatEffect,
  showToolEffect,
  type ToolEffectKind,
} from '../combat-effects';
import { audioManager } from '../audio/audio-manager';

export class WorldScene extends Phaser.Scene {
  private avatar!: PlayerAvatar;
  private pressed = new Set<string>();
  private active = false;
  private focusRing!: Phaser.GameObjects.Graphics;
  private walking = false;
  private lastFootstepTime = 0;
  private dangerRing!: Phaser.GameObjects.Graphics;
  private targetRing!: Phaser.GameObjects.Graphics;
  private plots = new Map<
    string,
    {
      shape: Phaser.GameObjects.Rectangle;
      art: Phaser.GameObjects.Graphics;
      appearance: string;
    }
  >();
  private accumulator = 0;
  private lastToolAction?: Record<string, unknown>;
  private lastToolAnimTime = 0;
  private remoteSprites = new Map<string, PlayerAvatar>();
  private coverCells = new Map<string, Set<Phaser.GameObjects.Image>>();
  private fadingCover = new Set<Phaser.GameObjects.Image>();
  private groveSprites = new Map<
    string,
    Record<ReturnType<typeof treeStage>, Phaser.GameObjects.Image>
  >();
  private gatherSprites = new Map<
    string,
    {
      image: Phaser.GameObjects.Image;
      label: Phaser.GameObjects.Container;
      shadow: Phaser.GameObjects.Ellipse;
    }
  >();
  private forage?: ForageNode[];
  private monsterSprites = new Map<
    string,
    {
      container: Phaser.GameObjects.Container;
      body: Phaser.GameObjects.Ellipse | Phaser.GameObjects.Sprite;
      hpBg: Phaser.GameObjects.Rectangle;
      hpFill: Phaser.GameObjects.Rectangle;
      barWidth: number;
      hurtUntil: number;
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
    this.load.spritesheet('npc-merchant', '/sprites/npc-merchant-idle.png', {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet('bonfire', '/sprites/bonfire-idle.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image('station-workbench', '/sprites/station-workbench.png');
    this.load.image('station-anvil', '/sprites/station-anvil.png');
    this.load.image('furnace-stone', '/sprites/furnace-stone.png');
    this.load.image('resource-rock', '/sprites/resource-rock.png');
    this.load.image('resource-bush', '/sprites/resource-bush.png');
    this.load.image('tree-young', '/sprites/tree-medium.png');
    this.load.image('farm-plot-tilled', '/sprites/farm-plot-tilled.png');
  }
  create() {
    this.focusRing = this.add.graphics().setDepth(5001);
    this.dangerRing = this.add.graphics().setDepth(2);
    this.targetRing = this.add.graphics().setDepth(20);

    this.input.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[],
      ) => {
        if (currentlyOver.length === 0) {
          gameBridge.selectTarget(null);
        }
      },
    );

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
    for (const p of artwork.props) {
      const prop = this.add
        .image(p.x, p.y, 'world-props', p.frame)
        .setOrigin(0)
        .setDepth(p.depth);
      if (p.frame.startsWith('tree:') || p.frame.startsWith('house:'))
        this.registerCover(prop);
    }
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
    if (!this.anims.exists('npc-merchant-idle')) {
      this.anims.create({
        key: 'npc-merchant-idle',
        frames: this.anims.generateFrameNumbers('npc-merchant', {
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

    for (const fire of CRAFTING_STATIONS.filter(
      (station) => station.type === 'campfire',
    )) {
      const { x, y } = fire;
      const central = fire.id === 'campfire-plaza';
      this.add
        .ellipse(
          x,
          y + (central ? 16 : 14),
          central ? 51 : 44,
          central ? 21 : 18,
          0x132b24,
          0.45,
        )
        .setDepth(y - 1);
      this.add
        .sprite(x, y, 'bonfire')
        .setScale(central ? 2.05 : 1.75)
        .setDepth(y)
        .play('bonfire-burn')
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => gameBridge.interact?.(fire.id));
    }

    for (const plot of FARM_PLOTS) {
      const px = plot.tileX * 32 + 16;
      const py = plot.tileY * 32 + 16;
      this.add.image(px, py, 'farm-plot-tilled').setDepth(0.5);
      const art = this.add.graphics({ x: px, y: py }).setDepth(0.6);
      paintFarmPlot(art, 'empty', null);
      const shape = this.add
        .rectangle(px, py, 28, 28)
        .setStrokeStyle(2, 0xc2ad79)
        .setDepth(1);
      this.plots.set(plot.id, { shape, art, appearance: 'empty:null' });
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
          .image(fx, minPlotY - 36, 'world-props', 'fence:white')
          .setDepth(minPlotY - 36);
      this.add
        .image(fx, maxPlotY + 36, 'world-props', 'fence:white')
        .setDepth(maxPlotY + 36);
    }
    this.createResources();
    for (const [x, y] of [
      [49.5, 44.5],
      [55.5, 44.5],
      [51.5, 40.5],
      [54.5, 45.5],
    ] as const)
      this.add
        .image(x * TILE_SIZE, y * TILE_SIZE, 'resource-flower')
        .setDepth(y * TILE_SIZE);
    for (const station of CRAFTING_STATIONS) {
      if (station.type === 'campfire') continue;
      const isFurnace = station.type === 'furnace';
      const textureKey = {
        forge: 'station-anvil',
        furnace: 'furnace-stone',
        workbench: 'station-workbench',
      }[station.type];
      this.add
        .ellipse(
          station.x,
          station.y + 16,
          isFurnace ? 46 : 60,
          20,
          0x132b24,
          0.38,
        )
        .setDepth(station.y - 1);
      this.add
        .image(station.x, station.y - (isFurnace ? 8 : 0), textureKey)
        .setScale(1.55)
        .setDepth(station.y)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => gameBridge.interact?.(station.id));

      makeNameplate(
        this,
        station.name,
        'object',
        station.x,
        station.y - (isFurnace ? 70 : 44),
      ).setDepth(station.y + 1);
    }
    for (const npc of NPCS) {
      const spriteKey = npc.spriteKey ?? 'npc-wizard';
      const animKey = npc.animKey ?? 'npc-wizard-idle';
      const scale = npc.scale ?? 2.2;
      const originY = npc.originY ?? 1;
      const shadow = this.add.ellipse(0, 6, 36, 14, 0x132b24, 0.45);
      const sprite = this.add
        .sprite(0, 6, spriteKey)
        .setScale(scale)
        .setOrigin(0.5, originY);
      sprite.play(animKey);
      const label = makeNameplate(this, `✦ ${npc.name}`, 'npc', 0, -76);
      const title = this.add
        .text(0, -100, npc.title, {
          fontSize: '10px',
          color: '#a3bfab',
        })
        .setOrigin(0.5);

      const npcContainer = this.add.container(npc.x, npc.y, [
        shadow,
        sprite,
        label,
        title,
      ]);
      npcContainer.setSize(48, 76);
      npcContainer.setDepth(npc.y);
      npcContainer
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          gameBridge.selectTarget(npc.id);
          gameBridge.interact?.(npc.id);
        });
    }
    for (const b of landmarks)
      this.label(
        b.name,
        (b.x + b.w / 2) * TILE_SIZE,
        (b.y + b.h) * TILE_SIZE + 24,
      );
    this.label('BRUMAVALE · PRAÇA', 1040, 910);
    this.label('LAGO DOS JUNCOS', 1600, 250);
    this.label('HORTA DE BRUMAVALE', 440, 1100);
    this.label('BOSQUE ANTIGO', 370, 300);
    this.label(
      'PEDREIRA',
      (QUARRY.x + QUARRY.w / 2) * TILE_SIZE,
      (QUARRY.y + 0.5) * TILE_SIZE,
    );
    this.label('ACAMPAMENTO DO BOSQUE', CAMPFIRE.x, CAMPFIRE.y - 104);
    this.label('ZONA DE PROFISSÕES', 1552, 720);
    for (const r of WORLD_REGIONS.filter((r) => r.danger !== 'safe'))
      this.label(
        r.name.toUpperCase(),
        (r.x + r.w / 2) * TILE_SIZE,
        r.y * TILE_SIZE - 24,
      );
    this.label('CAMPOS DO SUL ↓', 1040, 2030);
    this.label('ORCS →', 2260, 1040);
    this.avatar = new PlayerAvatar(this);
    gameBridge.combatFeedback = (event, local, attackerSession) => {
      this.combat(event, local, attackerSession);
    };
    gameBridge.animateCharacter = (action) => {
      this.lastToolAction = action;
      this.lastToolAnimTime = this.time.now;
      this.animateToolAction(action, false, 420);
    };
    gameBridge.speechBubble = (msg) => {
      const snap = gameBridge.getSnapshot();
      if (msg.characterId === snap.gameplay?.characterId) {
        this.avatar.showSpeechBubble(msg.text);
      } else {
        const remote = this.remoteSprites.get(msg.sessionId);
        if (remote) {
          remote.showSpeechBubble(msg.text);
        }
      }
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameBridge.animateCharacter = undefined;
      gameBridge.combatFeedback = undefined;
      gameBridge.speechBubble = undefined;
      this.lastToolAction = undefined;
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
    makeNameplate(this, text, 'place', x, y).setDepth(5000);
  }
  private registerCover(prop: Phaser.GameObjects.Image) {
    const size = 128;
    const left = Math.floor(prop.x / size);
    const right = Math.floor((prop.x + prop.displayWidth) / size);
    const top = Math.floor(prop.y / size);
    const bottom = Math.floor((prop.y + prop.displayHeight) / size);
    for (let cy = top; cy <= bottom; cy++)
      for (let cx = left; cx <= right; cx++) {
        const key = `${cx}:${cy}`;
        let cell = this.coverCells.get(key);
        if (!cell) this.coverCells.set(key, (cell = new Set()));
        cell.add(prop);
      }
  }
  private createResources() {
    if (!this.textures.exists('resource-flower')) {
      const flower = this.make.graphics({ x: 0, y: 0 }, false);
      for (const [x, y, color] of [
        [5, 6, 0xffd477],
        [12, 2, 0xf3a6b8],
        [17, 9, 0xffe8bb],
      ] as const) {
        flower.fillStyle(0x466c32).fillRect(x + 2, y + 5, 2, 18 - y);
        flower.fillStyle(0x6c9845).fillRect(x, y + 8, 4, 2);
        flower
          .fillStyle(color)
          .fillRect(x, y + 2, 6, 2)
          .fillRect(x + 2, y, 2, 6);
        flower.fillStyle(0xc28035).fillRect(x + 2, y + 2, 2, 2);
      }
      flower.generateTexture('resource-flower', 24, 24);
      flower.destroy();
    }
    for (const node of RESOURCES) {
      if (node.kind === 'tree') {
        const adult = this.add
          .image(0, 0, 'world-props', 'tree:oak')
          .setOrigin(0);
        adult
          .setPosition(node.x - adult.width / 2, node.y - adult.height)
          .setDepth(node.y);
        this.registerCover(adult);
        const young = this.add
          .image(node.x, node.y, 'tree-young')
          .setOrigin(0.5, 1)
          .setScale(0.8)
          .setDepth(node.y)
          .setVisible(false);
        const seedling = this.add
          .image(node.x, node.y, 'tree-young')
          .setOrigin(0.5, 1)
          .setScale(0.28)
          .setDepth(node.y)
          .setVisible(false);
        for (const tree of [adult, young, seedling])
          tree
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => gameBridge.interact?.(node.id));
        this.groveSprites.set(node.id, { adult, young, seedling });
        continue;
      }
      this.addCollectible(node);
    }
  }
  private addCollectible(node: ResourceDefinition) {
    if (node.kind === 'tree') return;
    const texture = {
      ore: 'resource-rock',
      rock: 'resource-rock',
      fiber: 'resource-bush',
      flower: 'resource-flower',
    }[node.kind];
    const shadow = this.add
      .ellipse(node.x, node.y + 8, 26, 8, 0x132b24, 0.32)
      .setDepth(node.y - 1);
    const image = this.add
      .image(node.x, node.y, texture)
      .setDepth(node.y)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => gameBridge.interact?.(node.id));
    if (node.kind === 'ore') image.setTint(0xd8a786);
    const label = makeNameplate(this, node.name, 'object', node.x, node.y - 29)
      .setDepth(node.y + 1)
      .setVisible(false);
    this.gatherSprites.set(node.id, { image, label, shadow });
  }
  private syncForage(forage?: ForageNode[]) {
    if (forage === this.forage) return;
    const next = new Set(forage?.map((node) => node.id));
    for (const node of this.forage ?? []) {
      if (next.has(node.id)) continue;
      const sprite = this.gatherSprites.get(node.id);
      sprite?.image.destroy();
      sprite?.shadow.destroy();
      sprite?.label.destroy();
      this.gatherSprites.delete(node.id);
    }
    for (const node of forage ?? [])
      if (!this.gatherSprites.has(node.id)) this.addCollectible(node);
    this.forage = forage;
  }
  private updateResources(resources: ResourceStates, now: number) {
    for (const [id, trees] of this.groveSprites) {
      const stage = treeStage(resources[id], now);
      for (const key of ['adult', 'young', 'seedling'] as const)
        trees[key].setVisible(key === stage);
    }
    for (const [id, { image, label }] of this.gatherSprites) {
      image.setAlpha((resources[id]?.readyAt ?? 0) > now ? 0.35 : 1);
      label.setVisible(
        this.active &&
          Math.hypot(this.avatar.x - image.x, this.avatar.y - image.y) < 92,
      );
    }
  }
  private updateCover() {
    const covered = new Set<Phaser.GameObjects.Image>();
    const players = [
      ...(this.avatar.visible ? [this.avatar] : []),
      ...this.remoteSprites.values(),
    ];
    for (const player of players) {
      const { x, y } = player;
      const left = Math.floor((x - 14) / 128);
      const right = Math.floor((x + 14) / 128);
      const top = Math.floor((y - 68) / 128);
      const bottom = Math.floor((y - 5) / 128);
      for (let cy = top; cy <= bottom; cy++)
        for (let cx = left; cx <= right; cx++)
          for (const prop of this.coverCells.get(`${cx}:${cy}`) ?? [])
            if (
              prop.visible &&
              prop.depth > y &&
              prop.x < x + 14 &&
              prop.x + prop.displayWidth > x - 14 &&
              prop.y < y - 5 &&
              prop.y + prop.displayHeight > y - 68
            )
              covered.add(prop);
    }
    for (const prop of covered) this.fadingCover.add(prop);
    for (const prop of this.fadingCover) {
      const target = covered.has(prop)
        ? prop.frame.name.toString().startsWith('tree:')
          ? 0.25
          : 0.4
        : 1;
      const alpha = Phaser.Math.Linear(prop.alpha, target, 0.28);
      if (Math.abs(alpha - target) < 0.015) {
        prop.setAlpha(target);
        if (target === 1) this.fadingCover.delete(prop);
      } else prop.setAlpha(alpha);
    }
  }
  private combat(
    event: CombatFeedback,
    local: boolean,
    attackerSession?: string,
  ) {
    if (!this.active) return;
    if (local) {
      playCombatSound(event.kind);
      audioManager.notifyCombatAction();
    }
    if (event.kind === 'strike') {
      const actor = local
        ? this.avatar
        : attackerSession
          ? this.remoteSprites.get(attackerSession)
          : undefined;
      if (actor) {
        const facing = facingFromInput(
          event.x - event.origin.x,
          event.y - event.origin.y,
          actor.facing,
        );
        actor.playGesture('attack', this.time.now, facing);
      }
      const target = this.monsterSprites.get(event.monsterId);
      if (target) target.hurtUntil = this.time.now + 160;
    } else if (local && event.kind === 'hurt') {
      this.avatar.playGesture('hit', this.time.now);
      if (gameBridge.getCast()?.status === 'channeling') {
        gameBridge.cancelCast('Sofreu dano!');
        this.lastToolAction = undefined;
      }
    }
    const camera = this.cameras.main.worldView;
    if (local || camera.contains(event.x, event.y))
      showCombatEffect(this, event, local);
  }

  private animateToolAction(
    action: Record<string, unknown>,
    playSound = false,
    durationMs?: number,
  ) {
    const kind = action.kind as string;
    const resource = RESOURCES.find((r) => r.id === action.node);
    const isWood =
      resource?.item === 'wood' ||
      (typeof action.node === 'string' && action.node.includes('tree'));
    const isOre =
      resource?.tool === 'pickaxe' ||
      (typeof action.node === 'string' &&
        (action.node.includes('quarry') ||
          action.node.includes('iron') ||
          action.node.includes('stone')));
    const isSickle =
      resource?.tool === 'sickle' ||
      (typeof action.node === 'string' && action.node.includes('fiber'));

    let gesture:
      | 'idle'
      | 'walk'
      | 'collect'
      | 'chop'
      | 'mine'
      | 'water'
      | 'hit'
      | 'attack' = 'collect';
    let toolEffect: ToolEffectKind = 'collect';

    if (kind === 'farm') {
      const op = action.operation;
      if (op === 'prepare') {
        gesture = 'mine';
        toolEffect = 'hoe';
        if (playSound) audioManager.playSfx('gather');
      } else if (op === 'water') {
        gesture = 'water';
        toolEffect = 'water';
        if (playSound) audioManager.playSfx('gather');
      } else {
        gesture = 'collect';
        toolEffect = 'collect';
        if (playSound) audioManager.playSfx('gather');
      }
    } else if (kind === 'gather') {
      if (isWood) {
        gesture = 'chop';
        toolEffect = 'axe';
        if (playSound) audioManager.playSfx('chop');
      } else if (isOre) {
        gesture = 'mine';
        toolEffect = 'pickaxe';
        if (playSound) audioManager.playSfx('mine');
      } else if (isSickle) {
        gesture = 'chop';
        toolEffect = 'sickle';
        if (playSound) audioManager.playSfx('gather');
      } else {
        gesture = 'collect';
        toolEffect = 'collect';
        if (playSound) audioManager.playSfx('gather');
      }
    } else if (kind === 'craft') {
      gesture = 'mine';
      toolEffect = 'craft';
      if (playSound) audioManager.playSfx('craft');
    } else if (kind === 'attack') {
      gesture = 'attack';
      toolEffect = 'sword';
    }

    this.avatar.playGesture(gesture, this.time.now, undefined, durationMs);
    showToolEffect(
      this,
      this.avatar.x,
      this.avatar.y,
      toolEffect,
      this.avatar.facing,
    );
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
        undefined,
        nearbyFarmTarget(
          farmState.plots ?? [],
          farmState.farmTarget,
          farmState.position,
        ),
        farmState.monsters ?? [],
        farmState.forage,
      );
      if (target) {
        this.focusRing.lineStyle(2, target.enabled ? 0xf0d783 : 0x9caa94, 0.9);
        if (target.plot)
          this.focusRing.strokeRect(target.x - 16, target.y - 16, 32, 32);
        else this.focusRing.strokeEllipse(target.x, target.y, 44, 26);
      }
    }
    for (const plot of farmState.plots ?? []) {
      const status = cropStatus(plot, Date.now());
      const display = this.plots.get(plot.id);
      const appearance = `${status}:${plot.cropId}`;
      if (!display) continue;
      if (display.appearance !== appearance) {
        paintFarmPlot(display.art, status, plot.cropId);
        display.appearance = appearance;
      }
      display.shape.setStrokeStyle(
        2,
        plot.ownerId === farmState.gameplay?.characterId ? 0xf2e0a3 : 0xa59670,
      );
    }
    if (!this.avatar) return;
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

    const isMoving = dx !== 0 || dy !== 0;
    if (isMoving && gameBridge.getCast()?.status === 'channeling') {
      gameBridge.cancelCast('Movimento cancelou a ação!');
      this.avatar.playGesture('idle', this.time.now);
      this.lastToolAction = undefined;
    }

    const activeCast = gameBridge.getCast();
    if (activeCast && activeCast.status === 'channeling') {
      const strikeInterval = Math.max(
        300,
        Math.min(500, Math.floor(activeCast.durationMs / 3.4)),
      );
      if (
        this.lastToolAction &&
        time - this.lastToolAnimTime >= strikeInterval
      ) {
        this.lastToolAnimTime = time;
        this.animateToolAction(this.lastToolAction, true, strikeInterval);
      }
    } else if (this.lastToolAction) {
      this.lastToolAction = undefined;
    }

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
    if (this.walking && farmState.farmTarget)
      gameBridge.update({ farmTarget: undefined });
    if (this.walking && time - this.lastFootstepTime > 340) {
      this.lastFootstepTime = time;
      audioManager.playSfx('footstep');
    }
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
    this.syncForage(farmState.forage);
    this.updateResources(farmState.resources ?? {}, Date.now());
    this.updateCover();

    if (farmState.health !== undefined && farmState.health <= 0) {
      audioManager.exitCombat();
    } else {
      const localCharId = farmState.gameplay?.characterId;
      const isUnderThreat =
        !!localCharId &&
        (farmState.monsters ?? []).some(
          (m) =>
            m.health > 0 &&
            m.state !== 'dead' &&
            m.targetId === localCharId &&
            (m.state === 'chase' ||
              m.state === 'windup' ||
              m.state === 'attack'),
        );
      if (isUnderThreat) {
        audioManager.notifyCombatAction();
      }
    }

    const liveMonsters = new Set<string>();
    this.dangerRing.clear();
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
        const label = makeNameplate(
          this,
          name,
          hostile ? 'enemy' : 'object',
          0,
          hostile ? -70 : -37,
        );
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
          .on('pointerdown', () => {
            gameBridge.selectTarget(m.id);
            gameBridge.interact?.(m.id);
          });

        entry = { container, body, hpBg, hpFill, barWidth, hurtUntil: 0 };
        this.monsterSprites.set(m.id, entry);
      }

      if (m.state === 'dead' || m.health <= 0) {
        entry.container.setVisible(false);
      } else {
        entry.container.setVisible(true);
        entry.container.setPosition(m.x, m.y).setDepth(m.y);
        const charging = m.state === 'windup';
        const hurt = entry.hurtUntil > time;
        const squish = charging
          ? 0.67
          : hurt
            ? 0.82
            : 1 + Math.sin(time / 150 + m.x) * 0.12;
        if (entry.body instanceof Phaser.GameObjects.Ellipse) {
          entry.body.setScale(1 / squish, squish);
          entry.body.setFillStyle(
            hurt ? 0xf0dc91 : charging ? 0xf4a75a : 0x5cd65c,
          );
        } else if (hurt || charging)
          entry.body.setTint(hurt ? 0xffddaa : 0xffa570);
        else entry.body.clearTint();
        if (charging) {
          this.dangerRing
            .fillStyle(0xf6513d, 0.2)
            .fillCircle(m.x, m.y, m.attackRange);
          this.dangerRing
            .lineStyle(2, 0xff8758, 0.95)
            .strokeCircle(m.x, m.y, m.attackRange);
        }

        const isSelected = farmState.currentTargetId === m.id;
        const showHp =
          isSelected ||
          m.health < m.maxHealth ||
          m.state === 'chase' ||
          m.state === 'windup' ||
          m.state === 'attack';
        entry.hpBg.setVisible(showHp);
        entry.hpFill.setVisible(showHp);
        if (isSelected) {
          entry.hpBg.setStrokeStyle(1.5, 0xffd166, 0.95);
        } else {
          entry.hpBg.setStrokeStyle(1, 0x111111, 0.7);
        }

        const pct = Math.max(0, Math.min(1, m.health / m.maxHealth));
        entry.hpFill.width = entry.barWidth * pct;
        entry.hpFill.setFillStyle(
          pct > 0.5 ? 0x2ec4b6 : pct > 0.25 ? 0xffb703 : 0xe63946,
        );
      }
    }

    for (const [id, entry] of this.monsterSprites) {
      if (!liveMonsters.has(id)) {
        entry.container.destroy();
        this.monsterSprites.delete(id);
      }
    }

    // Renderização do anel elíptico de mira (Target Ring) sob os pés do alvo selecionado
    this.targetRing.clear();
    const currentTargetId = farmState.currentTargetId;
    if (currentTargetId) {
      let targetX: number | undefined;
      let targetY: number | undefined;
      let isHostile = true;
      let radius = 22;

      const monsterEntry = this.monsterSprites.get(currentTargetId);
      if (monsterEntry && monsterEntry.container.visible) {
        targetX = monsterEntry.container.x;
        targetY = monsterEntry.container.y;
        radius =
          currentTargetId.includes('orc') ||
          currentTargetId.includes('skeleton')
            ? 28
            : 20;
        isHostile = true;
      } else {
        const npc = NPCS.find((n) => n.id === currentTargetId);
        if (npc) {
          targetX = npc.x;
          targetY = npc.y;
          radius = 24;
          isHostile = false;
        }
      }

      if (targetX !== undefined && targetY !== undefined) {
        const pulse = 0.75 + Math.sin(time / 140) * 0.2;
        const color = isHostile ? 0xff4d4d : 0x4ddb82;
        const strokeColor = isHostile ? 0xff8585 : 0x85ffb0;

        const rx = radius * 1.15;
        const ry = radius * 0.58;
        const groundY = targetY + 2;

        this.targetRing.lineStyle(2, strokeColor, pulse);
        this.targetRing.strokeEllipse(targetX, groundY, rx * 2, ry * 2);

        this.targetRing.fillStyle(color, pulse * 0.2);
        this.targetRing.fillEllipse(targetX, groundY, rx * 2, ry * 2);

        const tickLen = 6;
        this.targetRing.lineStyle(2.5, strokeColor, Math.min(1, pulse + 0.25));
        this.targetRing.lineBetween(
          targetX - rx - 2,
          groundY,
          targetX - rx + tickLen,
          groundY,
        );
        this.targetRing.lineBetween(
          targetX + rx + 2,
          groundY,
          targetX + rx - tickLen,
          groundY,
        );
        this.targetRing.lineBetween(
          targetX,
          groundY - ry - 2,
          targetX,
          groundY - ry + tickLen,
        );
        this.targetRing.lineBetween(
          targetX,
          groundY + ry + 2,
          targetX,
          groundY + ry - tickLen,
        );
      } else {
        gameBridge.selectTarget(null);
      }
    }
  }
}
