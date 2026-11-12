export const TALENT_IDS = [
  'strength',
  'vitality',
  'intellect',
  'cleave',
  'charge',
  'heal',
  'magic_dart',
] as const;
export type TalentId = (typeof TALENT_IDS)[number];
export type TalentRanks = Partial<Record<TalentId, number>>;

export const TALENTS: Record<
  TalentId,
  { name: string; effect: string; max: number; requires?: TalentId }
> = {
  strength: { name: 'Força', effect: '+2 de ataque físico por ponto', max: 5 },
  vitality: {
    name: 'Vitalidade',
    effect: '+5 de vida máxima por ponto',
    max: 5,
  },
  intellect: {
    name: 'Intelecto',
    effect: '+2 de dano arcano e cura por ponto',
    max: 5,
  },
  cleave: {
    name: 'Lâmina Pesada',
    effect: '+4 de dano em Golpe Fendido por ponto',
    max: 3,
    requires: 'strength',
  },
  charge: {
    name: 'Investida Brutal',
    effect: '+5 de dano em Investida por ponto',
    max: 3,
    requires: 'strength',
  },
  heal: {
    name: 'Curativo Reforçado',
    effect: '+5 de cura em Primeiros Socorros por ponto',
    max: 3,
    requires: 'vitality',
  },
  magic_dart: {
    name: 'Foco Arcano',
    effect: '+4 de dano em Dardo Arcano por ponto',
    max: 3,
    requires: 'intellect',
  },
};

export function readTalentRanks(raw: unknown): TalentRanks {
  const ranks: TalentRanks = {};
  if (!raw || typeof raw !== 'object') return ranks;
  for (const id of TALENT_IDS) {
    const value = (raw as Record<string, unknown>)[id];
    if (typeof value === 'number' && Number.isInteger(value) && value > 0)
      ranks[id] = Math.min(value, TALENTS[id].max);
  }
  return ranks;
}

export const TALENT_XP = 100;
export const combatLevel = (xp: number) => 1 + Math.floor(xp / TALENT_XP);
export function availableTalentPoints(xp: number, ranks: TalentRanks) {
  return Math.max(
    0,
    combatLevel(xp) - TALENT_IDS.reduce((sum, id) => sum + (ranks[id] ?? 0), 0),
  );
}

export function talentBlock(id: TalentId, ranks: TalentRanks, xp: number) {
  const talent = TALENTS[id];
  if ((ranks[id] ?? 0) >= talent.max) return 'Grau máximo.';
  if (talent.requires && !ranks[talent.requires])
    return `Requer 1 ponto em ${TALENTS[talent.requires].name}.`;
  if (!availableTalentPoints(xp, ranks)) return 'Sem pontos de talento.';
}

export const physicalTalentBonus = (ranks?: TalentRanks) =>
  (ranks?.strength ?? 0) * 2;
export const vitalityTalentBonus = (ranks?: TalentRanks) =>
  (ranks?.vitality ?? 0) * 5;
export const arcaneTalentBonus = (ranks?: TalentRanks) =>
  (ranks?.intellect ?? 0) * 2;
