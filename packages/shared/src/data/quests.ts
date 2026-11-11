import { z } from 'zod';
import type { ItemId } from './gameplay.js';
import type { NpcId } from './npcs.js';

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
  rewards: QuestReward;
}

export const TUTORIAL_QUEST: QuestDefinition = {
  id: 'tutorial_first_steps',
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
      'Quando quiser uma arma mais forte, minere na Pedreira do Lago, funda o minério em lingotes na Fornalha e fabrique a espada de ferro na Forja. Volte ao prado para experimentar o novo golpe.',
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

export const QUESTS: Record<string, QuestDefinition> = {
  [TUTORIAL_QUEST.id]: TUTORIAL_QUEST,
};

export type QuestId = keyof typeof QUESTS;

export const QuestCommandSchema = z
  .object({
    questId: z.literal('tutorial_first_steps'),
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

export function advanceQuestObjective(
  state: CharacterQuestState,
  quest: QuestDefinition,
  objectiveType: QuestObjectiveType,
  targetId: string,
  amount = 1,
): { updatedState: CharacterQuestState; changed: boolean } {
  if (state.status !== 'in_progress') {
    return { updatedState: state, changed: false };
  }

  let changed = false;
  const nextProgress = { ...state.progress };

  for (const obj of quest.objectives) {
    if (obj.type === objectiveType && obj.targetId === targetId) {
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
