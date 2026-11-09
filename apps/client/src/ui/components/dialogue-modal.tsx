import { useState, useRef, useEffect } from 'react';
import { NPCS, type NpcId } from '@aetheria/shared';

interface DialogueModalProps {
  npcId: NpcId | string;
  onClose: () => void;
}

export function DialogueModal({ npcId, onClose }: DialogueModalProps) {
  const npc = NPCS.find((n) => n.id === npcId) ?? NPCS[0]!;
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const activeTopic = npc.topics.find((t) => t.id === activeTopicId);

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
            <div className="dialogue-avatar">📜</div>
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
            <p>{activeTopic ? activeTopic.response : npc.greeting}</p>
          </div>

          <div className="dialogue-options">
            <span className="dialogue-options-label">Perguntar ao Ancião:</span>
            <div className="dialogue-topics-list">
              {npc.topics.map((topic) => (
                <button
                  key={topic.id}
                  className={`dialogue-topic-btn ${activeTopicId === topic.id ? 'active' : ''}`}
                  onClick={() => setActiveTopicId(topic.id)}
                >
                  <span className="topic-bullet">💬</span>
                  <span>{topic.prompt}</span>
                </button>
              ))}
              {activeTopicId && (
                <button
                  className="dialogue-topic-btn reset-topic"
                  onClick={() => setActiveTopicId(null)}
                >
                  <span className="topic-bullet">↩</span>
                  <span>Ouvir a saudação inicial novamente</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="dialogue-footer">
          <button className="primary" onClick={onClose}>
            Até logo, Ancião (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
