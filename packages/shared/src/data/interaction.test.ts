import { expect, it } from 'vitest';
import { hasTool, interaction } from './interaction.js';
import type { GameplaySnapshot } from './gameplay.js';
const s: GameplaySnapshot = {
  characterId: 'a',
  revision: 0,
  inventory: [{ index: 0, itemId: 'axe', quantity: 1 }],
  equipment: [],
  skills: [],
};
it('uses tools carried in the bag and requires proximity', () => {
  expect(hasTool(s, 'axe')).toBe(true);
  expect(hasTool(s, 'pickaxe')).toBe(false);
  const c = interaction(s, { x: 1080, y: 1080 }, [], {}, 0, 'turnip');
  expect(c?.enabled).toBe(true);
  expect(c?.payload).toEqual({ kind: 'gather', node: 'wood-plaza' });
  expect(
    interaction(s, { x: 1800, y: 1800 }, [], {}, 0, 'turnip'),
  ).toBeUndefined();
});
it('blocks cooldown and plots belonging to others', () => {
  expect(
    interaction(
      s,
      { x: 1080, y: 1080 },
      [],
      { 'wood-plaza': 5000 },
      100,
      'turnip',
    )?.enabled,
  ).toBe(false);
  expect(
    interaction(
      s,
      { x: 336, y: 1232 },
      [
        {
          id: 'p',
          tileX: 10,
          tileY: 38,
          ownerId: 'b',
          prepared: true,
          cropId: null,
          harvestAt: null,
          wateredAt: null,
          plantedAt: null,
        },
      ],
      {},
      0,
      'turnip',
    )?.enabled,
  ).toBe(false);
});
it('detects live monsters within range and returns attack action payload', () => {
  const monster = {
    id: 'slime-1',
    x: 1540,
    y: 1700,
    health: 60,
    maxHealth: 60,
    state: 'idle' as const,
  };
  const target = interaction(
    s,
    { x: 1540, y: 1700 },
    [],
    {},
    0,
    'turnip',
    undefined,
    [monster],
  );
  expect(target?.enabled).toBe(true);
  expect(target?.payload).toEqual({ kind: 'attack', targetId: 'slime-1' });
  expect(target?.label).toContain('Atacar Slime Saltitante (60/60 HP)');
});
it('detects nearby NPCs and returns open_dialogue action payload', () => {
  const target = interaction(s, { x: 1040, y: 980 }, [], {}, 0, 'turnip');
  expect(target?.enabled).toBe(true);
  expect(target?.payload).toEqual({
    kind: 'open_dialogue',
    npcId: 'elder-eldrin',
  });
  expect(target?.label).toBe('Conversar com Ancião Eldrin');
});
