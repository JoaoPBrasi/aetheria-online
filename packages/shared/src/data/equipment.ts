import type { ItemId } from './gameplay.js';
import { attributeBonuses, type AttributeRanks } from './attributes.js';
import {
  physicalTalentBonus,
  vitalityTalentBonus,
  type TalentRanks,
} from './talents.js';

export const EQUIPMENT_SLOTS = [
  'head',
  'chest',
  'legs',
  'feet',
  'tool',
  'offHand',
  'accessory',
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  head: 'Elmo / Cabeça',
  chest: 'Peitoral / Armadura',
  legs: 'Calças / Pernas',
  feet: 'Botas / Pés',
  tool: 'Mão Principal / Arma',
  offHand: 'Mão Secundária / Escudo',
  accessory: 'Acessório / Amuleto',
};

export interface EquipmentPieceDefinition {
  slot: EquipmentSlot;
  name: string;
  armor: number;
  bonusHp: number;
  bonusAttack: number;
  speedPercent?: number;
  icon: string;
}

export const EQUIPMENT_DEFINITIONS: Partial<
  Record<ItemId, EquipmentPieceDefinition>
> = {
  cloth_hood: {
    slot: 'head',
    name: 'Capuz de Pano',
    armor: 1,
    bonusHp: 5,
    bonusAttack: 0,
    icon: '🧙',
  },
  iron_helmet: {
    slot: 'head',
    name: 'Elmo de Ferro',
    armor: 3,
    bonusHp: 15,
    bonusAttack: 0,
    icon: '🪖',
  },
  leather_tunic: {
    slot: 'chest',
    name: 'Túnica de Couro',
    armor: 2,
    bonusHp: 10,
    bonusAttack: 0,
    icon: '🥋',
  },
  iron_armor: {
    slot: 'chest',
    name: 'Armadura de Ferro',
    armor: 6,
    bonusHp: 25,
    bonusAttack: 0,
    icon: '🛡️',
  },
  linen_pants: {
    slot: 'legs',
    name: 'Calças de Linho',
    armor: 1,
    bonusHp: 5,
    bonusAttack: 0,
    icon: '👖',
  },
  iron_greaves: {
    slot: 'legs',
    name: 'Grevas de Ferro',
    armor: 3,
    bonusHp: 15,
    bonusAttack: 0,
    icon: '🦵',
  },
  leather_boots: {
    slot: 'feet',
    name: 'Botas de Couro',
    armor: 1,
    bonusHp: 5,
    bonusAttack: 0,
    speedPercent: 5,
    icon: '🥾',
  },
  wooden_shield: {
    slot: 'offHand',
    name: 'Escudo de Madeira',
    armor: 3,
    bonusHp: 10,
    bonusAttack: 0,
    icon: '🛡️',
  },
  iron_shield: {
    slot: 'offHand',
    name: 'Escudo de Ferro',
    armor: 6,
    bonusHp: 20,
    bonusAttack: 0,
    icon: '🛡️',
  },
  forest_amulet: {
    slot: 'accessory',
    name: 'Amuleto da Floresta',
    armor: 1,
    bonusHp: 15,
    bonusAttack: 2,
    icon: '📿',
  },
};

const BASE_TOOL_IDS = new Set<string>([
  'axe',
  'iron_axe',
  'pickaxe',
  'sickle',
  'hoe',
  'watering_can',
  'sword',
  'iron_sword',
]);

/**
 * Determina o slot de equipamento de qualquer item do jogo.
 * Retorna 'tool' para ferramentas/armas se não for uma armadura dedicada.
 */
export function getEquipmentSlot(itemId: ItemId): EquipmentSlot | undefined {
  if (EQUIPMENT_DEFINITIONS[itemId]) {
    return EQUIPMENT_DEFINITIONS[itemId]!.slot;
  }
  if (BASE_TOOL_IDS.has(itemId)) {
    return 'tool';
  }
  return undefined;
}

export interface CharacterAttributes {
  maxHealth: number;
  defense: number;
  attack: number;
  bonusHp: number;
  bonusAttack: number;
  critChance: number;
  dodgeChance: number;
  movementSpeed: number;
}

/**
 * Calcula o total de atributos do personagem considerando armaduras, escudos e armas equipadas.
 */
export function calculateCharacterStats(
  equipment: { slot: string; itemId: ItemId }[],
  baseWeaponDamage = 20,
  attributes?: AttributeRanks,
  talents?: TalentRanks,
): CharacterAttributes {
  let defense = 0;
  let bonusHp = 0;
  let bonusAttack = 0;

  for (const eq of equipment) {
    const def = EQUIPMENT_DEFINITIONS[eq.itemId];
    if (def) {
      defense += def.armor;
      bonusHp += def.bonusHp;
      bonusAttack += def.bonusAttack;
    }
  }

  const progress = attributeBonuses(attributes);
  const maxHealth =
    100 + bonusHp + progress.maxHealth + vitalityTalentBonus(talents);
  const attack =
    baseWeaponDamage +
    bonusAttack +
    progress.physicalAttack +
    physicalTalentBonus(talents);

  return {
    maxHealth,
    defense: defense + progress.defense,
    attack,
    bonusHp,
    bonusAttack,
    critChance: Math.round(progress.skillCritChance * 100),
    dodgeChance: progress.dodgeChance,
    movementSpeed: progress.movementSpeed,
  };
}
