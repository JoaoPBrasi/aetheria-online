import { useState } from 'react';
import { QUESTS, type CharacterQuestState } from '@aetheria/shared';
import { activeQuests } from '../quest-tracking';
import { QuestObjectives } from './quest-objectives';

export function QuestTracker({
  quests,
  onOpenJournal,
  onUntrack,
}: {
  quests: CharacterQuestState[];
  onOpenJournal: () => void;
  onUntrack: (questId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const tracked = activeQuests(quests);
  if (!tracked.length) return null;

  return (
    <section className="quest-tracker-shell" aria-label="Missões acompanhadas">
      <header className="quest-tracker-header">
        <button
          className="quest-tracker-journal"
          onClick={onOpenJournal}
          title="Abrir diário de missões (J)"
        >
          <span aria-hidden="true">◇</span> Missões acompanhadas{' '}
          <small>{tracked.length}</small>
        </button>
        <button
          type="button"
          className="quest-toggle-button"
          aria-label={collapsed ? 'Expandir missões' : 'Recolher missões'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '▾' : '▴'}
        </button>
      </header>
      {!collapsed && (
        <div className="quest-tracker-entries">
          {tracked.map((state) => {
            const quest = QUESTS[state.questId]!;
            const ready = state.status === 'ready_to_turn_in';
            return (
              <article
                key={state.questId}
                className={`quest-tracker-entry ${ready ? 'ready' : ''}`}
              >
                <div className="quest-tracker-title">
                  <h4>{quest.title}</h4>
                  <button
                    className="quest-toggle-button"
                    aria-label={`Deixar de acompanhar ${quest.title}`}
                    title="Remover do HUD"
                    onClick={() => onUntrack(state.questId)}
                  >
                    ×
                  </button>
                </div>
                <QuestObjectives quest={quest} state={state} />
                {ready && (
                  <div className="quest-ready-banner">
                    <p>Fale com o Ancião Eldrin para entregar.</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
