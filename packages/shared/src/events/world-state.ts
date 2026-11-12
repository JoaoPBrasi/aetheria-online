import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
import { BASE_MOVEMENT_SPEED } from '../data/attributes.js';
export class PlayerPresence extends Schema {
  declare characterId: string;
  declare name: string;
  declare x: number;
  declare y: number;
  declare ack: number;
  declare connected: boolean;
  declare direction: string;
  declare appearance: string;
  declare clothingColor: string;
  declare hairColor: string;
  declare skinColor: string;
  declare hairStyle: string;
  declare health: number;
  declare maxHealth: number;
  declare movementSpeed: number;
  constructor() {
    super();
    this.characterId = '';
    this.name = '';
    this.x = 1040;
    this.y = 1040;
    this.ack = 0;
    this.connected = true;
    this.direction = 'down';
    this.appearance = 'sage';
    this.clothingColor = '#c4d597';
    this.hairColor = '#59422f';
    this.skinColor = '#e1b68c';
    this.hairStyle = 'short';
    this.health = 100;
    this.maxHealth = 100;
    this.movementSpeed = BASE_MOVEMENT_SPEED;
  }
}
defineTypes(PlayerPresence, {
  characterId: 'string',
  name: 'string',
  x: 'float64',
  y: 'float64',
  ack: 'uint32',
  connected: 'boolean',
  direction: 'string',
  appearance: 'string',
  clothingColor: 'string',
  hairColor: 'string',
  skinColor: 'string',
  hairStyle: 'string',
  health: 'int32',
  maxHealth: 'int32',
  movementSpeed: 'float64',
});
export class WorldState extends Schema {
  declare mapId: string;
  declare players: MapSchema<PlayerPresence>;
  constructor() {
    super();
    this.mapId = 'brumavale';
    this.players = new MapSchema<PlayerPresence>();
  }
}
defineTypes(WorldState, { mapId: 'string', players: { map: PlayerPresence } });
