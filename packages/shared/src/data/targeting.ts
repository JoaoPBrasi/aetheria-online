import { MONSTERS, type MonsterSnapshot } from './gameplay.js';
import { NPCS, type NPCDefinition } from './npcs.js';

export type TargetKind = 'monster' | 'npc';

export interface SelectedTarget {
  id: string;
  kind: TargetKind;
  name: string;
  health: number;
  maxHealth: number;
  level: number;
  x: number;
  y: number;
  distance?: number;
  hostile: boolean;
  state?: string;
}

/**
 * Obtém os dados completos e reativos de um alvo selecionado (Monstro ou NPC).
 */
export function getSelectedTarget(
  monsters: MonsterSnapshot[],
  npcs: readonly NPCDefinition[] = NPCS,
  targetId?: string | null,
  playerPosition?: { x: number; y: number },
): SelectedTarget | null {
  if (!targetId) return null;

  // Busca em monstros vivos
  const monster = monsters.find(
    (m) => m.id === targetId && m.state !== 'dead' && m.health > 0,
  );
  if (monster) {
    const def = MONSTERS.find((d) => d.id === monster.id);
    const distance = playerPosition
      ? Math.hypot(monster.x - playerPosition.x, monster.y - playerPosition.y)
      : undefined;
    const level = def?.kind === 'skeleton' ? 3 : def?.kind === 'orc' ? 2 : 1;
    return {
      id: monster.id,
      kind: 'monster',
      name: def?.name ?? 'Monstro',
      health: monster.health,
      maxHealth: monster.maxHealth,
      level,
      x: monster.x,
      y: monster.y,
      distance,
      hostile: true,
      state: monster.state,
    };
  }

  // Busca em NPCs conhecidos
  const npc = npcs.find((n) => n.id === targetId);
  if (npc) {
    const distance = playerPosition
      ? Math.hypot(npc.x - playerPosition.x, npc.y - playerPosition.y)
      : undefined;
    return {
      id: npc.id,
      kind: 'npc',
      name: npc.name,
      health: 100,
      maxHealth: 100,
      level: 10,
      x: npc.x,
      y: npc.y,
      distance,
      hostile: false,
    };
  }

  return null;
}

/**
 * Seleciona ou cicla para o próximo monstro vivo mais próximo do jogador (atalho Tab).
 */
export function cycleNextTarget(
  monsters: MonsterSnapshot[],
  currentTargetId?: string | null,
  playerPosition?: { x: number; y: number },
  maxRange = 360,
): string | null {
  const liveMonsters = monsters
    .filter((m) => m.state !== 'dead' && m.health > 0)
    .map((m) => {
      const distance = playerPosition
        ? Math.hypot(m.x - playerPosition.x, m.y - playerPosition.y)
        : 0;
      return { ...m, distance };
    })
    .filter((m) => !playerPosition || m.distance <= maxRange)
    .sort((a, b) => a.distance - b.distance);

  if (liveMonsters.length === 0) return null;

  if (!currentTargetId) {
    return liveMonsters[0]!.id;
  }

  const currentIndex = liveMonsters.findIndex((m) => m.id === currentTargetId);
  if (currentIndex === -1) {
    return liveMonsters[0]!.id;
  }

  const nextIndex = (currentIndex + 1) % liveMonsters.length;
  return liveMonsters[nextIndex]!.id;
}
