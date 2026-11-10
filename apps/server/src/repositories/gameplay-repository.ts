import type { Database } from '../database/client.js';
import { QuestRepository, advanceQuests } from './quest-repository.js';
import {
  addItem,
  ITEMS,
  transferItem,
  CROPS,
  hasTool,
  CRAFTING_RECIPES,
  CRAFTING_STATIONS,
  craftItem,
  type CropId,
  type FarmSnapshot,
  type GameAction,
  type GameplaySnapshot,
  type ItemId,
  type Slot,
} from '@aetheria/shared';
type Position = { x: number; y: number; direction: string };
export class GameplayRepository {
  constructor(private db: Database) {}
  quests() {
    return new QuestRepository(this.db);
  }
  async execute(
    characterId: string,
    action?: GameAction,
    reward?: {
      item: ItemId;
      profession: string;
      quantity?: number;
      xp?: number;
    },
    position?: Position,
  ): Promise<GameplaySnapshot> {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Character" WHERE "id"=${characterId}::uuid FOR UPDATE`;
      const c = await tx.character.findUniqueOrThrow({
        where: { id: characterId },
        include: { inventory: true, equipment: true, skills: true },
      });
      const snapshot = (): GameplaySnapshot => ({
        characterId,
        revision: c.revision,
        inventory: c.inventory.map((s) => ({
          index: s.index,
          itemId: s.itemId as ItemId,
          quantity: s.quantity,
        })),
        equipment: c.equipment.map((s) => ({
          slot: s.slot,
          itemId: s.itemId as ItemId,
        })),
        skills: c.skills.map((s) => ({ profession: s.profession, xp: s.xp })),
      });
      if (
        action &&
        (await tx.gameActionReceipt.findUnique({
          where: { characterId_actionId: { characterId, actionId: action.id } },
        }))
      )
        return snapshot();
      if (action && action.revision !== c.revision)
        throw new Error('Estado desatualizado. Tente novamente.');
      let slots: Slot[] = snapshot().inventory;
      let equipment = snapshot().equipment;
      let changed = false;
      let kitGranted = c.farmingKitGranted;
      if (!c.starterGranted) {
        for (const tool of ['axe', 'pickaxe', 'sickle'] as const)
          slots = addItem(slots, tool, 1);
        changed = true;
      }
      if (!kitGranted) {
        try {
          let kit = addItem(slots, 'hoe', 1);
          kit = addItem(kit, 'watering_can', 1);
          kit = addItem(kit, 'turnip_seed', 5);
          kit = addItem(kit, 'pumpkin_seed', 5);
          slots = kit;
          kitGranted = true;
          changed = true;
        } catch {
          /* A full bag can claim its kit later; never block entry. */
        }
      }
      if (!action && !position && !changed) return snapshot();
      if (action?.kind === 'farm') {
        await tx.$queryRaw`SELECT "id" FROM "FarmPlot" WHERE "id"=${action.plot} FOR UPDATE`;
        const plot = await tx.farmPlot.findUnique({
          where: { id: action.plot },
        });
        if (
          !plot ||
          !position ||
          Math.hypot(
            plot.tileX * 32 + 16 - position.x,
            plot.tileY * 32 + 16 - position.y,
          ) > 72
        )
          throw new Error('Parcela fora de alcance.');
        if (plot.ownerId && plot.ownerId !== characterId)
          throw new Error('Esta parcela pertence a outro jogador.');
        if (action.operation === 'prepare') {
          if (!hasTool({ inventory: slots, equipment }, 'hoe'))
            throw new Error('Equipe a enxada.');
          if (plot.cropId || plot.prepared)
            throw new Error('A parcela já está preparada ou plantada.');
          if (
            !plot.ownerId &&
            (await tx.farmPlot.count({ where: { ownerId: characterId } })) >= 4
          )
            throw new Error('Limite de quatro parcelas por personagem.');
          await tx.farmPlot.update({
            where: { id: plot.id },
            data: { ownerId: characterId, prepared: true },
          });
        } else {
          if (plot.ownerId !== characterId)
            throw new Error('Prepare a parcela primeiro.');
          if (action.operation === 'plant') {
            if (!plot.prepared || plot.cropId || !action.crop)
              throw new Error('Prepare a terra e escolha uma cultura.');
            const crop = CROPS[action.crop];
            const seed = slots.find((s) => s.itemId === crop.seed);
            if (!seed) throw new Error('Sementes insuficientes.');
            seed.quantity--;
            slots = slots.filter((s) => s.quantity > 0);
            await tx.farmPlot.update({
              where: { id: plot.id },
              data: {
                cropId: action.crop,
                plantedAt: new Date(),
                wateredAt: null,
                harvestAt: null,
              },
            });
          } else if (action.operation === 'water') {
            if (!hasTool({ inventory: slots, equipment }, 'watering_can'))
              throw new Error('Equipe o regador.');
            if (!plot.cropId || plot.wateredAt)
              throw new Error(
                'Plante primeiro; cada cultura precisa de uma rega.',
              );
            const crop = CROPS[plot.cropId as CropId];
            if (!crop) throw new Error('Cultura inválida.');
            const now = new Date();
            await tx.farmPlot.update({
              where: { id: plot.id },
              data: {
                wateredAt: now,
                harvestAt: new Date(now.getTime() + crop.growMs),
              },
            });
          } else if (action.operation === 'harvest') {
            if (
              !plot.cropId ||
              !plot.harvestAt ||
              plot.harvestAt.getTime() > Date.now()
            )
              throw new Error('A cultura ainda não está pronta.');
            const crop = CROPS[plot.cropId as CropId];
            if (!crop) throw new Error('Cultura inválida.');
            slots = addItem(slots, crop.item, 3);
            slots = addItem(slots, crop.seed, 2);
            await tx.characterSkill.update({
              where: {
                characterId_profession: { characterId, profession: 'farmer' },
              },
              data: { xp: { increment: 25 } },
            });
            await tx.farmPlot.update({
              where: { id: plot.id },
              data: {
                prepared: false,
                cropId: null,
                plantedAt: null,
                wateredAt: null,
                harvestAt: null,
              },
            });
          } else {
            if (plot.cropId)
              throw new Error('Colha antes de liberar a parcela.');
            await tx.farmPlot.update({
              where: { id: plot.id },
              data: { ownerId: null, prepared: false },
            });
          }
        }
        changed = true;
      }
      if (action?.kind === 'transfer') {
        slots = transferItem(slots, action.from, action.to, action.quantity);
        changed = true;
      }
      if (action?.kind === 'equip') {
        const item = slots.find((s) => s.index === action.from);
        if (!item || !ITEMS[item.itemId].tool)
          throw new Error('Escolha uma ferramenta.');
        const tool = item.itemId;
        slots = slots.filter((s) => s.index !== action.from);
        for (const old of equipment) slots = addItem(slots, old.itemId, 1);
        equipment = [{ slot: 'tool', itemId: tool }];
        changed = true;
      }
      if (action?.kind === 'unequip') {
        for (const old of equipment) slots = addItem(slots, old.itemId, 1);
        equipment = [];
        changed = true;
      }
      if (action?.kind === 'gather') {
        if (!reward) throw new Error('Recurso indisponível.');
        const needed =
          reward.item === 'wood'
            ? 'axe'
            : reward.item === 'stone'
              ? 'pickaxe'
              : 'sickle';
        if (!hasTool({ inventory: slots, equipment }, needed))
          throw new Error('Equipe a ferramenta adequada.');
        slots = addItem(slots, reward.item, 3);
        await advanceQuests(tx, characterId, 'gather', reward.item, 3);
        await tx.characterSkill.update({
          where: {
            characterId_profession: {
              characterId,
              profession: reward.profession,
            },
          },
          data: { xp: { increment: 10 } },
        });
        changed = true;
      }
      if (action?.kind === 'craft') {
        const recipe = CRAFTING_RECIPES[action.recipeId];
        if (!recipe) throw new Error('Receita desconhecida.');
        const station = CRAFTING_STATIONS.find(
          (s) => s.id === action.stationId,
        );
        if (!station) throw new Error('Estação de trabalho desconhecida.');
        if (station.type !== recipe.station)
          throw new Error('Estação incorreta para esta receita.');
        if (
          !position ||
          Math.hypot(station.x - position.x, station.y - position.y) > 72
        )
          throw new Error('Estação de trabalho fora de alcance.');
        slots = craftItem(slots, recipe);
        await advanceQuests(
          tx,
          characterId,
          'craft',
          recipe.output.itemId,
          recipe.output.quantity,
        );
        await tx.characterSkill.update({
          where: {
            characterId_profession: {
              characterId,
              profession: recipe.profession,
            },
          },
          data: { xp: { increment: recipe.xp } },
        });
        changed = true;
      }
      if (action?.kind === 'attack') {
        if (reward) {
          slots = addItem(slots, reward.item, reward.quantity ?? 1);
          await advanceQuests(tx, characterId, 'defeat', 'slime', 1);
          await tx.characterSkill.update({
            where: {
              characterId_profession: {
                characterId,
                profession: 'warrior',
              },
            },
            data: { xp: { increment: reward.xp ?? 30 } },
          });
          changed = true;
        }
      }
      if (changed) {
        await tx.inventorySlot.deleteMany({ where: { characterId } });
        if (slots.length)
          await tx.inventorySlot.createMany({
            data: slots.map((s) => ({ ...s, characterId })),
          });
        await tx.characterEquipment.deleteMany({ where: { characterId } });
        if (equipment.length)
          await tx.characterEquipment.createMany({
            data: equipment.map((s) => ({ ...s, characterId })),
          });
      }
      if (changed || position)
        await tx.character.update({
          where: { id: characterId },
          data: {
            ...position,
            starterGranted: true,
            farmingKitGranted: kitGranted,
            revision: { increment: 1 },
          },
        });
      if (action)
        await tx.gameActionReceipt.create({
          data: { characterId, actionId: action.id },
        });
      const updated = await tx.character.findUniqueOrThrow({
        where: { id: characterId },
        include: { inventory: true, equipment: true, skills: true },
      });
      return {
        characterId,
        revision: updated.revision,
        inventory: updated.inventory.map((s) => ({
          index: s.index,
          itemId: s.itemId as ItemId,
          quantity: s.quantity,
        })),
        equipment: updated.equipment.map((s) => ({
          slot: s.slot,
          itemId: s.itemId as ItemId,
        })),
        skills: updated.skills.map((s) => ({
          profession: s.profession,
          xp: s.xp,
        })),
      };
    });
  }
  async receipt(characterId: string, actionId: string) {
    return this.db.gameActionReceipt.findUnique({
      where: { characterId_actionId: { characterId, actionId } },
    });
  }
  async plots(): Promise<FarmSnapshot[]> {
    const plots = await this.db.farmPlot.findMany({
      orderBy: [{ tileY: 'asc' }, { tileX: 'asc' }],
    });
    return plots.map((p) => ({
      id: p.id,
      tileX: p.tileX,
      tileY: p.tileY,
      ownerId: p.ownerId,
      prepared: p.prepared,
      cropId: p.cropId as CropId | null,
      plantedAt: p.plantedAt?.getTime() ?? null,
      wateredAt: p.wateredAt?.getTime() ?? null,
      harvestAt: p.harvestAt?.getTime() ?? null,
    }));
  }
}
