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

  const effectiveChannel = filter === 'global' ? 'global' : filter === 'local' ? 'local' : channel;

  const handleSend = () => {
    let text = inputText.trim();
    if (!text || !connection) {
      inputRef.current?.blur();
      return;
    }

    let targetChannel = effectiveChannel;
    if (text.startsWith('/g ') || text.startsWith('/geral ')) {
      targetChannel = 'global';
      text = text.replace(/^\/(g|geral)\s+/, '').trim();
    } else if (text.startsWith('/l ') || text.startsWith('/local ')) {
      targetChannel = 'local';
      text = text.replace(/^\/(l|local)\s+/, '').trim();
    }

    if (!text) {
      setInputText('');
      inputRef.current?.blur();
      return;
    }

    setChannel(targetChannel);
    if (filter !== 'all') {
      setFilter(targetChannel);
    }

    connection.sendChat(text, targetChannel);
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
            onClick={() => {
              setFilter('local');
              setChannel('local');
            }}
            title="Exibir e falar no canal local (mapa atual)"
          >
            Local
          </button>
          <button
            type="button"
            className={filter === 'global' ? 'active' : ''}
            onClick={() => {
              setFilter('global');
              setChannel('global');
            }}
            title="Exibir e falar no canal geral (todo o servidor)"
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
          className={`chat-channel-selector ${effectiveChannel}`}
          onClick={() => {
            const next = effectiveChannel === 'local' ? 'global' : 'local';
            setChannel(next);
            if (filter !== 'all') {
              setFilter(next);
            }
          }}
          title="Clique para alternar o canal de envio (Local / Geral)"
        >
          {effectiveChannel === 'local' ? 'Local' : 'Geral'}
        </button>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={inputText}
          maxLength={CHAT_MAX_LENGTH}
          placeholder={
            effectiveChannel === 'global'
              ? 'Falar no chat Geral... (ou /l para local)'
              : 'Falar no chat Local... (ou /g para geral)'
          }
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
