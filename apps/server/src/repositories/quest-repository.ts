import {
  CharacterQuestStateSchema,
  QUESTS,
  advanceQuestObjective,
  createInitialQuestState,
  isQuestObjectivesMet,
  addItem,
  type CharacterQuestState,
  type ItemId,
  type QuestObjectiveType,
} from '@aetheria/shared';
import type { Database } from '../database/client.js';
import type { Prisma } from '../generated/prisma/client.js';

type QuestRow = {
  questId: string;
  status: string;
  progress: unknown;
  completedAt: Date | null;
};

function stateOf(row: QuestRow): CharacterQuestState {
  return CharacterQuestStateSchema.parse({
    ...row,
    completedAt: row.completedAt?.getTime(),
  });
}

// Called inside the same transaction as the inventory/XP change. The caller
// holds the character row lock, so parallel actions cannot lose progress.
export async function advanceQuests(
  tx: Prisma.TransactionClient,
  characterId: string,
  type: QuestObjectiveType,
  targetId: string,
  amount: number,
) {
  const rows = await tx.characterQuest.findMany({
    where: { characterId, status: 'in_progress' },
  });
  for (const row of rows) {
    const definition = QUESTS[row.questId];
    if (!definition) continue;
    const { updatedState, changed } = advanceQuestObjective(
      stateOf(row),
      definition,
      type,
      targetId,
      amount,
    );
    if (changed)
      await tx.characterQuest.update({
        where: { characterId_questId: { characterId, questId: row.questId } },
        data: { status: updatedState.status, progress: updatedState.progress },
      });
  }
}

export class QuestRepository {
  constructor(private db: Database) {}

  async list(characterId: string) {
    const rows = await this.db.characterQuest.findMany({
      where: { characterId },
      orderBy: { questId: 'asc' },
    });
    return rows.map(stateOf);
  }

  async accept(characterId: string, questId: string) {
    if (!QUESTS[questId]) throw new Error('Missão desconhecida.');
    const initial = createInitialQuestState(questId);
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Character" WHERE "id"=${characterId}::uuid FOR UPDATE`;
      await tx.characterQuest.upsert({
        where: { characterId_questId: { characterId, questId } },
        create: {
          characterId,
          questId,
          status: initial.status,
          progress: initial.progress,
        },
        update: {},
      });
    });
  }

  async turnIn(characterId: string, questId: string) {
    const definition = QUESTS[questId];
    if (!definition) throw new Error('Missão desconhecida.');
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Character" WHERE "id"=${characterId}::uuid FOR UPDATE`;
      const where = { characterId_questId: { characterId, questId } };
      const row = await tx.characterQuest.findUnique({ where });
      if (!row) throw new Error('Você ainda não aceitou esta missão.');
      // A retry after a lost response returns the same result without granting again.
      if (row.status === 'completed') return;
      if (
        row.status !== 'ready_to_turn_in' ||
        !isQuestObjectivesMet(definition, stateOf(row).progress)
      )
        throw new Error('Você ainda não cumpriu todos os objetivos da missão.');

      const inventory = await tx.inventorySlot.findMany({
        where: { characterId },
      });
      let slots = inventory.map((s) => ({
        index: s.index,
        itemId: s.itemId as ItemId,
        quantity: s.quantity,
      }));
      for (const item of definition.rewards.items)
        slots = addItem(slots, item.itemId, item.quantity);
      await tx.inventorySlot.deleteMany({ where: { characterId } });
      if (slots.length)
        await tx.inventorySlot.createMany({
          data: slots.map((s) => ({ ...s, characterId })),
        });
      const xp = definition.rewards.xp;
      await tx.characterSkill.upsert({
        where: {
          characterId_profession: { characterId, profession: xp.profession },
        },
        create: { characterId, profession: xp.profession, xp: xp.amount },
        update: { xp: { increment: xp.amount } },
      });
      await tx.characterQuest.update({
        where,
        data: { status: 'completed', completedAt: new Date() },
      });
      await tx.character.update({
        where: { id: characterId },
        data: { revision: { increment: 1 } },
      });
    });
  }
}
