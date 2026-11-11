import {
  ITEMS,
  RESOURCES,
  treeStage,
  CRAFTING_STATIONS,
  CRAFTING_INTERACTION_RANGE,
  MONSTERS,
  PLAYER_ATTACK_RANGE,
  addItem,
  type GameplaySnapshot,
  type ItemId,
  type CraftingStationType,
  type MonsterSnapshot,
  type ResourceStates,
  type ForageNode,
} from './gameplay.js';
import {
  CROPS,
  FARM_RANGE,
  MAX_OWNED_PLOTS,
  HARVEST_YIELD,
  plotPosition,
  cropStatus,
  cropStatusLabel,
  type FarmSnapshot,
  type CropId,
} from './farming.js';
import { NPCS, type NPCDefinition } from './npcs.js';
export function hasTool(
  s: Pick<GameplaySnapshot, 'inventory' | 'equipment'>,
  tool: ItemId,
) {
  const matches = (itemId: ItemId) =>
    itemId === tool || (tool === 'axe' && itemId === 'iron_axe');
  return (
    s.inventory.some((i) => matches(i.itemId) && i.quantity > 0) ||
    s.equipment.some((i) => matches(i.itemId))
  );
}

export function seedCount(s: GameplaySnapshot, crop: CropId) {
  return s.inventory.reduce(
    (sum, slot) => sum + (slot.itemId === CROPS[crop].seed ? slot.quantity : 0),
    0,
  );
}

export function nearbyFarmTarget(
  plots: FarmSnapshot[],
  id: string | undefined,
  position: { x: number; y: number },
) {
  const plot = plots.find((p) => p.id === id);
  if (!plot) return;
  const { x, y } = plotPosition(plot);
  if (Math.hypot(x - position.x, y - position.y) <= FARM_RANGE) return plot.id;
}

export function farmInteraction(
  s: GameplaySnapshot,
  p: FarmSnapshot,
  plots: FarmSnapshot[],
  position: { x: number; y: number } | undefined,
  now: number,
  crop: CropId,
) {
  const point = plotPosition(p);
  const distance = position
    ? Math.hypot(point.x - position.x, point.y - position.y)
    : Infinity;
  const state = cropStatus(p, now);
  const operation = {
    empty: 'prepare',
    prepared: 'plant',
    thirsty: 'water',
    ready: 'harvest',
    growing: undefined,
  }[state];
  const name = p.cropId ? CROPS[p.cropId].name.toLocaleLowerCase('pt-BR') : '';
  const label = {
    empty: 'Preparar terra',
    prepared: `Plantar ${CROPS[crop].name.toLocaleLowerCase('pt-BR')}`,
    thirsty: `Regar ${name}`,
    ready: `Colher ${name}`,
    growing: cropStatusLabel(p, now),
  }[state];
  let reason: string | undefined;
  if (distance > FARM_RANGE) reason = 'Aproxime-se da parcela';
  else if (p.ownerId && p.ownerId !== s.characterId)
    reason = 'Parcela de outro jogador';
  else if (state === 'empty' && !hasTool(s, 'hoe'))
    reason = 'Enxada necessária na mochila';
  else if (
    state === 'empty' &&
    !p.ownerId &&
    plots.filter((plot) => plot.ownerId === s.characterId).length >=
      MAX_OWNED_PLOTS
  )
    reason = 'Limite de quatro parcelas';
  else if (state === 'prepared' && seedCount(s, crop) === 0)
    reason = `Sem sementes de ${CROPS[crop].name.toLocaleLowerCase('pt-BR')}`;
  else if (state === 'thirsty' && !hasTool(s, 'watering_can'))
    reason = 'Regador necessário na mochila';
  else if (state === 'ready' && p.cropId) {
    const plant = CROPS[p.cropId];
    try {
      addItem(
        addItem(s.inventory, plant.item, HARVEST_YIELD.produce),
        plant.seed,
        HARVEST_YIELD.seeds,
      );
    } catch {
      reason = 'Mochila cheia para a colheita';
    }
  }
  return {
    label,
    reason,
    enabled: !!operation && !reason,
    distance,
    payload: {
      kind: 'farm',
      plot: p.id,
      operation,
      ...(operation === 'plant' ? { crop } : {}),
    },
  };
}
export function interaction(
  s: GameplaySnapshot,
  position: { x: number; y: number },
  plots: FarmSnapshot[],
  resources: ResourceStates,
  now: number,
  crop: CropId,
  target?: string,
  monsters: MonsterSnapshot[] = [],
  forage: ForageNode[] = [],
) {
  const candidates = [
    ...[...RESOURCES, ...forage].map((r) => ({
      id: r.id,
      x: r.x,
      y: r.y,
      name: r.name,
      node: r,
      plot: undefined as FarmSnapshot | undefined,
      station: undefined as
        { id: string; name: string; type: CraftingStationType } | undefined,
      monster: undefined as MonsterSnapshot | undefined,
      npc: undefined as NPCDefinition | undefined,
    })),
    ...plots.map((p) => ({
      id: p.id,
      ...plotPosition(p),
      name: 'Parcela ' + p.id.split('-').at(-1),
      node: undefined,
      plot: p,
      station: undefined as
        { id: string; name: string; type: CraftingStationType } | undefined,
      monster: undefined as MonsterSnapshot | undefined,
      npc: undefined as NPCDefinition | undefined,
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
      npc: undefined as NPCDefinition | undefined,
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
          npc: undefined as NPCDefinition | undefined,
        };
      }),
    ...NPCS.map((npc) => ({
      id: npc.id,
      x: npc.x,
      y: npc.y,
      name: npc.name,
      node: undefined,
      plot: undefined,
      station: undefined,
      monster: undefined,
      npc,
    })),
  ];
  const chosen = candidates
    .filter((c) => !target || c.id === target)
    .map((c) => ({
      ...c,
      distance: Math.hypot(c.x - position.x, c.y - position.y),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (!chosen) return undefined;
  const maxRange = chosen.station
    ? CRAFTING_INTERACTION_RANGE
    : chosen.plot
      ? FARM_RANGE
      : 72;
  if (chosen.distance > maxRange && !(target && chosen.plot)) return undefined;
  let label = '',
    tool: ItemId | undefined,
    enabled = true,
    payload: Record<string, unknown> = {};
  if (chosen.node) {
    const r = chosen.node;
    tool = r.tool;
    label = r.kind === 'tree' ? 'Cortar ' + r.name : 'Coletar ' + r.name;
    payload = { kind: 'gather', node: r.id };
    const state = resources[r.id];
    if (state && state.readyAt > now) {
      enabled = false;
      if (r.kind === 'tree') {
        const stage =
          treeStage(state, now) === 'seedling' ? 'Muda' : 'Árvore jovem';
        label = `${stage} · ${Math.ceil((state.readyAt - now) / 1000)} s até amadurecer`;
      } else label = 'Recurso se recuperando';
    }
  } else if (chosen.plot) {
    const farm = farmInteraction(s, chosen.plot, plots, position, now, crop);
    label = farm.reason ?? farm.label;
    enabled = farm.enabled;
    payload = farm.payload;
  } else if (chosen.station) {
    label = 'Usar ' + chosen.station.name;
    payload = {
      kind: 'open_crafting',
      stationId: chosen.station.id,
      stationType: chosen.station.type,
    };
  } else if (chosen.monster) {
    label = `Atacar ${chosen.name} (${chosen.monster.health}/${chosen.monster.maxHealth} HP)`;
    if (chosen.distance > PLAYER_ATTACK_RANGE) {
      enabled = false;
      label = 'Aproxime-se para atacar';
    }
    payload = {
      kind: 'attack',
      targetId: chosen.monster.id,
    };
  } else if (chosen.npc) {
    label = 'Conversar com ' + chosen.npc.name;
    payload = {
      kind: 'open_dialogue',
      npcId: chosen.npc.id,
    };
  }
  if (enabled && tool && !hasTool(s, tool)) {
    enabled = false;
    label =
      (tool === 'axe' ? 'Machado' : ITEMS[tool].name) +
      ' necessário para esta ação';
  }
  return { ...chosen, label, enabled, payload, tool };
}
