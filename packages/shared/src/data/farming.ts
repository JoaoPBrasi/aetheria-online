import { TILE_SIZE } from '../constants/index.js';

export const CROPS = {
  turnip: { name: 'Nabo', seed: 'turnip_seed', item: 'turnip', growMs: 60000 },
  pumpkin: {
    name: 'Abóbora',
    seed: 'pumpkin_seed',
    item: 'pumpkin',
    growMs: 120000,
  },
} as const;
export type CropId = keyof typeof CROPS;
export const FARM_RANGE = 72;
export const MAX_OWNED_PLOTS = 4;
export const HARVEST_YIELD = { produce: 3, seeds: 2 } as const;
export interface FarmSnapshot {
  id: string;
  tileX: number;
  tileY: number;
  ownerId: string | null;
  prepared: boolean;
  cropId: CropId | null;
  plantedAt: number | null;
  wateredAt: number | null;
  harvestAt: number | null;
}
export function cropStatus(plot: FarmSnapshot, now: number) {
  if (!plot.cropId) return plot.prepared ? 'prepared' : 'empty';
  if (!plot.wateredAt || !plot.harvestAt) return 'thirsty';
  return now >= plot.harvestAt ? 'ready' : 'growing';
}

export function plotPosition(plot: Pick<FarmSnapshot, 'tileX' | 'tileY'>) {
  return {
    x: (plot.tileX + 0.5) * TILE_SIZE,
    y: (plot.tileY + 0.5) * TILE_SIZE,
  };
}

export function cropStatusLabel(plot: FarmSnapshot, now: number) {
  const state = cropStatus(plot, now);
  if (state === 'growing')
    return `Crescendo · ${Math.max(0, Math.ceil(((plot.harvestAt ?? 0) - now) / 1000))} s`;
  return {
    empty: 'Terra livre para preparar',
    prepared: 'Terra preparada',
    thirsty: 'Aguardando rega',
    ready: 'Pronta para colher',
  }[state];
}
