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
      className="hud-modal"
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
      <div className="hud-panel dialogue-panel">
        <div className="panel-header">
          <div className="dialogue-header-identity">
            <div className="dialogue-avatar">🧙‍♂️</div>
            <div>
              <h3>{npc.name}</h3>
              <span className="dialogue-title">{npc.title}</span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            className="panel-close"
            onClick={onClose}
            aria-label="Encerrar conversa"
          >
            ✕
          </button>
        </div>

        <div className="dialogue-body">
          <div className="dialogue-speech-bubble" aria-live="polite">
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
                  <span>Concluir Missão: {quest.title}</span>
                </button>
              ))}

              {topics.map((topic) => {
                let promptText = topic.prompt;
                const quest = topic.questId ? QUESTS[topic.questId] : undefined;
                if (quest) {
                  const current = questState(quest.id)?.status;
                  if (current === 'in_progress')
                    promptText = `[Em Andamento] ${quest.title}`;
                  else if (current === 'ready_to_turn_in')
                    promptText = `[Objetivos Concluídos] ${quest.title}`;
                  else if (current === 'completed')
                    promptText = `[Missão Concluída] ${quest.title}`;
                }

                return (
                  <button
                    key={topic.id}
                    disabled={busy}
                    className={`dialogue-topic-btn ${activeTopicId === topic.id ? 'active' : ''}`}
                    onClick={() => handleTopicClick(topic)}
                  >
                    <span className="topic-bullet">💬</span>
                    <span>{promptText}</span>
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
                  <span>Ouvir a saudação inicial novamente</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="dialogue-footer">
          {snapshot.questPending && <p role="status">Confirmando missão…</p>}
          {snapshot.gameplayError && (
            <p role="alert">{snapshot.gameplayError}</p>
          )}
          <button className="primary" onClick={onClose}>
            Até logo, Ancião (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
