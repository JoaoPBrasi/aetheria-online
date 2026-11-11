import {
  ITEMS,
  RESOURCES,
  treeStage,
  CRAFTING_STATIONS,
  MONSTERS,
  type GameplaySnapshot,
  type ItemId,
  type CraftingStationType,
  type MonsterSnapshot,
  type ResourceStates,
  type ForageNode,
} from './gameplay.js';
import { cropStatus, type FarmSnapshot, type CropId } from './farming.js';
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
      x: p.tileX * 32 + 16,
      y: p.tileY * 32 + 16,
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
  if (!chosen || chosen.distance > 72) return undefined;
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
