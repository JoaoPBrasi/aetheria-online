import { z } from 'zod';
import { TILE_SIZE } from '../constants/index.js';

export const CHAT_LOCAL_TILES = 20;
export const CHAT_LOCAL_RADIUS = CHAT_LOCAL_TILES * TILE_SIZE; // 320px
export const CHAT_MAX_LENGTH = 120;
export const CHAT_COOLDOWN_MS = 600;
export const CHAT_BUBBLE_DURATION_MS = 5000;

export const CHAT_CHANNELS = ['local', 'global', 'system'] as const;
export type ChatChannel = (typeof CHAT_CHANNELS)[number];

export interface ChatMessage {
  id: string;
  sessionId: string;
  characterId: string;
  author: string;
  channel: ChatChannel;
  text: string;
  createdAt: number;
  x?: number;
  y?: number;
}

export const ChatSendSchema = z.object({
  channel: z.enum(['local', 'global']),
  text: z
    .string()
    .trim()
    .min(1, 'Mensagem não pode estar vazia')
    .max(CHAT_MAX_LENGTH, `Mensagem excede o limite de ${CHAT_MAX_LENGTH} caracteres`),
});

export type ChatSendInput = z.infer<typeof ChatSendSchema>;

export function isWithinChatRange(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius = CHAT_LOCAL_RADIUS,
): boolean {
  return Math.hypot(x1 - x2, y1 - y2) <= radius;
}

export function formatChatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
