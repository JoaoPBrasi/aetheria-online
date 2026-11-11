import { expect, it } from 'vitest';
import { MonsterManager, type PlayerTarget } from './monster-manager.js';

it('anuncia o golpe e aplica dano só se o jogador continuar no alcance', () => {
  const manager = new MonsterManager();
  const monster = manager.get('south-slime-1')!;
  const player: PlayerTarget = {
    sessionId: 'sessão',
    characterId: 'aventureiro',
    x: monster.x,
    y: monster.y,
    health: 100,
    connected: true,
  };
  const players = new Map([[player.characterId, player]]);
  manager.tick(0.05, players, 10_000);
  expect(manager.tick(0.05, players, 10_050).playerDamages).toEqual([]);
  expect(monster.state).toBe('windup');
  expect(manager.tick(0.05, players, 10_749).playerDamages).toEqual([]);
  player.x += monster.attackRange + 8;
  expect(manager.tick(0.05, players, 10_750).playerDamages).toEqual([]);
  player.x = monster.x;
  manager.tick(0.05, players, 11_750);
  expect(monster.state).toBe('windup');
  expect(manager.tick(0.05, players, 12_450).playerDamages).toEqual([
    { sessionId: player.sessionId, damage: monster.damage },
  ]);
});
