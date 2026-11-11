import { z } from 'zod';
import type { GameplaySnapshot, ItemId } from './gameplay.js';
import type { NpcId } from './npcs.js';

export const TUTORIAL_QUEST_ID = 'tutorial_first_steps';
export const IRON_BLADE_QUEST_ID = 'first_iron_blade';
export const FARM_HARVEST_QUEST_ID = 'farm_first_harvest';
export const CEMETERY_WATCHERS_QUEST_ID = 'cemetery_watchers';
export const IRON_BLADE_SCOUTS = ['orc-1', 'orc-3'] as const;
export const CEMETERY_SKELETONS = ['skeleton-1', 'skeleton-2'] as const;

export const QUEST_STATUSES = [
  'not_started',
  'in_progress',
  'ready_to_turn_in',
  'completed',
] as const;

export type QuestStatus = (typeof QUEST_STATUSES)[number];

export const QuestStatusSchema = z.enum(QUEST_STATUSES);

export type QuestObjectiveType = 'gather' | 'craft' | 'defeat';

export interface QuestObjective {
  id: string;
  type: QuestObjectiveType;
  targetId: string;
  description: string;
  required: number;
  monsterIds?: readonly string[];
  weapon?: ItemId;
  after?: string;
}

export interface QuestReward {
  xp: {
    profession: string;
    amount: number;
  };
  items: {
    itemId: ItemId;
    quantity: number;
  }[];
}

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  giverNpcId: NpcId;
  dialogues: {
    offer: string;
    inProgress: string;
    readyToTurnIn: string;
    completed: string;
  };
  objectives: QuestObjective[];
  startingItem?: ItemId;
  requires?: string;
  rewards: QuestReward;
}

export const TUTORIAL_QUEST: QuestDefinition = {
  id: TUTORIAL_QUEST_ID,
  title: 'Primeiros Passos em Brumavale',
  description:
    'O Ancião Eldrin pediu que você aprenda os fundamentos de sobrevivência: colha madeira, fabrique tábuas e derrote slimes que ameaçam a vila.',
  giverNpcId: 'elder-eldrin',
  startingItem: 'sword',
  dialogues: {
    offer:
      'Leve esta espada de treino. Siga pela estrada a leste e desça pelo acampamento até o Prado dos Slimes. Derrote 2 slimes, corte 5 madeiras no Bosque Antigo e fabrique 2 tábuas na Bancada.',
    inProgress:
      'Ataque com E ou clique no slime. Quando aparecer um círculo, recue até o golpe passar. Lembre-se: basta ter o machado na mochila para cortar madeira e a espada de treino para atacar com ela.',
    readyToTurnIn:
      'Extraordinário! Você cumpriu os objetivos. Conclua a missão para receber 50 XP de Guerreiro, 5 sementes de nabo e 2 de abóbora.',
    completed:
      'Você já domina o básico. Tenho um novo desafio: forjar sua primeira lâmina de ferro e testá-la contra um Orc Batedor.',
  },
  objectives: [
    {
      id: 'defeat_slimes',
      type: 'defeat',
      targetId: 'slime',
      description: 'Derrotar slimes no Prado dos Slimes',
      required: 2,
    },
    {
      id: 'gather_wood',
      type: 'gather',
      targetId: 'wood',
      description: 'Cortar carvalhos no Bosque Antigo para coletar madeira',
      required: 5,
    },
    {
      id: 'craft_planks',
      type: 'craft',
      targetId: 'plank',
      description: 'Fabricar tábuas de madeira na Bancada',
      required: 2,
    },
  ],
  rewards: {
    xp: {
      profession: 'warrior',
      amount: 50,
    },
    items: [
      { itemId: 'turnip_seed', quantity: 5 },
      { itemId: 'pumpkin_seed', quantity: 2 },
    ],
  },
};

export const IRON_BLADE_QUEST: QuestDefinition = {
  id: IRON_BLADE_QUEST_ID,
  title: 'A Primeira Lâmina de Ferro',
  description:
    'Minere minério de ferro na Pedreira do Lago, funda lingotes na Fornalha, forje sua espada e use-a para derrotar um Orc Batedor.',
  giverNpcId: 'elder-eldrin',
  requires: TUTORIAL_QUEST_ID,
  dialogues: {
    offer:
      'As ameaças do outro lado do rio aumentam a cada dia, e sua espada de madeira não deterá os orcs. Cruze a ponte a leste e suba até a Pedreira do Lago para minerar ferro. Leve carvão à Fornalha para fundir 2 lingotes, forje uma Espada de Ferro na Forja e derrote um Orc Batedor para provar seu valor!',
    inProgress:
      'Você precisará de 4 minérios de ferro e 2 carvões vegetais para fazer os 2 lingotes na Fornalha. Na Forja, combine-os com 1 madeira. Com a espada em mãos, procure os Orcs Batedores no acampamento a leste.',
    readyToTurnIn:
      'Excelente bravura! Sinto a têmpera do ferro e o cheiro da batalha vencida. Conclua a missão para receber seu reconhecimento de guerreiro.',
    completed:
      'Agora você sabe transformar o minério bruto em armas resistentes. Os invasores pensarão duas vezes antes de desafiar Brumavale.',
  },
  objectives: [
    {
      id: 'gather_iron',
      type: 'gather',
      targetId: 'iron_ore',
      description: 'Obter minério de ferro na Pedreira do Lago',
      required: 4,
    },
    {
      id: 'smelt_iron',
      type: 'craft',
      targetId: 'iron_ingot',
      description: 'Obter lingotes de ferro na Fornalha',
      required: 2,
    },
    {
      id: 'forge_blade',
      type: 'craft',
      targetId: 'iron_sword',
      description: 'Obter uma espada de ferro na Forja',
      required: 1,
    },
    {
      id: 'defeat_scout',
      type: 'defeat',
      targetId: 'orc',
      description: 'Derrotar um Orc Batedor com a espada de ferro',
      required: 1,
      monsterIds: IRON_BLADE_SCOUTS,
      weapon: 'iron_sword',
      after: 'forge_blade',
    },
  ],
  rewards: {
    xp: { profession: 'warrior', amount: 60 },
    items: [
      { itemId: 'charcoal', quantity: 5 },
      { itemId: 'plank', quantity: 5 },
    ],
  },
};

export const FARM_HARVEST_QUEST: QuestDefinition = {
  id: FARM_HARVEST_QUEST_ID,
  title: 'A Primeira Colheita de Brumavale',
  description:
    'Use suas ferramentas de cultivo para arar a terra, plantar sementes de nabo, regá-las e colher vegetais frescos na horta comunitária da vila.',
  giverNpcId: 'elder-eldrin',
  requires: TUTORIAL_QUEST_ID,
  dialogues: {
    offer:
      'A horta fica a sudoeste da Praça, marcada no minimapa. A enxada, o regador e as sementes vêm no kit inicial. Se o kit ainda não coube na mochila, libere espaço e use Atualizar horta / receber kit no painel H. Plante, regue e colha 3 nabos.',
    inProgress:
      'Siga o minimapa até a horta, a sudoeste da Praça. Use a enxada, o regador e as sementes do kit inicial. Se o kit ainda não coube, libere espaço na mochila e solicite-o no painel H. Prepare a terra, plante nabo e regue. Ele amadurece em 60 segundos e a colheita também rende sementes.',
    readyToTurnIn:
      'Que aroma revigorante de vegetais recém-colhidos! O solo de Brumavale é fértil quando cuidado com dedicação. Entregue a missão para receber sementes e experiência de Agricultor.',
    completed:
      'Com este suprimento fresco, garantimos a provisão dos aldeões. Você pode assar os próximos nabos na fogueira da Praça e levá-los para recuperar vida nas suas viagens.',
  },
  objectives: [
    {
      id: 'harvest_turnip',
      type: 'gather',
      targetId: 'turnip',
      description: 'Colher 3 nabos frescos na horta comunitária',
      required: 3,
    },
  ],
  rewards: {
    xp: { profession: 'farmer', amount: 80 },
    items: [
      { itemId: 'turnip_seed', quantity: 10 },
      { itemId: 'pumpkin_seed', quantity: 5 },
    ],
  },
};

export const CEMETERY_WATCHERS_QUEST: QuestDefinition = {
  id: CEMETERY_WATCHERS_QUEST_ID,
  title: 'Os Vigias do Cemitério Antigo',
  description:
    'Esqueletos ancestrais despertaram no Cemitério Antigo ao norte da vila. Elimine 2 Vigias Esquecidos e colha fibras silvestres para reforçar as proteções de Brumavale.',
  giverNpcId: 'elder-eldrin',
  requires: IRON_BLADE_QUEST_ID,
  dialogues: {
    offer:
      'Uma névoa sobrenatural cobriu o Cemitério Antigo, além do lago ao norte. Antigos guardiões esqueletos — os Vigias Esquecidos — levantaram-se de seus túmulos. Com sua espada de ferro, derrote 2 desses vigias e recolha 3 fibras silvestres para renovarmos os laços de proteção.',
    inProgress:
      'Siga para o norte contornando as águas do Lago dos Juncos até avistar as lápides sombrias. Vigias atacam com precisão sombria, mantenha distância quando armarem seus golpes e use a foice nas moitas para recolher fibras silvestres.',
    readyToTurnIn:
      'O silêncio pacífico finalmente voltou às sepulturas antigas. Você provou ser um guardião implacável tanto contra os vivos quanto contra os mortos-vivos!',
    completed:
      'As almas dos antigos fundadores descansam em paz. O reino de Brumavale está mais seguro sob a vigília de sua lâmina de ferro.',
  },
  objectives: [
    {
      id: 'gather_fiber',
      type: 'gather',
      targetId: 'fiber',
      description: 'Coletar 3 fibras silvestres pelo caminho com a foice',
      required: 3,
    },
    {
      id: 'defeat_skeletons',
      type: 'defeat',
      targetId: 'skeleton',
      description: 'Derrotar 2 Vigias Esquecidos no Cemitério Antigo',
      required: 2,
      monsterIds: CEMETERY_SKELETONS,
    },
  ],
  rewards: {
    xp: { profession: 'warrior', amount: 120 },
    items: [
      { itemId: 'iron_ingot', quantity: 2 },
      { itemId: 'plank', quantity: 6 },
    ],
  },
};

export const QUESTS: Record<string, QuestDefinition> = {
  [TUTORIAL_QUEST.id]: TUTORIAL_QUEST,
  [IRON_BLADE_QUEST.id]: IRON_BLADE_QUEST,
  [FARM_HARVEST_QUEST.id]: FARM_HARVEST_QUEST,
  [CEMETERY_WATCHERS_QUEST.id]: CEMETERY_WATCHERS_QUEST,
};

export type QuestId = keyof typeof QUESTS;

export const QuestCommandSchema = z
  .object({
    questId: z.enum([
      TUTORIAL_QUEST_ID,
      IRON_BLADE_QUEST_ID,
      FARM_HARVEST_QUEST_ID,
      CEMETERY_WATCHERS_QUEST_ID,
    ]),
  })
  .strict();

export interface CharacterQuestState {
  questId: QuestId;
  status: QuestStatus;
  progress: Record<string, number>;
  completedAt?: number;
}

export const CharacterQuestStateSchema = z.object({
  questId: z.string(),
  status: QuestStatusSchema,
  progress: z.record(z.string(), z.number().int().min(0)),
  completedAt: z.number().optional(),
});

export function createInitialQuestState(questId: QuestId): CharacterQuestState {
  const quest = QUESTS[questId];
  const progress: Record<string, number> = {};
  if (quest) {
    for (const obj of quest.objectives) {
      progress[obj.id] = 0;
    }
  }
  return {
    questId,
    status: 'in_progress',
    progress,
  };
}

export function isQuestObjectivesMet(
  quest: QuestDefinition,
  progress: Record<string, number>,
): boolean {
  return quest.objectives.every(
    (obj) => (progress[obj.id] ?? 0) >= obj.required,
  );
}

export function ironBladeStartingProgress(
  s: Pick<GameplaySnapshot, 'inventory' | 'equipment'>,
) {
  const quantity = (id: ItemId) =>
    s.inventory.reduce(
      (total, slot) => total + (slot.itemId === id ? slot.quantity : 0),
      0,
    );
  if (
    quantity('iron_sword') > 0 ||
    s.equipment.some((slot) => slot.itemId === 'iron_sword')
  )
    return { gather_iron: 4, smelt_iron: 2, forge_blade: 1, defeat_scout: 0 };
  const ingots = Math.min(2, quantity('iron_ingot'));
  return {
    gather_iron: Math.min(4, quantity('iron_ore') + 2 * ingots),
    smelt_iron: ingots,
    forge_blade: 0,
    defeat_scout: 0,
  };
}

export interface QuestObjectiveContext {
  monsterId?: string;
  weapon?: ItemId;
}

export function advanceQuestObjective(
  state: CharacterQuestState,
  quest: QuestDefinition,
  objectiveType: QuestObjectiveType,
  targetId: string,
  amount = 1,
  context: QuestObjectiveContext = {},
): { updatedState: CharacterQuestState; changed: boolean } {
  if (state.status !== 'in_progress') {
    return { updatedState: state, changed: false };
  }

  let changed = false;
  const nextProgress = { ...state.progress };

  for (const obj of quest.objectives) {
    if (
      obj.type === objectiveType &&
      obj.targetId === targetId &&
      (!obj.weapon || obj.weapon === context.weapon) &&
      (!obj.monsterIds ||
        (context.monsterId && obj.monsterIds.includes(context.monsterId))) &&
      (!obj.after ||
        quest.objectives.some(
          (previous) =>
            previous.id === obj.after &&
            (state.progress[previous.id] ?? 0) >= previous.required,
        ))
    ) {
      const current = nextProgress[obj.id] ?? 0;
      if (current < obj.required) {
        const nextValue = Math.min(obj.required, current + amount);
        nextProgress[obj.id] = nextValue;
        changed = true;
      }
    }
  }

  if (!changed) {
    return { updatedState: state, changed: false };
  }

  const allMet = isQuestObjectivesMet(quest, nextProgress);
  return {
    updatedState: {
      ...state,
      progress: nextProgress,
      status: allMet ? 'ready_to_turn_in' : 'in_progress',
    },
    changed: true,
  };
}
