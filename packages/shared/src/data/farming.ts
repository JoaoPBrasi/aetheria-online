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
