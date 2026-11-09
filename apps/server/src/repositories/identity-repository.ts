import { createHash, randomBytes } from 'node:crypto';
import {
  CreateCharacterSchema,
  CharacterSummarySchema,
  CosmeticsSchema,
  INITIAL_SKILLS,
  type CharacterSummary,
} from '@aetheria/shared';
import type { Database } from '../database/client.js';
import { AppError } from '../services/errors.js';
const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export class IdentityRepository {
  constructor(private db: Database) {}
  async customize(token: string, input: unknown) {
    const parsed = CosmeticsSchema.safeParse(input);
    if (!parsed.success)
      throw new AppError(400, 'INVALID_COSMETICS', 'Aparência inválida.');
    const account = await this.authenticate(token);
    if (!account.character)
      throw new AppError(
        409,
        'CHARACTER_REQUIRED',
        'Crie seu personagem primeiro.',
      );
    return CharacterSummarySchema.parse(
      await this.db.character.update({
        where: { id: account.character.id },
        data: parsed.data,
      }),
    );
  }
  async authenticate(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new AppError(401, 'INVALID_SESSION', 'Sessão inválida.');
    const account = await this.db.account.findUnique({
      where: { devTokenHash: hash(token) },
      include: { character: true },
    });
    if (!account)
      throw new AppError(401, 'INVALID_SESSION', 'Sessão inválida.');
    return account;
  }
  async session(token?: string) {
    if (token) {
      const account = await this.authenticate(token);
      return {
        token,
        character: account.character
          ? CharacterSummarySchema.parse(account.character)
          : null,
      };
    }
    const fresh = randomBytes(32).toString('hex');
    await this.db.account.create({ data: { devTokenHash: hash(fresh) } });
    return { token: fresh, character: null };
  }
  async createCharacter(
    token: string,
    input: unknown,
  ): Promise<CharacterSummary> {
    const parsed = CreateCharacterSchema.safeParse(input);
    if (!parsed.success)
      throw new AppError(
        400,
        'INVALID_CHARACTER',
        'Nome ou aparência inválidos.',
      );
    const account = await this.authenticate(token);
    if (account.character)
      throw new AppError(
        409,
        'CHARACTER_EXISTS',
        'Esta conta já possui um personagem.',
      );
    try {
      const character = await this.db.character.create({
        data: {
          accountId: account.id,
          ...parsed.data,
          skills: { create: INITIAL_SKILLS },
        },
      });
      return CharacterSummarySchema.parse(character);
    } catch (error) {
      // The unique account constraint also protects simultaneous requests.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      )
        throw new AppError(
          409,
          'CHARACTER_EXISTS',
          'Esta conta já possui um personagem.',
        );
      throw error;
    }
  }
  async loadCharacter(token: string): Promise<CharacterSummary> {
    const account = await this.authenticate(token);
    if (!account.character)
      throw new AppError(
        409,
        'CHARACTER_REQUIRED',
        'Crie seu personagem antes de entrar.',
      );
    return CharacterSummarySchema.parse(account.character);
  }
}
