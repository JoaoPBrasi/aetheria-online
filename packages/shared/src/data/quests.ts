import { z } from 'zod';
import type { GameplaySnapshot, ItemId } from './gameplay.js';
import type { NpcId } from './npcs.js';

export const TUTORIAL_QUEST_ID = 'tutorial_first_steps';
export const IRON_BLADE_QUEST_ID = 'first_iron_blade';
export const IRON_BLADE_SCOUTS = ['orc-1', 'orc-3'] as const;

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
    'Minere na Pedreira do Lago, funda o ferro e use a lâmina que você forjou contra um Orc Batedor.',
  giverNpcId: 'elder-eldrin',
  requires: TUTORIAL_QUEST_ID,
  dialogues: {
    offer:
      'Cruze a ponte a leste e siga para o norte até a Pedreira do Lago. Obtenha ferro para dois lingotes, forje uma espada e derrote um Orc Batedor com ela.',
    inProgress:
      'Leve quatro minérios e dois carvões à Fornalha para fazer dois lingotes. Use os lingotes e uma madeira na Forja. Com a espada na mochila ou equipada, siga para o Acampamento dos Orcs.',
    readyToTurnIn:
      'Você forjou a lâmina e derrotou um batedor. Entregue a missão para receber 60 XP de Guerreiro.',
    completed:
      'Agora você sabe transformar o minério da pedreira em uma arma que aguenta o combate contra os orcs.',
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
  rewards: { xp: { profession: 'warrior', amount: 60 }, items: [] },
};

export const QUESTS: Record<string, QuestDefinition> = {
  [TUTORIAL_QUEST.id]: TUTORIAL_QUEST,
  [IRON_BLADE_QUEST.id]: IRON_BLADE_QUEST,
};

export type QuestId = keyof typeof QUESTS;

export const QuestCommandSchema = z
  .object({
    questId: z.enum([TUTORIAL_QUEST_ID, IRON_BLADE_QUEST_ID]),
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
