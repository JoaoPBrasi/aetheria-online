import { z } from 'zod';
import { DIRECTIONS, PROFESSIONS } from '../constants/index.js';
export const CharacterNameSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[\p{L}\p{N} _-]+$/u, 'Use letras, números, espaços, _ ou -');
export const AppearanceSchema = z.enum(['sage', 'ember', 'tide']);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const CosmeticsSchema = z
  .object({
    clothingColor: color.default('#c4d597'),
    hairColor: color.default('#59422f'),
    skinColor: color.default('#e1b68c'),
    hairStyle: z.enum(['short', 'long', 'bun', 'none']).default('short'),
  })
  .strict();
export const CreateCharacterSchema = z
  .object({
    name: CharacterNameSchema,
    appearance: AppearanceSchema,
    ...CosmeticsSchema.shape,
  })
  .strict();
export const JoinWorldSchema = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export const CharacterSummarySchema = z.object({
  ...CosmeticsSchema.shape,
  id: z.uuid(),
  name: CharacterNameSchema,
  appearance: AppearanceSchema,
  mapId: z.string(),
  x: z.number(),
  y: z.number(),
  direction: z.enum(DIRECTIONS),
  health: z.number().int(),
  energy: z.number().int(),
  revision: z.number().int(),
});
export const SessionResponseSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  character: CharacterSummarySchema.nullable(),
});
export const SkillSchema = z.enum(PROFESSIONS);
