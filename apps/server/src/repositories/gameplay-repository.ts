import type { Database } from '../database/client.js';
import { QuestRepository, advanceQuests } from './quest-repository.js';
import {
  addItem,
  attributeBonuses,
  availableAttributePoints,
  MAX_ATTRIBUTE_RANK,
  readAttributeRanks,
  readTalentRanks,
  talentBlock,
  transferItem,
  CROPS,
  FARM_RANGE,
  MAX_OWNED_PLOTS,
  HARVEST_YIELD,
  plotPosition,
  hasTool,
  CRAFTING_RECIPES,
  CRAFTING_STATIONS,
  CRAFTING_SERVER_MAX_RANGE,
  craftingStationRange,
  craftItem,
  DEFAULT_TREE_GROWTH_MS,
  MARKET_BUY_PRICES,
  MARKET_SELL_PRICES,
  getEquipmentSlot,
  type CropId,
  type FarmSnapshot,
  type GameAction,
  type GameplaySnapshot,
  type ItemId,
  type Slot,
  type MonsterKind,
  type ResourceStates,
  type ResourceDefinition,
} from '@aetheria/shared';
type Position = { x: number; y: number; direction: string };
const RARE_MONSTER_LOOT = {
  slime: 'forest_amulet',
  orc: 'iron_helmet',
  skeleton: 'iron_greaves',
} satisfies Record<MonsterKind, ItemId>;

function tryBonusItem(slots: Slot[], item: ItemId, chance: number) {
  if (chance <= 0 || Math.random() >= chance) return slots;
  try {
    return addItem(slots, item, 1);
  } catch (error) {
    if (error instanceof Error && error.message === 'Inventário cheio.')
      return slots;
    throw error;
  }
}

export class GameplayRepository {
  constructor(
    private db: Database,
    private treeGrowthMs = DEFAULT_TREE_GROWTH_MS,
  ) {}
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
      monster?: MonsterKind;
      weapon?: ItemId;
    },
    position?: Position,
    gatherNode?: ResourceDefinition,
    onConsumed?: () => void,
  ): Promise<GameplaySnapshot> {
    let consumed = false;
    const result = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Character" WHERE "id"=${characterId}::uuid FOR UPDATE`;
      const c = await tx.character.findUniqueOrThrow({
        where: { id: characterId },
        include: { inventory: true, equipment: true, skills: true },
      });
      const snapshot = (): GameplaySnapshot => ({
        characterId,
        revision: c.revision,
        talents: readTalentRanks(c.talents),
        attributes: readAttributeRanks(c.attributes),
        gold: c.gold,
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
      const talents = readTalentRanks(c.talents);
      const attributes = readAttributeRanks(c.attributes);
      let equipment = snapshot().equipment;
      let currentGold = c.gold;
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
      if (action?.kind === 'allocate_talent') {
        const xp =
          c.skills.find((skill) => skill.profession === 'warrior')?.xp ?? 0;
        if (talentBlock(action.talent, talents, xp))
          throw new Error('Investimento de talento indisponível.');
        talents[action.talent] = (talents[action.talent] ?? 0) + 1;
      }
      if (action?.kind === 'allocate_attribute') {
        const xp =
          c.skills.find((skill) => skill.profession === 'warrior')?.xp ?? 0;
        const rank = attributes[action.attribute] ?? 0;
        if (rank >= MAX_ATTRIBUTE_RANK)
          throw new Error('Atributo no grau máximo.');
        if (!availableAttributePoints(xp, attributes))
          throw new Error('Sem pontos de atributo.');
        attributes[action.attribute] = rank + 1;
      }
      if (action?.kind === 'farm') {
        await tx.$queryRaw`SELECT "id" FROM "FarmPlot" WHERE "id"=${action.plot} FOR UPDATE`;
        const plot = await tx.farmPlot.findUnique({
          where: { id: action.plot },
        });
        const point = plot && plotPosition(plot);
        if (
          !plot ||
          !point ||
          !position ||
          Math.hypot(point.x - position.x, point.y - position.y) > FARM_RANGE
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
            (await tx.farmPlot.count({ where: { ownerId: characterId } })) >=
              MAX_OWNED_PLOTS
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
            slots = addItem(slots, crop.item, HARVEST_YIELD.produce);
            slots = addItem(slots, crop.seed, HARVEST_YIELD.seeds);
            const harvest = tryBonusItem(
              slots,
              crop.item,
              attributeBonuses(attributes).extraResourceChance,
            );
            await advanceQuests(
              tx,
              characterId,
              'gather',
              crop.item,
              HARVEST_YIELD.produce + Number(harvest !== slots),
            );
            slots = harvest;
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
        if (!item) throw new Error('Item não encontrado.');
        const targetSlot = action.slot || getEquipmentSlot(item.itemId);
        if (!targetSlot) throw new Error('Este item não pode ser equipado.');

        // Remove a peça da mochila
        slots = slots.filter((s) => s.index !== action.from);

        // Se já houver um item naquele mesmo slot, devolve o antigo para a mochila
        const existing = equipment.find((e) => e.slot === targetSlot);
        if (existing) {
          slots = addItem(slots, existing.itemId, 1);
        }

        equipment = [
          ...equipment.filter((e) => e.slot !== targetSlot),
          { slot: targetSlot, itemId: item.itemId },
        ];
        changed = true;
      }
      if (action?.kind === 'unequip') {
        const targetSlot = action.slot;
        if (targetSlot) {
          const existing = equipment.find((e) => e.slot === targetSlot);
          if (existing) {
            slots = addItem(slots, existing.itemId, 1);
            equipment = equipment.filter((e) => e.slot !== targetSlot);
            changed = true;
          }
        } else {
          // Desequipa a ferramenta principal ou o primeiro item equipado
          const existingTool =
            equipment.find((e) => e.slot === 'tool') ?? equipment[0];
          if (existingTool) {
            slots = addItem(slots, existingTool.itemId, 1);
            equipment = equipment.filter((e) => e.slot !== existingTool.slot);
            changed = true;
          }
        }
        changed = true;
      }
      if (action?.kind === 'consume') {
        const item = slots.find((slot) => slot.index === action.from);
        if (!item || item.itemId !== 'roasted_turnip')
          throw new Error('Escolha um nabo assado.');
        if (!onConsumed) throw new Error('Entre na vila para agir.');
        item.quantity -= 1;
        slots = slots.filter((slot) => slot.quantity > 0);
        changed = true;
        consumed = true;
      }
      if (action?.kind === 'gather') {
        const node = gatherNode;
        if (!node || node.id !== action.node)
          throw new Error('Recurso indisponível.');
        if (
          !position ||
          Math.hypot(node.x - position.x, node.y - position.y) > 72
        )
          throw new Error('Recurso fora de alcance.');
        if (node.tool && !hasTool({ inventory: slots, equipment }, node.tool))
          throw new Error('Equipe a ferramenta adequada.');
        if (node.kind === 'tree') {
          const affected = await tx.$executeRaw`
            INSERT INTO "GroveTree" ("nodeId", "cutAt", "maturesAt")
            VALUES (${node.id}, statement_timestamp() AT TIME ZONE 'UTC',
              (statement_timestamp() AT TIME ZONE 'UTC') + (${this.treeGrowthMs}::double precision * INTERVAL '1 millisecond'))
            ON CONFLICT ("nodeId") DO UPDATE
            SET "cutAt" = EXCLUDED."cutAt", "maturesAt" = EXCLUDED."maturesAt"
            WHERE "GroveTree"."maturesAt" <= EXCLUDED."cutAt"
          `;
          if (!affected) throw new Error('Recurso se recuperando. Aguarde.');
        }
        slots = addItem(slots, node.item, 3);
        const collected = tryBonusItem(
          slots,
          node.item,
          attributeBonuses(attributes).extraResourceChance,
        );
        await advanceQuests(
          tx,
          characterId,
          'gather',
          node.item,
          3 + Number(collected !== slots),
        );
        slots = collected;
        await tx.characterSkill.update({
          where: {
            characterId_profession: {
              characterId,
              profession: node.profession,
            },
          },
          data: { xp: { increment: 10 } },
        });
        changed = true;
      }
      if (action?.kind === 'craft') {
        const recipe = CRAFTING_RECIPES[action.recipeId];
        if (!recipe) throw new Error('Receita desconhecida.');
        const namedStation = CRAFTING_STATIONS.find(
          (s) => s.id === action.stationId,
        );
        if (
          (recipe.station === 'campfire' ||
            namedStation?.type === 'campfire') &&
          namedStation?.type !== recipe.station
        )
          throw new Error('Estação incorreta para esta receita.');
        const matchingStation = CRAFTING_STATIONS.find(
          (s) =>
            recipe.station !== 'campfire' &&
            s.type === recipe.station &&
            position &&
            Math.hypot(s.x - position.x, s.y - position.y) <=
              CRAFTING_SERVER_MAX_RANGE,
        );
        const station = namedStation ?? matchingStation;
        if (!station) throw new Error('Estação de trabalho desconhecida.');
        if (station.type !== recipe.station && !matchingStation)
          throw new Error('Estação incorreta para esta receita.');
        const activeStation = matchingStation ?? station;
        if (
          !position ||
          Math.hypot(
            activeStation.x - position.x,
            activeStation.y - position.y,
          ) >
            craftingStationRange(activeStation.type, CRAFTING_SERVER_MAX_RANGE)
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
        await tx.characterSkill.upsert({
          where: {
            characterId_profession: {
              characterId,
              profession: recipe.profession,
            },
          },
          update: { xp: { increment: recipe.xp } },
          create: {
            characterId,
            profession: recipe.profession,
            xp: recipe.xp,
          },
        });
        changed = true;
      }
      if (action?.kind === 'attack' || action?.kind === 'skill') {
        if (reward) {
          slots = addItem(slots, reward.item, reward.quantity ?? 1);
          if (reward.monster)
            slots = tryBonusItem(
              slots,
              RARE_MONSTER_LOOT[reward.monster],
              attributeBonuses(attributes).rareDropChance,
            );
          await advanceQuests(
            tx,
            characterId,
            'defeat',
            reward.monster ?? 'slime',
            1,
            { monsterId: action.targetId ?? '', weapon: reward.weapon },
          );
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
      if (action?.kind === 'buy') {
        const itemPrice = MARKET_BUY_PRICES[action.itemId];
        if (!itemPrice) throw new Error('Este item não está à venda.');
        const totalCost = itemPrice * action.quantity;
        if (currentGold < totalCost)
          throw new Error(
            `Ouro insuficiente (${currentGold}/${totalCost} ouro).`,
          );
        slots = addItem(slots, action.itemId, action.quantity);
        currentGold -= totalCost;
        changed = true;
      }
      if (action?.kind === 'sell') {
        const item = slots.find((s) => s.index === action.from);
        if (!item || item.quantity < action.quantity)
          throw new Error('Quantidade insuficiente para venda.');
        const itemPrice = MARKET_SELL_PRICES[item.itemId];
        if (!itemPrice)
          throw new Error('A comerciante não compra este tipo de item.');
        const revenue = itemPrice * action.quantity;
        item.quantity -= action.quantity;
        slots = slots.filter((s) => s.quantity > 0);
        currentGold += revenue;
        changed = true;
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
      if (
        changed ||
        position ||
        action?.kind === 'allocate_talent' ||
        action?.kind === 'allocate_attribute'
      )
        await tx.character.update({
          where: { id: characterId },
          data: {
            x: position?.x,
            y: position?.y,
            direction: position?.direction,
            starterGranted: true,
            farmingKitGranted: kitGranted,
            gold: currentGold,
            talents: action?.kind === 'allocate_talent' ? talents : undefined,
            attributes:
              action?.kind === 'allocate_attribute' ? attributes : undefined,
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
        talents: readTalentRanks(updated.talents),
        attributes: readAttributeRanks(updated.attributes),
        gold: updated.gold,
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
    if (consumed) onConsumed?.();
    return result;
  }
  async receipt(characterId: string, actionId: string) {
    return this.db.gameActionReceipt.findUnique({
      where: { characterId_actionId: { characterId, actionId } },
    });
  }
  async growingTrees(): Promise<ResourceStates> {
    const trees = await this.db.groveTree.findMany({
      where: { maturesAt: { gt: new Date() } },
    });
    return Object.fromEntries(
      trees.map(({ nodeId, cutAt, maturesAt }) => [
        nodeId,
        { cutAt: cutAt.getTime(), readyAt: maturesAt.getTime() },
      ]),
    );
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
