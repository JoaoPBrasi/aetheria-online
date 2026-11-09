import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
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
