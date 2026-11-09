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
  worldTime?: number;
  inputBlocked?: boolean;
  feedback?: string;
  feedbackAt?: number;
  plots?: import('../data/farming.js').FarmSnapshot[];
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
