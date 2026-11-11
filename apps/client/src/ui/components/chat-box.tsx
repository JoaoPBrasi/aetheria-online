import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  type ChatMessage,
  formatChatTimestamp,
  CHAT_MAX_LENGTH,
} from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';
import type { WorldConnection } from '../../game/networking/world-connection';

export function ChatBox({
  connection,
}: {
  connection: WorldConnection | null;
}) {
  const s = useSyncExternalStore(gameBridge.subscribe, gameBridge.getSnapshot);
  const messages: ChatMessage[] = s.chatMessages ?? [];

  const [channel, setChannel] = useState<'local' | 'global'>('local');
  const [filter, setFilter] = useState<'all' | 'local' | 'global'>('all');
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (!minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, minimized, filter]);

  // Captura global de tecla Enter e Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const active = document.activeElement;
        const isEditingOther =
          active instanceof HTMLElement &&
          active !== inputRef.current &&
          active.closest('input, textarea, select, [contenteditable=true]');
        if (isEditingOther) return;

        if (document.activeElement === inputRef.current) {
          // Envia se já estiver focado
          handleSend();
        } else {
          // Foca o campo de chat se não estiver focado
          e.preventDefault();
          setMinimized(false);
          setTimeout(() => inputRef.current?.focus(), 10);
        }
      } else if (e.key === 'Escape') {
        if (document.activeElement === inputRef.current) {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inputText, channel, connection]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !connection) {
      inputRef.current?.blur();
      return;
    }
    connection.sendChat(text, channel);
    setInputText('');
    inputRef.current?.blur();
  };

  const filteredMessages = messages.filter((msg) => {
    if (filter === 'all') return true;
    if (filter === 'local') return msg.channel === 'local' || msg.channel === 'system';
    if (filter === 'global') return msg.channel === 'global' || msg.channel === 'system';
    return true;
  });

  return (
    <div
      className={`hud-chat-box ${minimized ? 'minimized' : ''} ${isFocused ? 'focused' : ''}`}
      data-testid="hud-chat-box"
      aria-label="Caixa de Chat"
    >
      {/* Cabeçalho do Chat */}
      <div className="chat-header">
        <div className="chat-tabs">
          <button
            type="button"
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
            title="Exibir todas as mensagens"
          >
            Todos
          </button>
          <button
            type="button"
            className={filter === 'local' ? 'active' : ''}
            onClick={() => setFilter('local')}
            title="Exibir apenas mensagens locais"
          >
            Local
          </button>
          <button
            type="button"
            className={filter === 'global' ? 'active' : ''}
            onClick={() => setFilter('global')}
            title="Exibir apenas mensagens globais"
          >
            Geral
          </button>
        </div>
        <button
          type="button"
          className="chat-toggle-btn"
          onClick={() => setMinimized(!minimized)}
          aria-label={minimized ? 'Expandir chat' : 'Minimizar chat'}
          title={minimized ? 'Expandir chat' : 'Minimizar chat'}
        >
          {minimized ? '▲' : '▼'}
        </button>
      </div>

      {/* Lista de Mensagens */}
      {!minimized && (
        <div className="chat-body" role="log" aria-live="polite">
          {filteredMessages.length === 0 ? (
            <div className="chat-empty">Nenhuma mensagem recente.</div>
          ) : (
            filteredMessages.map((m) => (
              <div key={m.id} className={`chat-line channel-${m.channel}`}>
                <span className="chat-time">
                  [{formatChatTimestamp(m.createdAt)}]
                </span>
                <span className={`chat-badge ${m.channel}`}>
                  {m.channel === 'local'
                    ? '[Local]'
                    : m.channel === 'global'
                      ? '[Geral]'
                      : '[Sistema]'}
                </span>
                <span className="chat-author">{m.author}:</span>
                <span className="chat-text">{m.text}</span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Barra de Entrada / Digitação */}
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <button
          type="button"
          className={`chat-channel-selector ${channel}`}
          onClick={() => setChannel(channel === 'local' ? 'global' : 'local')}
          title="Clique para alternar o canal de envio (Local / Geral)"
        >
          {channel === 'local' ? 'Local' : 'Geral'}
        </button>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={inputText}
          maxLength={CHAT_MAX_LENGTH}
          placeholder="Pressione Enter para falar..."
          onChange={(e) => setInputText(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setMinimized(false);
          }}
          onBlur={() => setIsFocused(false)}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!inputText.trim() || !connection}
          title="Enviar mensagem"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
