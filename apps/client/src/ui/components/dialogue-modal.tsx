import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { NPCS, QUESTS, type NpcId } from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';

interface DialogueModalProps {
  npcId: NpcId | string;
  onClose: () => void;
}

export function DialogueModal({ npcId, onClose }: DialogueModalProps) {
  const npc = NPCS.find((n) => n.id === npcId) ?? NPCS[0]!;
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const snapshot = useSyncExternalStore(
    gameBridge.subscribe,
    gameBridge.getSnapshot,
  );
  const questState = (id: string) =>
    snapshot.quests?.find((quest) => quest.questId === id);
  const topics = npc.topics.filter((topic) => {
    const prerequisite = topic.questId
      ? QUESTS[topic.questId]?.requires
      : undefined;
    return !prerequisite || questState(prerequisite)?.status === 'completed';
  });
  const readyQuests = Object.values(QUESTS).filter(
    (quest) =>
      quest.giverNpcId === npc.id &&
      questState(quest.id)?.status === 'ready_to_turn_in',
  );
  const busy =
    snapshot.actionPending ||
    snapshot.questPending ||
    snapshot.status !== 'connected';

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const activeTopic = topics.find((t) => t.id === activeTopicId);
  const activeQuest = activeTopic?.questId
    ? QUESTS[activeTopic.questId]
    : undefined;
  const status = activeQuest && questState(activeQuest.id)?.status;
  const speech = activeQuest
    ? activeQuest.dialogues[
        status === 'completed'
          ? 'completed'
          : status === 'ready_to_turn_in'
            ? 'readyToTurnIn'
            : status === 'in_progress'
              ? 'inProgress'
              : 'offer'
      ]
    : (activeTopic?.response ?? npc.greeting);

  const handleTopicClick = (topic: (typeof npc.topics)[number]) => {
    setActiveTopicId(topic.id);
    if (
      topic.action === 'accept_quest' &&
      topic.questId &&
      !questState(topic.questId)
    ) {
      gameBridge.acceptQuest?.(topic.questId);
    }
  };

  const handleTurnInQuest = (questId: string) => {
    setActiveTopicId(
      topics.find((topic) => topic.questId === questId)?.id ?? null,
    );
    gameBridge.turnInQuest?.(questId);
  };

  return (
    <div
      className="hud-modal dialogue-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Conversa com ${npc.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="dialogue-header">
        <div className="dialogue-header-identity">
          <div className="dialogue-avatar" aria-hidden="true">🧙‍♂️</div>
          <div className="dialogue-header-titles">
            <span className="dialogue-eyebrow">DIÁLOGO & MISSÕES</span>
            <h2 className="dialogue-npc-name">{npc.name}</h2>
            <span className="dialogue-npc-title">{npc.title}</span>
          </div>
        </div>
        <button
          ref={closeButtonRef}
          className="dialogue-close-btn"
          onClick={onClose}
          aria-label="Encerrar conversa"
        >
          ✕ Fechar
        </button>
      </header>

      <div className="dialogue-body">
        <div className="dialogue-speech-bubble" aria-live="polite">
          <div className="speech-quote-icon" aria-hidden="true">❝</div>
          <p>{speech}</p>
        </div>

        <div className="dialogue-options">
          <span className="dialogue-options-label">Opções de Conversa:</span>
          <div className="dialogue-topics-list">
            {readyQuests.map((quest) => (
              <button
                key={quest.id}
                className="dialogue-topic-btn quest-turn-in-btn"
                disabled={busy}
                onClick={() => handleTurnInQuest(quest.id)}
              >
                <span className="topic-bullet">🎁</span>
                <span className="topic-text">Concluir Missão: {quest.title}</span>
                <span className="topic-badge turn-in-badge">Pronta para Entrega</span>
              </button>
            ))}

            {topics.map((topic) => {
              let promptText = topic.prompt;
              let badge: string | null = null;
              let isQuest = false;
              const quest = topic.questId ? QUESTS[topic.questId] : undefined;
              if (quest) {
                isQuest = true;
                const current = questState(quest.id)?.status;
                if (current === 'in_progress') {
                  promptText = `[Em Andamento] ${quest.title}`;
                  badge = 'Em Andamento';
                } else if (current === 'ready_to_turn_in') {
                  promptText = `[Objetivos Concluídos] ${quest.title}`;
                  badge = 'Concluída';
                } else if (current === 'completed') {
                  promptText = `[Missão Concluída] ${quest.title}`;
                  badge = 'Finalizada';
                } else {
                  badge = 'Nova Missão';
                }
              }

              return (
                <button
                  key={topic.id}
                  disabled={busy}
                  className={`dialogue-topic-btn ${isQuest ? 'quest-topic' : ''} ${activeTopicId === topic.id ? 'active' : ''}`}
                  onClick={() => handleTopicClick(topic)}
                >
                  <span className="topic-bullet">{isQuest ? '📜' : '💬'}</span>
                  <span className="topic-text">{promptText}</span>
                  {badge && <span className={`topic-badge ${badge === 'Nova Missão' ? 'new-quest-badge' : ''}`}>{badge}</span>}
                </button>
              );
            })}

            {activeTopicId && (
              <button
                className="dialogue-topic-btn reset-topic"
                onClick={() => {
                  setActiveTopicId(null);
                }}
              >
                <span className="topic-bullet">↩</span>
                <span className="topic-text">Ouvir a saudação inicial novamente</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <footer className="dialogue-footer">
        <div className="dialogue-feedback">
          {snapshot.questPending && (
            <p className="dialogue-status-text" role="status">Confirmando missão…</p>
          )}
          {snapshot.gameplayError && (
            <p className="dialogue-error-text" role="alert">{snapshot.gameplayError}</p>
          )}
        </div>
        <button className="dialogue-footer-btn" onClick={onClose}>
          Até logo, Ancião (ESC)
        </button>
      </footer>
    </div>
  );
}
