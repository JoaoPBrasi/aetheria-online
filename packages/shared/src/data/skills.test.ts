import { describe, expect, it } from 'vitest';
import {
  calculateSkillDamage,
  COMBAT_SKILLS,
  CRIT_MULTIPLIER,
  HOTBAR_SKILL_IDS,
} from './skills.js';

describe('Combat Skills Data', () => {
  it('defines 4 active hotbar skills with valid properties', () => {
    expect(HOTBAR_SKILL_IDS.length).toBe(4);
    for (const id of HOTBAR_SKILL_IDS) {
      const skill = COMBAT_SKILLS[id];
      expect(skill).toBeDefined();
      expect(skill.name).toBeTruthy();
      expect(skill.icon).toBeTruthy();
      expect(skill.cooldownMs).toBeGreaterThan(0);
      expect(skill.range).toBeGreaterThanOrEqual(0);
    }
  });

  it('calculates cleave damage with 1.5x weapon multiplier', () => {
    const res = calculateSkillDamage('cleave', 30, false);
    expect(res.damage).toBe(45);
    expect(res.isCrit).toBe(false);
  });

  it('calculates critical hit damage with multiplier', () => {
    const res = calculateSkillDamage('cleave', 30, true);
    // 30 * 1.5 = 45; 45 * 1.5 = 68 (rounded)
    expect(res.damage).toBe(Math.round(45 * CRIT_MULTIPLIER));
    expect(res.isCrit).toBe(true);
  });

  it('calculates base damage skills like charge and magic_dart', () => {
    const chargeRes = calculateSkillDamage('charge', 20, false);
    expect(chargeRes.damage).toBe(35);

    const dartRes = calculateSkillDamage('magic_dart', 20, false);
    expect(dartRes.damage).toBe(25);
  });
});

