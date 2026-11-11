import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameBridge } from './game-bridge';

describe('GameBridge - Sistema de Cast e Canalização', () => {
  let bridge: GameBridge;

  beforeEach(() => {
    vi.useFakeTimers();
    bridge = new GameBridge();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inicia uma canalização com status "channeling"', () => {
    let notified = 0;
    bridge.subscribeCast(() => {
      notified++;
    });

    bridge.startCast({
      label: 'Derrubando Árvore…',
      icon: '🪓',
      durationMs: 2500,
    });

    const cast = bridge.getCast();
    expect(cast).not.toBeNull();
    expect(cast?.label).toBe('Derrubando Árvore…');
    expect(cast?.icon).toBe('🪓');
    expect(cast?.status).toBe('channeling');
    expect(cast?.durationMs).toBe(2500);
    expect(notified).toBeGreaterThan(0);
  });

  it('cancela a canalização ativa e define a razão do cancelamento', () => {
    const onCancel = vi.fn();
    bridge.startCast({
      label: 'Minerando Ferro…',
      icon: '⛏️',
      durationMs: 3000,
      onCancel,
    });

    bridge.cancelCast('Movimento cancelou a ação!');

    const cast = bridge.getCast();
    expect(cast?.status).toBe('interrupted');
    expect(cast?.interruptedReason).toBe('Movimento cancelou a ação!');
    expect(onCancel).toHaveBeenCalledTimes(1);

    // Após 550ms, o cast deve ser limpo do estado
    vi.advanceTimersByTime(600);
    expect(bridge.getCast()).toBeNull();
  });

  it('conclui a canalização com sucesso ao expirar o tempo e executa onComplete', () => {
    const onComplete = vi.fn();
    bridge.startCast({
      label: 'Forjando Espada de Ferro…',
      icon: '🔨',
      durationMs: 3500,
      onComplete,
    });

    expect(bridge.getCast()?.status).toBe('channeling');

    // Avança o tempo até a conclusão
    vi.advanceTimersByTime(3500);
    expect(bridge.getCast()?.status).toBe('completed');
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Após o pulso de 450ms, o cast é removido
    vi.advanceTimersByTime(500);
    expect(bridge.getCast()).toBeNull();
  });

  it('iniciar nova ação enquanto outra canaliza cancela a anterior', () => {
    const cancel1 = vi.fn();
    bridge.startCast({
      label: 'Primeira Ação',
      icon: '🌿',
      durationMs: 2000,
      onCancel: cancel1,
    });

    bridge.startCast({
      label: 'Segunda Ação',
      icon: '🌱',
      durationMs: 1500,
    });

    expect(cancel1).toHaveBeenCalledTimes(1);
    expect(bridge.getCast()?.label).toBe('Segunda Ação');
    expect(bridge.getCast()?.status).toBe('channeling');
  });

  it('armazena mensagens de chat no snapshot e dispara o balão de fala', () => {
    const bubbleSpy = vi.fn();
    bridge.speechBubble = bubbleSpy;

    const msg = {
      id: 'msg-1',
      sessionId: 'session-a',
      characterId: 'char-a',
      author: 'Guerreiro',
      channel: 'local' as const,
      text: 'Olá mundo!',
      createdAt: Date.now(),
    };

    bridge.pushChatMessage(msg);

    const snapshot = bridge.getSnapshot();
    expect(snapshot.chatMessages).toContainEqual(msg);
    expect(bubbleSpy).toHaveBeenCalledWith(msg);
  });

  it('limita o histórico do chat a no máximo 50 mensagens mais recentes', () => {
    for (let i = 1; i <= 60; i++) {
      bridge.pushChatMessage({
        id: `msg-${i}`,
        sessionId: 'session-a',
        characterId: 'char-a',
        author: 'Guerreiro',
        channel: 'local',
        text: `Mensagem ${i}`,
        createdAt: Date.now(),
      });
    }

    const messages = bridge.getSnapshot().chatMessages ?? [];
    expect(messages).toHaveLength(50);
    expect(messages[0]?.id).toBe('msg-11');
    expect(messages[49]?.id).toBe('msg-60');
  });
});

