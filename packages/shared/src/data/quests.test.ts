import { describe, expect, it } from 'vitest';
import {
  TUTORIAL_QUEST,
  IRON_BLADE_QUEST,
  FARM_HARVEST_QUEST,
  CEMETERY_WATCHERS_QUEST,
  ironBladeStartingProgress,
  createInitialQuestState,
  isQuestObjectivesMet,
  advanceQuestObjective,
  CharacterQuestStateSchema,
  QuestCommandSchema,
} from './quests.js';

it('conta apenas batedores derrotados com ferro após obter a espada', () => {
  const quest = IRON_BLADE_QUEST;
  const initial = createInitialQuestState(quest.id);
  const check = (
    state: typeof initial,
    monsterId: string,
    weapon: 'sword' | 'iron_sword',
  ) =>
    advanceQuestObjective(state, quest, 'defeat', 'orc', 1, {
      monsterId,
      weapon,
    });
  expect(check(initial, 'orc-1', 'iron_sword').changed).toBe(false);
  const armed = {
    ...initial,
    progress: {
      gather_iron: 4,
      smelt_iron: 2,
      forge_blade: 1,
      defeat_scout: 0,
    },
  };
  expect(check(armed, 'orc-1', 'sword').changed).toBe(false);
  expect(check(armed, 'orc-2', 'iron_sword').changed).toBe(false);
  expect(check(armed, 'orc-3', 'iron_sword').updatedState.status).toBe(
    'ready_to_turn_in',
  );
});

it('aproveita minério e lingotes existentes sem antecipar o combate', () => {
  expect(
    ironBladeStartingProgress({
      inventory: [
        { index: 0, itemId: 'iron_ingot', quantity: 1 },
        { index: 1, itemId: 'iron_ore', quantity: 2 },
      ],
      equipment: [],
    }),
  ).toEqual({ gather_iron: 4, smelt_iron: 1, forge_blade: 0, defeat_scout: 0 });
});

describe('Sistema de Quests - Tutorial', () => {
  it('rejeita missões desconhecidas e campos de identidade enviados pelo cliente', () => {
    expect(
      QuestCommandSchema.safeParse({ questId: TUTORIAL_QUEST.id }).success,
    ).toBe(true);
    expect(QuestCommandSchema.safeParse({ questId: 'unknown' }).success).toBe(
      false,
    );
    expect(
      QuestCommandSchema.safeParse({
        questId: TUTORIAL_QUEST.id,
        characterId: 'another-player',
      }).success,
    ).toBe(false);
  });
  it('cria estado inicial de quest corretamente', () => {
    const state = createInitialQuestState(TUTORIAL_QUEST.id);
    expect(state.questId).toBe('tutorial_first_steps');
    expect(state.status).toBe('in_progress');
    expect(state.progress.gather_wood).toBe(0);
    expect(state.progress.craft_planks).toBe(0);
    expect(state.progress.defeat_slimes).toBe(0);
    expect(isQuestObjectivesMet(TUTORIAL_QUEST, state.progress)).toBe(false);

    // Valida com o schema Zod
    expect(CharacterQuestStateSchema.safeParse(state).success).toBe(true);
  });

  it('avança a coleta de madeira até o limite requerido', () => {
    let state = createInitialQuestState(TUTORIAL_QUEST.id);

    const step1 = advanceQuestObjective(
      state,
      TUTORIAL_QUEST,
      'gather',
      'wood',
      3,
    );
    expect(step1.changed).toBe(true);
    expect(step1.updatedState.progress.gather_wood).toBe(3);
    expect(step1.updatedState.status).toBe('in_progress');
    state = step1.updatedState;

    const step2 = advanceQuestObjective(
      state,
      TUTORIAL_QUEST,
      'gather',
      'wood',
      5,
    );
    expect(step2.changed).toBe(true);
    // Não deve ultrapassar o limite requerido de 5
    expect(step2.updatedState.progress.gather_wood).toBe(5);
  });

  it('avança fabricação de tábuas e combate a slimes mudando status quando todos os objetivos forem atingidos', () => {
    let state = createInitialQuestState(TUTORIAL_QUEST.id);

    // 1. Coleta 5 madeiras
    state = advanceQuestObjective(
      state,
      TUTORIAL_QUEST,
      'gather',
      'wood',
      5,
    ).updatedState;
    expect(state.status).toBe('in_progress');

    // 2. Fabrica 2 tábuas
    state = advanceQuestObjective(
      state,
      TUTORIAL_QUEST,
      'craft',
      'plank',
      2,
    ).updatedState;
    expect(state.status).toBe('in_progress');

    // 3. Derrota 1 slime
    state = advanceQuestObjective(
      state,
      TUTORIAL_QUEST,
      'defeat',
      'slime',
      1,
    ).updatedState;
    expect(state.status).toBe('in_progress');

    // 4. Derrota o 2º slime -> Deve ficar pronta para entrega!
    const finalStep = advanceQuestObjective(
      state,
      TUTORIAL_QUEST,
      'defeat',
      'slime',
      1,
    );
    expect(finalStep.changed).toBe(true);
    expect(finalStep.updatedState.progress.defeat_slimes).toBe(2);
    expect(finalStep.updatedState.status).toBe('ready_to_turn_in');
    expect(
      isQuestObjectivesMet(TUTORIAL_QUEST, finalStep.updatedState.progress),
    ).toBe(true);
  });

  it('não altera progresso para tipos ou alvos não correspondentes', () => {
    const state = createInitialQuestState(TUTORIAL_QUEST.id);
    const result = advanceQuestObjective(
      state,
      TUTORIAL_QUEST,
      'gather',
      'stone',
      10,
    );
    expect(result.changed).toBe(false);
    expect(result.updatedState.progress.gather_wood).toBe(0);
  });
});

describe('Missão Ajustada - A Primeira Lâmina de Ferro', () => {
  it('contém recompensas em itens configuradas corretamente', () => {
    expect(IRON_BLADE_QUEST.rewards.xp.amount).toBe(60);
    expect(IRON_BLADE_QUEST.rewards.items).toEqual([
      { itemId: 'charcoal', quantity: 5 },
      { itemId: 'plank', quantity: 5 },
    ]);
  });
});

describe('Novas Quests - Horta e Cemitério', () => {
  it('valida comandos das novas missões pelo Zod schema', () => {
    expect(
      QuestCommandSchema.safeParse({ questId: FARM_HARVEST_QUEST.id }).success,
    ).toBe(true);
    expect(
      QuestCommandSchema.safeParse({ questId: CEMETERY_WATCHERS_QUEST.id })
        .success,
    ).toBe(true);
  });

  it('completa a missão da Primeira Colheita colhendo 3 nabos', () => {
    let state = createInitialQuestState(FARM_HARVEST_QUEST.id);
    expect(state.status).toBe('in_progress');
    expect(state.progress.harvest_turnip).toBe(0);

    const step1 = advanceQuestObjective(
      state,
      FARM_HARVEST_QUEST,
      'gather',
      'turnip',
      2,
    );
    expect(step1.changed).toBe(true);
    expect(step1.updatedState.progress.harvest_turnip).toBe(2);
    expect(step1.updatedState.status).toBe('in_progress');

    const step2 = advanceQuestObjective(
      step1.updatedState,
      FARM_HARVEST_QUEST,
      'gather',
      'turnip',
      1,
    );
    expect(step2.changed).toBe(true);
    expect(step2.updatedState.progress.harvest_turnip).toBe(3);
    expect(step2.updatedState.status).toBe('ready_to_turn_in');
    expect(
      isQuestObjectivesMet(FARM_HARVEST_QUEST, step2.updatedState.progress),
    ).toBe(true);
  });

  it('avança fibras e vigias esqueletos na missão do Cemitério Antigo', () => {
    let state = createInitialQuestState(CEMETERY_WATCHERS_QUEST.id);
    expect(state.status).toBe('in_progress');

    // 1. Coleta 3 fibras
    state = advanceQuestObjective(
      state,
      CEMETERY_WATCHERS_QUEST,
      'gather',
      'fiber',
      3,
    ).updatedState;
    expect(state.progress.gather_fiber).toBe(3);
    expect(state.status).toBe('in_progress');

    // 2. Derrota o primeiro esqueleto
    state = advanceQuestObjective(
      state,
      CEMETERY_WATCHERS_QUEST,
      'defeat',
      'skeleton',
      1,
      { monsterId: 'skeleton-1' },
    ).updatedState;
    expect(state.progress.defeat_skeletons).toBe(1);
    expect(state.status).toBe('in_progress');

    // 3. Monstro desconhecido não avança o objetivo
    const invalidMob = advanceQuestObjective(
      state,
      CEMETERY_WATCHERS_QUEST,
      'defeat',
      'skeleton',
      1,
      { monsterId: 'orc-1' },
    );
    expect(invalidMob.changed).toBe(false);

    // 4. Derrota o segundo esqueleto -> ready_to_turn_in
    const finalStep = advanceQuestObjective(
      state,
      CEMETERY_WATCHERS_QUEST,
      'defeat',
      'skeleton',
      1,
      { monsterId: 'skeleton-2' },
    );
    expect(finalStep.changed).toBe(true);
    expect(finalStep.updatedState.progress.defeat_skeletons).toBe(2);
    expect(finalStep.updatedState.status).toBe('ready_to_turn_in');
  });
});
