export type SkillId = 'cleave' | 'charge' | 'heal' | 'magic_dart';

export interface SkillDefinition {
  id: SkillId;
  name: string;
  icon: string;
  description: string;
  cooldownMs: number;
  range: number;
  type: 'melee' | 'dash' | 'heal' | 'ranged';
  baseDamage?: number;
  damageMultiplier?: number;
  healAmount?: number;
}

export const COMBAT_SKILLS: Record<SkillId, SkillDefinition> = {
  cleave: {
    id: 'cleave',
    name: 'Golpe Fendido',
    icon: '⚔️',
    description:
      'Ataque pesado que desfere 150% do dano no alvo em alcance corpo a corpo.',
    cooldownMs: 3500,
    range: 64,
    type: 'melee',
    damageMultiplier: 1.5,
  },
  charge: {
    id: 'charge',
    name: 'Investida',
    icon: '💨',
    description:
      'Avança em arrancada veloz até o monstro alvo causando 35 de dano físico.',
    cooldownMs: 7000,
    range: 160,
    type: 'dash',
    baseDamage: 35,
  },
  heal: {
    id: 'heal',
    name: 'Primeiros Socorros',
    icon: '🩹',
    description:
      'Aplica bandagens medicinais recuperando até 35 pontos de vida.',
    cooldownMs: 10000,
    range: 0,
    type: 'heal',
    healAmount: 35,
  },
  magic_dart: {
    id: 'magic_dart',
    name: 'Dardo Arcano',
    icon: '⚡',
    description:
      'Dispara um projétil veloz de energia mágica à distância causando 25 de dano.',
    cooldownMs: 4000,
    range: 200,
    type: 'ranged',
    baseDamage: 25,
  },
};

export const HOTBAR_SKILL_IDS: readonly SkillId[] = [
  'cleave',
  'charge',
  'heal',
  'magic_dart',
];

export const CRIT_CHANCE = 0.15;
export const CRIT_MULTIPLIER = 1.5;

/**
 * Calcula o dano de uma habilidade considerando arma e chance de crítico.
 */
export function calculateSkillDamage(
  skillId: SkillId,
  weaponDamage: number,
  forceCrit?: boolean,
  bonusDamage = 0,
): { damage: number; isCrit: boolean } {
  const def = COMBAT_SKILLS[skillId];
  if (!def) return { damage: weaponDamage, isCrit: false };

  let raw =
    (def.baseDamage ?? Math.round(weaponDamage * (def.damageMultiplier ?? 1))) +
    bonusDamage;
  const isCrit =
    forceCrit !== undefined ? forceCrit : Math.random() < CRIT_CHANCE;

  if (isCrit) {
    raw = Math.round(raw * CRIT_MULTIPLIER);
  }

  return { damage: raw, isCrit };
}
