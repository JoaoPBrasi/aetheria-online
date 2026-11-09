import {
  ITEMS,
  RESOURCES,
  CRAFTING_STATIONS,
  MONSTERS,
  type GameplaySnapshot,
  type ItemId,
  type CraftingStationType,
  type MonsterSnapshot,
} from './gameplay.js';
import { cropStatus, type FarmSnapshot, type CropId } from './farming.js';
export function hasTool(
  s: Pick<GameplaySnapshot, 'inventory' | 'equipment'>,
  tool: ItemId,
) {
  return (
    s.inventory.some((i) => i.itemId === tool && i.quantity > 0) ||
    s.equipment.some((i) => i.itemId === tool)
  );
}
export function interaction(
  s: GameplaySnapshot,
  position: { x: number; y: number },
  plots: FarmSnapshot[],
  cooldowns: Record<string, number>,
  now: number,
  crop: CropId,
  target?: string,
  monsters: MonsterSnapshot[] = [],
) {
  const candidates = [
    ...RESOURCES.map((r) => ({
      id: r.id,
      x: r.x,
      y: r.y,
      name: r.name,
      node: r,
      plot: undefined as FarmSnapshot | undefined,
      station: undefined as
        { id: string; name: string; type: CraftingStationType } | undefined,
      monster: undefined as MonsterSnapshot | undefined,
    })),
    ...plots.map((p) => ({
      id: p.id,
      x: p.tileX * 32 + 16,
      y: p.tileY * 32 + 16,
      name: 'Parcela ' + p.id.split('-').at(-1),
      node: undefined,
      plot: p,
      station: undefined as
        { id: string; name: string; type: CraftingStationType } | undefined,
      monster: undefined as MonsterSnapshot | undefined,
    })),
    ...CRAFTING_STATIONS.map((st) => ({
      id: st.id,
      x: st.x,
      y: st.y,
      name: st.name,
      node: undefined,
      plot: undefined,
      station: st,
      monster: undefined as MonsterSnapshot | undefined,
    })),
    ...monsters
      .filter((m) => m.state !== 'dead')
      .map((m) => {
        const def = MONSTERS.find((d) => d.id === m.id);
        return {
          id: m.id,
          x: m.x,
          y: m.y,
          name: def?.name ?? 'Monstro',
          node: undefined,
          plot: undefined,
          station: undefined,
          monster: m,
        };
      }),
  ];
  const chosen = candidates
    .filter((c) => !target || c.id === target)
    .map((c) => ({
      ...c,
      distance: Math.hypot(c.x - position.x, c.y - position.y),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (!chosen || chosen.distance > 72) return undefined;
  let label = '',
    tool: ItemId | undefined,
    enabled = true,
    payload: Record<string, unknown> = {};
  if (chosen.node) {
    const r = chosen.node;
    tool = r.tool;
    label = 'Coletar ' + r.name;
    payload = { kind: 'gather', node: r.id };
    if ((cooldowns[r.id] ?? 0) > now) {
      enabled = false;
      label = 'Recurso se recuperando';
    }
  } else if (chosen.plot) {
    const p = chosen.plot,
      status = cropStatus(p, now);
    payload = { kind: 'farm', plot: p.id };
    if (p.ownerId && p.ownerId !== s.characterId) {
      enabled = false;
      label = 'Parcela de outro jogador';
    } else if (status === 'empty') {
      tool = 'hoe';
      label = 'Preparar terra';
      payload.operation = 'prepare';
    } else if (status === 'prepared') {
      label = 'Plantar';
      payload.operation = 'plant';
      payload.crop = crop;
    } else if (status === 'thirsty') {
      tool = 'watering_can';
      label = 'Regar';
      payload.operation = 'water';
    } else if (status === 'ready') {
      label = 'Colher';
      payload.operation = 'harvest';
    } else {
      enabled = false;
      label =
        'Crescendo · ' +
        Math.max(0, Math.ceil(((p.harvestAt ?? 0) - now) / 1000)) +
        ' s';
    }
  } else if (chosen.station) {
    label = 'Usar ' + chosen.station.name;
    payload = {
      kind: 'open_crafting',
      stationId: chosen.station.id,
      stationType: chosen.station.type,
    };
  } else if (chosen.monster) {
    label = `Atacar ${chosen.name} (${chosen.monster.health}/${chosen.monster.maxHealth} HP)`;
    payload = {
      kind: 'attack',
      targetId: chosen.monster.id,
    };
  }
  if (tool && !hasTool(s, tool)) {
    enabled = false;
    label = ITEMS[tool].name + ' necessária na mochila';
  }
  return { ...chosen, label, enabled, payload, tool };
}
