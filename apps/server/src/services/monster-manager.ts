import {
  MONSTERS,
  canStand,
  type ItemId,
  type MonsterSnapshot,
  type MonsterKind,
} from '@aetheria/shared';

const WINDUP_MS = 700;
const RECOVERY_MS = 1_000;

export interface RuntimeMonster {
  id: string;
  kind: MonsterKind;
  name: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  aggroRange: number;
  attackRange: number;
  returnRange: number;
  xp: number;
  drop: { itemId: ItemId; quantity: number };
  state: MonsterSnapshot['state'];
  targetCharacterId?: string;
  strikeAt?: number;
  lastAttackTime: number;
  respawnTime: number;
}

export interface PlayerTarget {
  sessionId: string;
  characterId: string;
  x: number;
  y: number;
  health: number;
  connected: boolean;
}

export class MonsterManager {
  private monsters = new Map<string, RuntimeMonster>();

  constructor() {
    for (const def of MONSTERS) {
      this.monsters.set(def.id, {
        id: def.id,
        kind: def.kind,
        name: def.name,
        x: def.spawnX,
        y: def.spawnY,
        spawnX: def.spawnX,
        spawnY: def.spawnY,
        health: def.maxHealth,
        maxHealth: def.maxHealth,
        damage: def.damage,
        speed: def.speed,
        aggroRange: def.aggroRange,
        attackRange: def.attackRange,
        returnRange: def.returnRange,
        xp: def.xp,
        drop: def.drop,
        state: 'idle',
        lastAttackTime: 0,
        respawnTime: 0,
      });
    }
  }

  snapshots(): MonsterSnapshot[] {
    return Array.from(this.monsters.values()).map((m) => ({
      id: m.id,
      x: Math.round(m.x),
      y: Math.round(m.y),
      health: m.health,
      maxHealth: m.maxHealth,
      state: m.state,
      targetId: m.targetCharacterId,
      strikeAt: m.strikeAt,
      attackRange: m.attackRange,
    }));
  }

  get(id: string): RuntimeMonster | undefined {
    return this.monsters.get(id);
  }
  threatens(characterId: string) {
    return [...this.monsters.values()].some(
      (m) => m.targetCharacterId === characterId,
    );
  }

  takeDamage(
    id: string,
    damage: number,
    attackerCharacterId: string,
  ): { monster: RuntimeMonster; killed: boolean } {
    const monster = this.monsters.get(id);
    if (!monster) throw new Error('Monstro não encontrado.');
    if (monster.state === 'dead' || monster.health <= 0) {
      throw new Error('Monstro já derrotado.');
    }

    monster.health = Math.max(0, monster.health - damage);
    if (monster.health <= 0) {
      monster.state = 'dead';
      monster.respawnTime = Date.now() + 15000;
      monster.targetCharacterId = undefined;
      monster.strikeAt = undefined;
      return { monster, killed: true };
    }

    if (monster.state !== 'windup') {
      monster.targetCharacterId = attackerCharacterId;
      monster.state = 'chase';
    }
    return { monster, killed: false };
  }

  tick(
    seconds: number,
    players: Map<string, PlayerTarget>,
    now = Date.now(),
  ): { playerDamages: { sessionId: string; damage: number }[] } {
    const playerDamages: { sessionId: string; damage: number }[] = [];

    for (const m of this.monsters.values()) {
      if (m.state === 'dead') {
        if (now >= m.respawnTime) {
          m.state = 'idle';
          m.health = m.maxHealth;
          m.x = m.spawnX;
          m.y = m.spawnY;
        }
        continue;
      }

      // Check target player validity
      let target = m.targetCharacterId
        ? players.get(m.targetCharacterId)
        : undefined;
      if (!target || !target.connected || target.health <= 0) {
        m.targetCharacterId = undefined;
        m.strikeAt = undefined;
        target = undefined;
      }

      const distFromSpawn = Math.hypot(m.x - m.spawnX, m.y - m.spawnY);
      if (target && distFromSpawn > m.returnRange) {
        m.targetCharacterId = undefined;
        m.strikeAt = undefined;
        target = undefined;
        m.state = 'return';
      }

      if (target) {
        const dx = target.x - m.x;
        const dy = target.y - m.y;
        const dist = Math.hypot(dx, dy);

        if (m.strikeAt !== undefined) {
          if (now < m.strikeAt) continue;
          m.strikeAt = undefined;
          m.lastAttackTime = now;
          m.state = 'attack';
          if (dist <= m.attackRange)
            playerDamages.push({
              sessionId: target.sessionId,
              damage: m.damage,
            });
          continue;
        }
        if (dist <= m.attackRange) {
          if (now - m.lastAttackTime >= RECOVERY_MS) {
            m.state = 'windup';
            m.strikeAt = now + WINDUP_MS;
          }
        } else {
          m.state = 'chase';
          const distance = m.speed * seconds;
          const nx = m.x + (dx / dist) * distance;
          const ny = m.y + (dy / dist) * distance;
          if (canStand(nx, ny)) {
            m.x = nx;
            m.y = ny;
          } else if (canStand(nx, m.y)) {
            m.x = nx;
          } else if (canStand(m.x, ny)) {
            m.y = ny;
          }
        }
      } else if (m.state === 'return') {
        const dx = m.spawnX - m.x;
        const dy = m.spawnY - m.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) {
          m.x = m.spawnX;
          m.y = m.spawnY;
          m.state = 'idle';
        } else {
          const distance = m.speed * seconds;
          const nx = m.x + (dx / dist) * distance;
          const ny = m.y + (dy / dist) * distance;
          if (canStand(nx, ny)) {
            m.x = nx;
            m.y = ny;
          } else {
            m.x = m.spawnX;
            m.y = m.spawnY;
            m.state = 'idle';
          }
        }
      } else {
        // Idle / Patrol search for nearby targets
        m.state = 'idle';
        for (const player of players.values()) {
          if (!player.connected || player.health <= 0) continue;
          const dist = Math.hypot(player.x - m.x, player.y - m.y);
          if (dist <= m.aggroRange) {
            m.targetCharacterId = player.characterId;
            m.state = 'chase';
            break;
          }
        }
      }
    }

    return { playerDamages };
  }
}
