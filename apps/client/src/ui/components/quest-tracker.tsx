import { useState } from 'react';
import {
  QUESTS,
  type CharacterQuestState,
  type QuestDefinition,
} from '@aetheria/shared';

interface QuestTrackerProps {
  quests?: CharacterQuestState[];
}

export function QuestTracker({ quests = [] }: QuestTrackerProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Busca a primeira quest ativa ou pronta para entrega
  const activeQuestState =
    quests.find(
      (q) => q.status === 'in_progress' || q.status === 'ready_to_turn_in',
    ) || quests.find((q) => q.status === 'completed');

  if (!activeQuestState) {
    return (
      <div className="quest-tracker-shell empty">
        <button
          className="quest-hint-pill"
          onClick={() => setCollapsed(!collapsed)}
          title="Fale com o Ancião Eldrin na Praça"
        >
          <span className="quest-icon">📜</span>
          <span>Fale com o Ancião Eldrin</span>
        </button>
      </div>
    );
  }

  const questDef: QuestDefinition | undefined =
    QUESTS[activeQuestState.questId];
  if (!questDef) return null;

  const isReadyToTurnIn = activeQuestState.status === 'ready_to_turn_in';
  const isCompleted = activeQuestState.status === 'completed';

  return (
    <div
      className={`quest-tracker-shell ${isReadyToTurnIn ? 'ready' : ''} ${isCompleted ? 'completed' : ''}`}
    >
      <header
        className="quest-tracker-header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="quest-tracker-title">
          <span className="quest-icon">📜</span>
          <h4>{questDef.title}</h4>
        </div>
        <button
          type="button"
          className="quest-toggle-button"
          aria-label={collapsed ? 'Expandir missões' : 'Recolher missões'}
        >
          {collapsed ? '▼' : '▲'}
        </button>
      </header>

      {!collapsed && (
        <div className="quest-tracker-body">
          <ul className="quest-objectives-list">
            {questDef.objectives.map((obj) => {
              const current = activeQuestState.progress[obj.id] ?? 0;
              const done = current >= obj.required;
              return (
                <li
                  key={obj.id}
                  className={`quest-objective-item ${done ? 'done' : ''}`}
                >
                  <span className="objective-checkbox">{done ? '✓' : '○'}</span>
                  <span className="objective-text">
                    {obj.description}
                    <strong className="objective-counter">
                      ({current}/{obj.required})
                    </strong>
                  </span>
                </li>
              );
            })}
          </ul>

          {isReadyToTurnIn && (
            <div className="quest-ready-banner">
              <span>✨</span>
              <p>Fale com o Ancião Eldrin na praça para receber a recompensa!</p>
            </div>
          )}

          {isCompleted && (
            <div className="quest-completed-banner">
              <span>🌟</span>
              <p>Missão concluída com sucesso!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
