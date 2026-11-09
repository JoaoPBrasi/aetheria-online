import { PROFESSIONS } from '../constants/index.js';
export const INITIAL_SKILLS = PROFESSIONS.map((profession) => ({
  profession,
  xp: 0,
}));
export const FARM_PLOTS = Array.from({ length: 16 }, (_, i) => ({
  id: `brumavale-farm-${i + 1}`,
  mapId: 'brumavale',
  tileX: 10 + (i % 4) * 2,
  tileY: 38 + Math.floor(i / 4) * 2,
}));
