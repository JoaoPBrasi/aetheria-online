import {
  QUESTS,
  createInitialQuestState,
  advanceQuestObjective,
  type CharacterQuestState,
  type QuestId,
  type QuestObjectiveType,
  type QuestReward,
} from '@aetheria/shared';

export class QuestManager {
  // Estado das quests por personagem (characterId -> Map de questId -> CharacterQuestState)
  private playerQuests = new Map<string, Map<string, CharacterQuestState>>();

  getQuests(characterId: string): CharacterQuestState[] {
    let quests = this.playerQuests.get(characterId);
    if (!quests) {
      quests = new Map();
      this.playerQuests.set(characterId, quests);
    }
    return Array.from(quests.values());
  }

  getQuest(
    characterId: string,
    questId: string,
  ): CharacterQuestState | undefined {
    return this.playerQuests.get(characterId)?.get(questId);
  }

  acceptQuest(characterId: string, questId: QuestId): CharacterQuestState {
    const questDef = QUESTS[questId];
    if (!questDef) {
      throw new Error('Missão desconhecida.');
    }

    let quests = this.playerQuests.get(characterId);
    if (!quests) {
      quests = new Map();
      this.playerQuests.set(characterId, quests);
    }

    const current = quests.get(questId);
    if (current && current.status !== 'not_started') {
      return current;
    }

    const initial = createInitialQuestState(questId);
    quests.set(questId, initial);
    return initial;
  }

  advanceObjective(
    characterId: string,
    objectiveType: QuestObjectiveType,
    targetId: string,
    amount = 1,
  ): { updated: CharacterQuestState; changed: boolean }[] {
    const quests = this.playerQuests.get(characterId);
    if (!quests) return [];

    const results: { updated: CharacterQuestState; changed: boolean }[] = [];

    for (const [questId, state] of quests.entries()) {
      if (state.status !== 'in_progress') continue;
      const questDef = QUESTS[questId];
      if (!questDef) continue;

      const { updatedState, changed } = advanceQuestObjective(
        state,
        questDef,
        objectiveType,
        targetId,
        amount,
      );

      if (changed) {
        quests.set(questId, updatedState);
        results.push({ updated: updatedState, changed: true });
      }
    }

    return results;
  }

  turnInQuest(
    characterId: string,
    questId: string,
  ): { success: boolean; rewards?: QuestReward; error?: string } {
    const questDef = QUESTS[questId];
    if (!questDef) {
      return { success: false, error: 'Missão desconhecida.' };
    }

    const quests = this.playerQuests.get(characterId);
    const state = quests?.get(questId);

    if (!quests || !state) {
      return { success: false, error: 'Você ainda não aceitou esta missão.' };
    }

    if (state.status === 'completed') {
      return { success: false, error: 'Missão já entregue.' };
    }

    if (state.status !== 'ready_to_turn_in') {
      return {
        success: false,
        error: 'Você ainda não cumpriu todos os objetivos da missão.',
      };
    }

    // Marca como concluída
    const completedState: CharacterQuestState = {
      ...state,
      status: 'completed',
      completedAt: Date.now(),
    };
    quests.set(questId, completedState);

    return {
      success: true,
      rewards: questDef.rewards,
    };
  }
}
