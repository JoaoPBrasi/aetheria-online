import {
  CRAFTING_STATIONS,
  IRON_BLADE_QUEST,
  IRON_BLADE_SCOUTS,
  MONSTERS,
  NPCS,
  QUARRY_RESOURCES,
  TILE_SIZE,
  TUTORIAL_QUEST,
  FARM_HARVEST_QUEST,
  FARM_RANGE,
  plotPosition,
  cropStatus,
  cropStatusLabel,
  farmInteraction,
  type FarmSnapshot,
  hasTool,
  type CharacterQuestState,
  type GameplaySnapshot,
  type ItemId,
} from '@aetheria/shared';

type Point = { x: number; y: number };
type GuideStep = {
  title: string;
  hint: string;
  target: Point;
  mapMarker?: 'farm';
};
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
const furnace = CRAFTING_STATIONS.find(
  (station) => station.type === 'furnace',
)!;
const forge = CRAFTING_STATIONS.find((station) => station.type === 'forge')!;
const quarry = QUARRY_RESOURCES.find((node) => node.kind === 'ore')!;
const scout = MONSTERS.find((monster) => monster.id === IRON_BLADE_SCOUTS[0])!;
const grove = { x: 592, y: 720 };
const garden = { x: 432, y: 1328 };

function harvestStep(
  quest: CharacterQuestState,
  gameplay: GameplaySnapshot,
  plots: FarmSnapshot[],
  position: Point,
  now: number,
): GuideStep {
  if (quest.status === 'ready_to_turn_in')
    return {
      title: 'Volte ao Ancião Eldrin',
      hint: 'Entregue A Primeira Colheita de Brumavale.',
      target: eldrin,
    };

  const owned = plots.filter((p) => p.ownerId === gameplay.characterId);
  const rank = (p: FarmSnapshot) =>
    ({ ready: 0, thirsty: 1, growing: 2, prepared: 3, empty: 4 })[
      cropStatus(p, now)
    ];
  const distance = (p: FarmSnapshot) => {
    const { x, y } = plotPosition(p);
    return Math.hypot(x - position.x, y - position.y);
  };
  const plot =
    [...owned].sort(
      (a, b) =>
        Number(b.cropId === 'turnip') - Number(a.cropId === 'turnip') ||
        rank(a) - rank(b) ||
        distance(a) - distance(b),
    )[0] ??
    plots
      .filter((p) => !p.ownerId)
      .sort((a, b) => distance(a) - distance(b))[0];
  if (!plot)
    return {
      title: 'Vá à Horta de Brumavale',
      hint: 'Siga o marcador da horta no minimapa e procure terra livre.',
      target: garden,
      mapMarker: 'farm',
    };

  const target = plotPosition(plot);
  const action = farmInteraction(
    gameplay,
    plot,
    plots,
    position,
    now,
    'turnip',
  );
  const label = 'Parcela ' + plot.id.split('-').at(-1);
  const state = cropStatus(plot, now);
  const hint =
    action.distance > FARM_RANGE
      ? `Siga o marcador da horta no minimapa até a ${label.toLowerCase()}.`
      : (action.reason ??
        (state === 'growing'
          ? 'Confira o tempo aqui ou no painel H. A planta continua crescendo ao sair.'
          : plot.cropId === 'pumpkin'
            ? 'Termine o cultivo da abóbora ou prepare outra parcela para plantar nabo.'
            : state === 'prepared'
              ? 'Pressione E ou clique para escolher sementes de nabo. Depois regue.'
              : 'Pressione E ou clique na parcela.'));
  return {
    title: state === 'growing' ? cropStatusLabel(plot, now) : action.label,
    hint,
    target,
    mapMarker: 'farm',
  };
}

function viaBridge(step: GuideStep, position: Point): GuideStep {
  const east = position.x >= 2130 || (position.y < 620 && position.x >= 1920);
  const targetEast = step.target.x >= 2130;
  if (east === targetEast) return step;

  const onRoad = Math.abs(position.y - 1040) <= 45;
  const hint = `Cruze a ponte a leste da vila. ${step.hint}`;
  if (targetEast)
    return {
      ...step,
      hint,
      target: { x: onRoad ? 2224 : Math.min(position.x, 1712), y: 1040 },
    };
  return { ...step, hint, target: { x: onRoad ? 1712 : 2224, y: 1040 } };
}

function ironBladeStep(
  quest: CharacterQuestState | undefined,
  gameplay?: GameplaySnapshot,
): GuideStep {
  if (!quest)
    return {
      title: 'Nova missão: A Primeira Lâmina de Ferro',
      hint: 'Fale com o Ancião Eldrin para aceitar.',
      target: eldrin,
    };
  if (quest.status === 'ready_to_turn_in')
    return {
      title: 'Volte ao Ancião Eldrin',
      hint: 'Entregue A Primeira Lâmina de Ferro para receber 60 XP de Guerreiro.',
      target: eldrin,
    };

  if (
    gameplay &&
    hasTool(gameplay, 'iron_sword') &&
    (quest.progress.forge_blade ?? 0) > 0
  )
    return {
      title: 'Derrote um Orc Batedor',
      hint: 'Equipe a espada de ferro e recue quando o orc anunciar o golpe.',
      target: { x: scout.spawnX, y: scout.spawnY },
    };

  const quantity = (item: ItemId) =>
    gameplay?.inventory.reduce(
      (sum, slot) => sum + (slot.itemId === item ? slot.quantity : 0),
      0,
    ) ?? 0;
  const missingIngots = Math.max(0, 2 - quantity('iron_ingot'));
  if (quantity('iron_ore') < missingIngots * 2)
    return {
      title: 'Minere ferro na Pedreira do Lago',
      hint: 'Siga ao norte pela estrada depois da ponte. Leve uma picareta.',
      target: quarry,
    };
  const needsCharcoal = quantity('charcoal') < missingIngots;
  if (quantity('wood') < (needsCharcoal ? 3 : 1))
    return {
      title: 'Corte madeira no Bosque Antigo',
      hint: needsCharcoal
        ? 'Separe duas madeiras para o carvão e uma para o cabo.'
        : 'Separe uma madeira para o cabo da espada.',
      target: grove,
    };
  if (needsCharcoal)
    return {
      title: 'Faça carvão vegetal na Fornalha',
      hint: 'Transforme duas madeiras em dois carvões.',
      target: furnace,
    };
  if (missingIngots)
    return {
      title: 'Funda ferro na Fornalha',
      hint:
        missingIngots === 1
          ? 'Falta um lingote para a espada.'
          : 'Faça dois lingotes para a espada.',
      target: furnace,
    };
  return {
    title: 'Forje a espada de ferro',
    hint: 'Use dois lingotes e uma madeira na Forja do Ferreiro.',
    target: forge,
  };
}

export function soloGuide(
  quests: CharacterQuestState[],
  position: Point,
  hidden: string[],
  gameplay?: GameplaySnapshot,
  plots: FarmSnapshot[] = [],
  now = 0,
) {
  const harvest = quests.find(
    (entry) => entry.questId === FARM_HARVEST_QUEST.id,
  );
  if (
    gameplay &&
    harvest &&
    (harvest.status === 'in_progress' ||
      harvest.status === 'ready_to_turn_in') &&
    !hidden.includes(harvest.questId)
  )
    return guideWithDirection(
      harvestStep(harvest, gameplay, plots, position, now),
      position,
    );
  const quest = quests.find((entry) => entry.questId === TUTORIAL_QUEST.id);
  if (quest?.status === 'completed') {
    const next = quests.find((entry) => entry.questId === IRON_BLADE_QUEST.id);
    if (next?.status === 'completed' || hidden.includes(IRON_BLADE_QUEST.id))
      return;
    return guideWithDirection(
      viaBridge(ironBladeStep(next, gameplay), position),
      position,
    );
  }
  if (hidden.includes(TUTORIAL_QUEST.id)) return;

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
      target = grove;
    } else {
      title = 'Fabrique tábuas na Bancada';
      hint = 'Na Praça, use a Bancada de Trabalho para fabricar 2 tábuas.';
      target = bench;
    }
  }
  return guideWithDirection({ title, hint, target }, position);
}

function guideWithDirection(
  { title, hint, target, mapMarker }: GuideStep,
  position: Point,
) {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.hypot(dx, dy);
  const [arrow, direction] =
    directions[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8]!;
  return {
    title,
    hint,
    mapMarker,
    route:
      distance < 72
        ? 'Por aqui'
        : `${arrow} ${direction} · ${Math.ceil(distance / TILE_SIZE)} tiles`,
  };
}
