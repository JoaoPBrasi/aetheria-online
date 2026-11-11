import { describe, expect, it } from 'vitest';
import {
  calculateCharacterStats,
  getEquipmentSlot,
  EQUIPMENT_DEFINITIONS,
  EQUIPMENT_SLOTS,
} from './equipment.js';

describe('Equipment Shared System', () => {
  it('determina corretamente os slots de armaduras, escudos e ferramentas', () => {
    expect(getEquipmentSlot('iron_helmet')).toBe('head');
    expect(getEquipmentSlot('iron_armor')).toBe('chest');
    expect(getEquipmentSlot('iron_greaves')).toBe('legs');
    expect(getEquipmentSlot('leather_boots')).toBe('feet');
    expect(getEquipmentSlot('iron_shield')).toBe('offHand');
    expect(getEquipmentSlot('forest_amulet')).toBe('accessory');
    expect(getEquipmentSlot('iron_sword')).toBe('tool');
    expect(getEquipmentSlot('wood')).toBeUndefined();
  });

  it('calcula atributos básicos de personagem sem nenhum equipamento (desarmado)', () => {
    const stats = calculateCharacterStats([]);
    expect(stats.maxHealth).toBe(100);
    expect(stats.defense).toBe(0);
    expect(stats.attack).toBe(20); // Dano desarmado
    expect(stats.bonusHp).toBe(0);
    expect(stats.bonusAttack).toBe(0);
    expect(stats.critChance).toBe(15);
  });

  it('calcula atributos expandidos com conjunto de ferro completo e espada de ferro', () => {
    const equipment = [
      { slot: 'head', itemId: 'iron_helmet' as const }, // +15 HP, +3 Def
      { slot: 'chest', itemId: 'iron_armor' as const },   // +25 HP, +6 Def
      { slot: 'legs', itemId: 'iron_greaves' as const },  // +15 HP, +3 Def
      { slot: 'feet', itemId: 'leather_boots' as const }, // +5 HP, +1 Def
      { slot: 'offHand', itemId: 'iron_shield' as const },// +20 HP, +6 Def
      { slot: 'accessory', itemId: 'forest_amulet' as const }, // +15 HP, +1 Def, +2 Atk
      { slot: 'tool', itemId: 'iron_sword' as const },
    ];

    const stats = calculateCharacterStats(equipment, 45); // Espada de ferro = 45 dano base

    // HP = 100 + (15 + 25 + 15 + 5 + 20 + 15) = 195
    expect(stats.maxHealth).toBe(195);
    expect(stats.bonusHp).toBe(95);

    // Defesa = 3 + 6 + 3 + 1 + 6 + 1 = 20
    expect(stats.defense).toBe(20);

    // Ataque = 45 (espada) + 2 (amuleto) = 47
    expect(stats.attack).toBe(47);
    expect(stats.bonusAttack).toBe(2);
  });

  it('todos os itens com definição possuem slot válido dentro de EQUIPMENT_SLOTS', () => {
    for (const [itemId, def] of Object.entries(EQUIPMENT_DEFINITIONS)) {
      expect(EQUIPMENT_SLOTS).toContain(def.slot);
      expect(def.armor).toBeGreaterThanOrEqual(0);
      expect(def.bonusHp).toBeGreaterThanOrEqual(0);
      expect(def.bonusAttack).toBeGreaterThanOrEqual(0);
    }
  });
});
