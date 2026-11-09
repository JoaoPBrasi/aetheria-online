import { expect, it } from 'vitest';
import { CROPS, cropStatus, type FarmSnapshot } from './farming.js';
it('uses persisted watering deadlines for both crops and exact harvest boundary', () => {
  const p: FarmSnapshot = {
    id: 'p',
    tileX: 10,
    tileY: 38,
    ownerId: 'a',
    prepared: true,
    cropId: 'turnip',
    plantedAt: 1000,
    wateredAt: null,
    harvestAt: null,
  };
  expect(cropStatus(p, 999999)).toBe('thirsty');
  p.wateredAt = 2000;
  p.harvestAt = 2000 + CROPS.turnip.growMs;
  expect(cropStatus(p, 61999)).toBe('growing');
  expect(cropStatus(p, 62000)).toBe('ready');
  expect(CROPS.pumpkin.growMs).toBe(120000);
});
