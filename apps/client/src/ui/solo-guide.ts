import {
  CRAFTING_STATIONS,
  NPCS,
  TILE_SIZE,
  TUTORIAL_QUEST,
  type CharacterQuestState,
} from '@aetheria/shared';

type Point = { x: number; y: number };
const directions = [
  ['→', 'Leste'],
  ['↘', 'Sudeste'],
  ['↓', 'Sul'],
  ['↙', 'Sudoeste'],
  ['←', 'Oeste'],
  ['↖', 'Noroeste'],
  ['↑', 'Norte'],
  ['↗', 'Nordeste'],
] as const;
const eldrin = NPCS[0]!;
const bench = CRAFTING_STATIONS.find(
  (station) => station.type === 'workbench',
)!;

export function soloGuide(
  quests: CharacterQuestState[],
  position: Point,
  hidden: string[],
) {
  const quest = quests.find((entry) => entry.questId === TUTORIAL_QUEST.id);
  if (quest?.status === 'completed' || hidden.includes(TUTORIAL_QUEST.id))
    return;

  let title = 'Fale com o Ancião Eldrin';
  let hint = 'Aproxime-se e pressione E para começar.';
  let target: Point = eldrin;
  if (quest?.status === 'ready_to_turn_in') {
    title = 'Volte ao Ancião Eldrin';
    hint = 'Entregue a missão para receber sua recompensa.';
  } else if (quest?.status === 'in_progress') {
    if ((quest.progress.defeat_slimes ?? 0) < 2) {
      title = 'Vá ao Prado dos Slimes';
      hint = 'Ataque com E ou clique no slime. Recue do círculo de perigo.';
      target = { x: 1568, y: 1672 };
      if (position.y < 1150 && position.x < 1640) {
        hint = 'Siga pela estrada a leste até o Acampamento do Bosque.';
        target = { x: 1680, y: 1040 };
      } else if (position.y < 1472) {
        hint = 'Desça pelo acampamento para chegar ao prado.';
        target = { x: 1680, y: 1504 };
      }
    } else if ((quest.progress.gather_wood ?? 0) < 5) {
      title = 'Corte carvalhos no Bosque Antigo';
      hint = 'Leve o machado na mochila e corte as árvores adultas.';
      target = { x: 592, y: 720 };
    } else {
      title = 'Fabrique tábuas na Bancada';
      hint = 'Na Praça, use a Bancada de Trabalho para fabricar 2 tábuas.';
      target = bench;
    }
  }
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.hypot(dx, dy);
  const [arrow, direction] =
    directions[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8]!;
  return {
    title,
    hint,
    route:
      distance < 72
        ? 'Por aqui'
        : `${arrow} ${direction} · ${Math.ceil(distance / TILE_SIZE)} tiles`,
  };
}
