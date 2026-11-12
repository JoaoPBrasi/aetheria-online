import { combatLevel } from './talents.js';
import { CRIT_CHANCE } from './skills.js';

export const ATTRIBUTE_IDS = [
  'strength',
  'agility',
  'vitality',
  'luck',
  'intellect',
] as const;
export type AttributeId = (typeof ATTRIBUTE_IDS)[number];
export type AttributeRanks = Partial<Record<AttributeId, number>>;
export const MAX_ATTRIBUTE_RANK = 10;
export const BASE_MOVEMENT_SPEED = 160;
export const BASE_RARE_DROP_CHANCE = 0.02;

export const ATTRIBUTES = {
  strength: {
    name: 'Força',
    effect: '+2 de ataque físico nos golpes básicos e habilidades físicas.',
  },
  agility: {
    name: 'Agilidade',
    effect:
      '+1 ponto percentual de esquiva, +2% de velocidade de ataque básico e +1,5% de velocidade de movimento.',
  },
  vitality: {
    name: 'Vitalidade',
    effect: '+6 de vida máxima e +1 de defesa física.',
  },
  luck: {
    name: 'Sorte',
    effect:
      '+1 ponto percentual nas chances de crítico e saque raro. +4 pontos percentuais na chance de obter uma unidade extra na coleta ou colheita.',
  },
  intellect: {
    name: 'Inteligência',
    effect: '+3 de dano arcano e +2 de cura nas habilidades.',
  },
} satisfies Record<AttributeId, { name: string; effect: string }>;

export function readAttributeRanks(raw: unknown): AttributeRanks {
  const ranks: AttributeRanks = {};
  if (!raw || typeof raw !== 'object') return ranks;
  for (const id of ATTRIBUTE_IDS) {
    const value = (raw as Record<string, unknown>)[id];
    if (typeof value === 'number' && Number.isInteger(value) && value > 0)
      ranks[id] = Math.min(value, MAX_ATTRIBUTE_RANK);
  }
  return ranks;
}

export function availableAttributePoints(xp: number, ranks: AttributeRanks) {
  const earned = Math.min(
    combatLevel(xp),
    ATTRIBUTE_IDS.length * MAX_ATTRIBUTE_RANK,
  );
  return Math.max(
    0,
    earned - ATTRIBUTE_IDS.reduce((sum, id) => sum + (ranks[id] ?? 0), 0),
  );
}

export function attributeBonuses(ranks: AttributeRanks = {}) {
  const agility = ranks.agility ?? 0;
  const luck = ranks.luck ?? 0;
  const vitality = ranks.vitality ?? 0;
  const intellect = ranks.intellect ?? 0;
  return {
    physicalAttack: (ranks.strength ?? 0) * 2,
    defense: vitality,
    maxHealth: vitality * 6,
    arcaneDamage: intellect * 3,
    healing: intellect * 2,
    dodgeChance: agility / 100,
    attackRate: 1 + agility * 0.02,
    movementSpeed: BASE_MOVEMENT_SPEED * (1 + agility * 0.015),
    basicCritChance: luck / 100,
    skillCritChance: CRIT_CHANCE + luck / 100,
    rareDropChance: BASE_RARE_DROP_CHANCE + luck / 100,
    extraResourceChance: luck * 0.04,
  };
}
