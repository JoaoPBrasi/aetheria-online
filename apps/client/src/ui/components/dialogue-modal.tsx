import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { NPCS, TUTORIAL_QUEST, type NpcId } from '@aetheria/shared';
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
  const tutorialQuest = snapshot.quests?.find(
    (q) => q.questId === 'tutorial_first_steps',
  );

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const activeTopic = npc.topics.find((t) => t.id === activeTopicId);

  const handleTopicClick = (topic: (typeof npc.topics)[number]) => {
    setActiveTopicId(topic.id);
    if (topic.action === 'accept_quest' && topic.questId && !tutorialQuest) {
      gameBridge.acceptQuest?.(topic.questId);
    }
  };

  const handleTurnInQuest = (questId: string) => {
    gameBridge.turnInQuest?.(questId);
  };

  const isReadyToTurnIn = tutorialQuest?.status === 'ready_to_turn_in';
  const isQuestInProgress = tutorialQuest?.status === 'in_progress';
  const isQuestCompleted = tutorialQuest?.status === 'completed';

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
            <p>
              {activeTopic?.id === 'quest_tutorial' || isQuestCompleted
                ? isQuestCompleted
                  ? TUTORIAL_QUEST.dialogues.completed
                  : isReadyToTurnIn
                    ? TUTORIAL_QUEST.dialogues.readyToTurnIn
                    : isQuestInProgress
                      ? TUTORIAL_QUEST.dialogues.inProgress
                      : TUTORIAL_QUEST.dialogues.offer
                : activeTopic
                  ? activeTopic.response
                  : npc.greeting}
            </p>
          </div>

          <div className="dialogue-options">
            <span className="dialogue-options-label">Opções de Conversa:</span>
            <div className="dialogue-topics-list">
              {/* Botão dourado de entrega de missão quando pronta */}
              {isReadyToTurnIn && (
                <button
                  className="dialogue-topic-btn quest-turn-in-btn"
                  disabled={
                    snapshot.actionPending ||
                    snapshot.questPending ||
                    snapshot.status !== 'connected'
                  }
                  onClick={() => handleTurnInQuest('tutorial_first_steps')}
                >
                  <span className="topic-bullet">🎁</span>
                  <span>
                    Concluir Missão: "Primeiros Passos em Brumavale" (Receber
                    Recompensas!)
                  </span>
                </button>
              )}

              {npc.topics.map((topic) => {
                let promptText = topic.prompt;
                if (topic.id === 'quest_tutorial') {
                  if (isQuestInProgress) {
                    promptText = '📜 [Em Andamento] Como vão meus objetivos?';
                  } else if (isReadyToTurnIn) {
                    promptText =
                      '✨ [Objetivos Concluídos] Consegui tudo o que pediu!';
                  } else if (isQuestCompleted) {
                    promptText =
                      '🌟 [Missão Concluída] Obrigado pelos ensinamentos!';
                  }
                }

                return (
                  <button
                    key={topic.id}
                    disabled={
                      snapshot.actionPending ||
                      snapshot.questPending ||
                      snapshot.status !== 'connected'
                    }
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
