import type { z } from 'zod';
import type {
  CharacterSummarySchema,
  CreateCharacterSchema,
  SessionResponseSchema,
} from '../schemas/index.js';
export type CharacterSummary = z.infer<typeof CharacterSummarySchema>;
export type CreateCharacterInput = z.infer<typeof CreateCharacterSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type ConnectionStatus = 'offline' | 'connecting' | 'connected' | 'error';
export interface GameSnapshot {
  gameplay?: import('../data/gameplay.js').GameplaySnapshot;
  gameplayError?: string | null;
  actionPending?: boolean;
  resources?: Record<string, number>;
  monsters?: import('../data/gameplay.js').MonsterSnapshot[];
  health?: number;
  maxHealth?: number;
  worldTime?: number;
  inputBlocked?: boolean;
  feedback?: string;
  feedbackAt?: number;
  plots?: import('../data/farming.js').FarmSnapshot[];
  quests?: import('../data/quests.js').CharacterQuestState[];
  status: ConnectionStatus;
  players: number;
  error: string | null;
  fps: number;
  position?: { x: number; y: number };
  motion?: 'idle' | 'walking';
  nearby?: { name: string; x: number; y: number }[];
}
export interface ApiError {
  error: { code: string; message: string };
}
