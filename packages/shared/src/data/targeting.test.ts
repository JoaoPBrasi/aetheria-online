import { describe, it, expect } from 'vitest';
import { getSelectedTarget, cycleNextTarget } from './targeting.js';
import type { MonsterSnapshot } from './gameplay.js';

describe('Targeting System (Shared)', () => {
  const dummyMonsters: MonsterSnapshot[] = [
    {
      id: 'slime-1',
      x: 1050,
      y: 1040,
      health: 45,
      maxHealth: 60,
      state: 'patrol',
      attackRange: 36,
    },
    {
      id: 'orc-1',
      x: 1200,
      y: 1040,
      health: 90,
      maxHealth: 90,
      state: 'idle',
      attackRange: 36,
    },
    {
      id: 'slime-dead',
      x: 1045,
      y: 1040,
      health: 0,
      maxHealth: 60,
      state: 'dead',
      attackRange: 36,
    },
  ];

  it('retorna os dados detalhados de um monstro vivo selecionado', () => {
    const target = getSelectedTarget(dummyMonsters, [], 'slime-1', {
      x: 1040,
      y: 1040,
    });
    expect(target).not.toBeNull();
    expect(target?.id).toBe('slime-1');
    expect(target?.kind).toBe('monster');
    expect(target?.health).toBe(45);
    expect(target?.maxHealth).toBe(60);
    expect(target?.hostile).toBe(true);
    expect(target?.distance).toBe(10);
  });

  it('retorna null para monstros mortos ou inexistentes', () => {
    expect(getSelectedTarget(dummyMonsters, [], 'slime-dead')).toBeNull();
    expect(getSelectedTarget(dummyMonsters, [], 'fantasma')).toBeNull();
    expect(getSelectedTarget(dummyMonsters, [], null)).toBeNull();
  });

  it('retorna os dados de um NPC amigável quando selecionado', () => {
    const target = getSelectedTarget([], undefined, 'elder-eldrin', {
      x: 1040,
      y: 980,
    });
    expect(target).not.toBeNull();
    expect(target?.kind).toBe('npc');
    expect(target?.name).toContain('Eldrin');
    expect(target?.hostile).toBe(false);
  });

  it('cicla corretamente entre monstros vivos mais próximos via Tab', () => {
    const playerPos = { x: 1040, y: 1040 };

    // Sem alvo atual: escolhe o mais próximo (slime-1 a 10px vs orc-1 a 160px)
    const first = cycleNextTarget(dummyMonsters, null, playerPos);
    expect(first).toBe('slime-1');

    // Tendo slime-1: cicla para o próximo mais próximo (orc-1)
    const second = cycleNextTarget(dummyMonsters, 'slime-1', playerPos);
    expect(second).toBe('orc-1');

    // No final da lista: dá a volta e retorna para o primeiro (slime-1)
    const wrap = cycleNextTarget(dummyMonsters, 'orc-1', playerPos);
    expect(wrap).toBe('slime-1');
  });

  it('ignora monstros fora do raio máximo de busca', () => {
    const playerPos = { x: 1040, y: 1040 };
    // orc-1 está a 160px de distância. Com raio de 50px, apenas slime-1 (10px) é encontrado.
    const onlyClose = cycleNextTarget(dummyMonsters, 'slime-1', playerPos, 50);
    expect(onlyClose).toBe('slime-1');
  });
});
