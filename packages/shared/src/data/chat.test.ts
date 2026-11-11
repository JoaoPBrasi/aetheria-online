import { describe, expect, it } from 'vitest';
import {
  ChatSendSchema,
  isWithinChatRange,
  CHAT_LOCAL_RADIUS,
  CHAT_MAX_LENGTH,
  formatChatTimestamp,
} from './chat.js';

describe('Chat Shared System', () => {
  it('valida envio de mensagem válida no canal local e global', () => {
    const local = ChatSendSchema.safeParse({
      channel: 'local',
      text: 'Olá Brumavale!',
    });
    expect(local.success).toBe(true);

    const global = ChatSendSchema.safeParse({
      channel: 'global',
      text: 'Alguém para caçar slimes?',
    });
    expect(global.success).toBe(true);
  });

  it('rejeita mensagens vazias ou apenas espaços', () => {
    const empty = ChatSendSchema.safeParse({
      channel: 'local',
      text: '   ',
    });
    expect(empty.success).toBe(false);
  });

  it('rejeita mensagens que excedam o limite máximo de caracteres', () => {
    const tooLong = ChatSendSchema.safeParse({
      channel: 'global',
      text: 'a'.repeat(CHAT_MAX_LENGTH + 1),
    });
    expect(tooLong.success).toBe(false);

    const exact = ChatSendSchema.safeParse({
      channel: 'global',
      text: 'a'.repeat(CHAT_MAX_LENGTH),
    });
    expect(exact.success).toBe(true);
  });

  it('calcula o alcance de proximidade corretamente', () => {
    // Mesma posição
    expect(isWithinChatRange(100, 100, 100, 100)).toBe(true);

    // Dentro do raio de 320px
    expect(isWithinChatRange(100, 100, 100 + CHAT_LOCAL_RADIUS - 10, 100)).toBe(true);

    // Exatamente no limite
    expect(isWithinChatRange(100, 100, 100 + CHAT_LOCAL_RADIUS, 100)).toBe(true);

    // Fora do raio
    expect(isWithinChatRange(100, 100, 100 + CHAT_LOCAL_RADIUS + 5, 100)).toBe(false);
  });

  it('formata o timestamp corretamente em HH:mm', () => {
    const ts = new Date('2026-11-11T14:30:00').getTime();
    expect(formatChatTimestamp(ts)).toMatch(/^\d{2}:\d{2}$/);
  });
});
