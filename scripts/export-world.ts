import { mkdir, writeFile } from 'node:fs/promises';
import {
  worldTiles,
  MAP_SIZE,
  WORLD_SPAWN,
  landmarks,
  WORLD_PATHS,
  WORLD_REGIONS,
  BRIDGES,
  ROCKS,
  VILLAGE_PROPS,
  WORLD_ART_REVISION,
  QUARRY,
} from '../packages/shared/src/data/world.js';
import { CEMETERY } from '../packages/shared/src/data/cemetery.js';
import { MONSTERS } from '../packages/shared/src/data/gameplay.js';
import { FARM_PLOTS } from '../packages/shared/src/data/index.js';
import { TILE_SIZE } from '../packages/shared/src/constants/index.js';
const dir = new URL('../apps/client/public/maps/', import.meta.url);
await mkdir(dir, { recursive: true });
const layer = (name: string, id: number, data: number[]) => ({
  id,
  name,
  type: 'tilelayer',
  width: MAP_SIZE,
  height: MAP_SIZE,
  x: 0,
  y: 0,
  opacity: 1,
  visible: true,
  data,
});
const blank = () => Array<number>(MAP_SIZE * MAP_SIZE).fill(0);
const map = {
  type: 'map',
  version: '1.10',
  tiledversion: '1.11.2',
  orientation: 'orthogonal',
  renderorder: 'right-down',
  width: MAP_SIZE,
  height: MAP_SIZE,
  tilewidth: TILE_SIZE,
  tileheight: TILE_SIZE,
  infinite: false,
  nextlayerid: 7,
  nextobjectid: 10,
  layers: [
    layer(
      'Ground',
      1,
      worldTiles.flat().map((t) => t + 1),
    ),
    layer('Decoration', 2, blank()),
    layer(
      'Obstacles',
      3,
      worldTiles.flat().map((t) => (t === 3 || t === 4 ? t + 1 : 0)),
    ),
    layer('AbovePlayer', 4, blank()),
    {
      id: 5,
      name: 'SpawnPoints',
      type: 'objectgroup',
      opacity: 1,
      visible: true,
      objects: [
        {
          id: 1,
          name: 'village',
          type: 'spawn',
          x: WORLD_SPAWN.x,
          y: WORLD_SPAWN.y,
          width: 0,
          height: 0,
          point: true,
          rotation: 0,
          visible: true,
        },
      ],
    },
    {
      id: 6,
      name: 'Interactions',
      type: 'objectgroup',
      opacity: 1,
      visible: true,
      objects: landmarks.map((b, i) => ({
        id: i + 2,
        name: b.name,
        type: 'building',
        x: b.x * 32,
        y: b.y * 32,
        width: b.w * 32,
        height: b.h * 32,
        rotation: 0,
        visible: true,
      })),
    },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: 'world-tiles',
      tilewidth: 32,
      tileheight: 32,
      tilecount: 5,
      columns: 5,
      spacing: 0,
      margin: 0,
      image: 'world-tiles.svg',
      imagewidth: 160,
      imageheight: 32,
    },
  ],
};
await writeFile(new URL('brumavale.tmj', dir), JSON.stringify(map));
await writeFile(
  new URL('world-art-plan.json', dir),
  JSON.stringify({
    revision: WORLD_ART_REVISION,
    size: MAP_SIZE,
    tileSize: TILE_SIZE,
    tiles: worldTiles,
    landmarks,
    paths: WORLD_PATHS,
    regions: WORLD_REGIONS,
    bridges: BRIDGES,
    rocks: ROCKS,
    quarry: QUARRY,
    villageProps: VILLAGE_PROPS,
    cemetery: CEMETERY,
    monsters: MONSTERS,
    farmPlots: FARM_PLOTS,
  }),
);
await writeFile(
  new URL('world-tiles.svg', dir),
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="32">${['#426747', '#a49470', '#72503c', '#397c89', '#354e38'].map((fill, i) => `<rect x="${i * 32}" width="32" height="32" fill="${fill}"/>`).join('')}</svg>`,
);
