import type { CharacterQuestState, QuestDefinition } from '@aetheria/shared';

export function QuestObjectives({
  quest,
  state,
}: {
  quest: QuestDefinition;
  state: CharacterQuestState;
}) {
  return (
    <ul className="quest-objectives-list">
      {quest.objectives.map((objective) => {
        const current = Math.min(
          state.progress[objective.id] ?? 0,
          objective.required,
        );
        const done = current >= objective.required;
        return (
          <li
            key={objective.id}
            className={`quest-objective-item ${done ? 'done' : ''}`}
          >
            <span className="objective-checkbox" aria-hidden="true">
              {done ? '✓' : '○'}
            </span>
            <span className="objective-text">
              {objective.description}
              <strong className="objective-counter">
                ({current}/{objective.required})
              </strong>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
