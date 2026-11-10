import { QUESTS, type CharacterQuestState } from '@aetheria/shared';

export const activeQuests = (quests: CharacterQuestState[]) =>
  quests.filter(
    (q) =>
      (q.status === 'in_progress' || q.status === 'ready_to_turn_in') &&
      QUESTS[q.questId],
  );

const storageKey = (characterId: string) =>
  `aetheria:quests:hidden:${characterId}`;

export function readHiddenQuests(characterId: string): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(storageKey(characterId)) ?? '[]',
    );
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function saveHiddenQuests(characterId: string, ids: string[]) {
  try {
    localStorage.setItem(storageKey(characterId), JSON.stringify(ids));
  } catch {
    // Tracking still works for this session if browser storage is unavailable.
  }
}
