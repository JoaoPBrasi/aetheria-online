import {
  GameActionSchema,
  RESOURCES,
  hasTool,
  PLAYER_ATTACK_RANGE,
  PLAYER_ATTACK_COOLDOWN_MS,
  UNARMED_DAMAGE,
  WEAPON_DAMAGE,
  type CombatFeedback,
  type GameplaySnapshot,
  type ItemId,
  type ResourceStates,
  QuestCommandSchema,
  QUESTS,
  NPCS,
} from '@aetheria/shared';
import type { GameplayRepository } from '../repositories/gameplay-repository.js';
import { MonsterManager } from './monster-manager.js';
import { ForageManager } from './forage-manager.js';
export class GameplayService {
  private queues = new Map<string, Promise<unknown>>();
  private cooldowns = new Map<string, number>();
  private attackCooldowns = new Map<string, number>();
  readonly forage = new ForageManager();
  readonly monstersManager = new MonsterManager();
  constructor(private repository: GameplayRepository) {}
  async resources(): Promise<ResourceStates> {
    const trees = await this.repository.growingTrees();
    const now = Date.now();
    for (const [id, readyAt] of this.cooldowns)
      if (readyAt <= now) this.cooldowns.delete(id);
    return {
      ...Object.fromEntries(
        [...this.cooldowns].map(([id, readyAt]) => [id, { readyAt }]),
      ),
      ...trees,
    };
  }
  plots() {
    return this.repository.plots();
  }
  monsters() {
    return this.monstersManager.snapshots();
  }
  private serial<T>(key: string, task: () => Promise<T>): Promise<T> {
    const work = (this.queues.get(key) ?? Promise.resolve())
      .catch(() => undefined)
      .then(task);
    this.queues.set(key, work);
    void work
      .finally(() => {
        if (this.queues.get(key) === work) this.queues.delete(key);
      })
      .catch(() => undefined);
    return work;
  }
  sync(id: string) {
    return this.serial(id, () => this.repository.execute(id));
  }
  save(id: string, position: { x: number; y: number; direction: string }) {
    return this.serial(id, () =>
      this.repository.execute(id, undefined, undefined, position),
    );
  }
  act(
    id: string,
    raw: unknown,
    getPosition: () => { x: number; y: number; direction: string } | undefined,
    onStrike?: (feedback: Extract<CombatFeedback, { kind: 'strike' }>) => void,
    prepareConsumption?: () => () => void,
  ): Promise<GameplaySnapshot> {
    const parsed = GameActionSchema.safeParse(raw);
    if (!parsed.success) return Promise.reject(new Error('Comando inválido.'));
    const action = parsed.data;
    // Reject backlogs rather than accumulating unbounded economic actions.
    if (this.queues.has(id))
      return Promise.reject(new Error('Aguarde a operação anterior.'));
    return this.serial(id, async () => {
      const position = getPosition();
      if (!position) throw new Error('Entre na vila para agir.');
      if (await this.repository.receipt(id, action.id))
        return this.repository.execute(id);
      if (action.kind === 'consume') {
        if (!prepareConsumption) throw new Error('Entre na vila para agir.');
        return this.repository.execute(
          id,
          action,
          undefined,
          position,
          undefined,
          prepareConsumption(),
        );
      }
      if (action.kind === 'attack') {
        return this.serial(`monster:${action.targetId}`, async () => {
          const monster = this.monstersManager.get(action.targetId);
          if (!monster) throw new Error('Monstro não encontrado.');
          if (monster.state === 'dead' || monster.health <= 0)
            throw new Error('Monstro já derrotado.');
          const current = getPosition();
          if (
            !current ||
            Math.hypot(monster.x - current.x, monster.y - current.y) >
              PLAYER_ATTACK_RANGE
          )
            throw new Error('Monstro fora de alcance.');
          const now = Date.now();
          if (
            now - (this.attackCooldowns.get(id) ?? 0) <
            PLAYER_ATTACK_COOLDOWN_MS
          )
            throw new Error('Aguarde o golpe anterior.');

          const equipment = await this.repository.execute(id);
          const weapon: ItemId | undefined = hasTool(equipment, 'iron_sword')
            ? 'iron_sword'
            : hasTool(equipment, 'sword')
              ? 'sword'
              : undefined;
          const damage = weapon ? WEAPON_DAMAGE[weapon] : UNARMED_DAMAGE;
          const lethal = damage >= monster.health;
          const reward = lethal
            ? {
                item: monster.drop.itemId as ItemId,
                quantity: monster.drop.quantity,
                profession: 'warrior',
                xp: monster.xp,
                monster: monster.kind,
                weapon,
              }
            : undefined;
          const amount = Math.min(damage, monster.health);
          const snapshot = await this.repository.execute(
            id,
            action,
            reward,
            current,
          );
          this.monstersManager.takeDamage(monster.id, damage, id);
          this.attackCooldowns.set(id, now);
          onStrike?.({
            kind: 'strike',
            attackerId: id,
            monsterId: monster.id,
            origin: { x: current.x, y: current.y },
            x: monster.x,
            y: monster.y,
            amount,
            lethal,
          });
          return snapshot;
        });
      }
      if (action.kind === 'craft') {
        const result = await this.repository.execute(
          id,
          action,
          undefined,
          position,
        );
        return result;
      }
      if (action.kind !== 'gather')
        return this.repository.execute(id, action, undefined, position);
      const wild = this.forage.get(action.node);
      const node = wild ?? RESOURCES.find((n) => n.id === action.node);
      if (!node || Math.hypot(node.x - position.x, node.y - position.y) > 72)
        throw new Error('Recurso fora de alcance.');
      return this.serial(`node:${node.id}`, async () => {
        if (wild && !this.forage.get(node.id))
          throw new Error('Recurso indisponível.');
        const current = getPosition();
        if (!current || Math.hypot(node.x - current.x, node.y - current.y) > 72)
          throw new Error('Recurso fora de alcance.');
        if ((this.cooldowns.get(node.id) ?? 0) > Date.now())
          throw new Error('Recurso se recuperando. Aguarde.');
        const result = await this.repository.execute(
          id,
          action,
          undefined,
          current,
          node,
        );
        if (wild) this.forage.collect(node.id, Date.now());
        else if (node.kind !== 'tree')
          this.cooldowns.set(node.id, Date.now() + 5000);
        return result;
      });
    });
  }
  quests(id: string) {
    return this.repository.quests().list(id);
  }
  private questAt(raw: unknown, position: { x: number; y: number }) {
    const parsed = QuestCommandSchema.safeParse(raw);
    if (!parsed.success) throw new Error('Comando de missão inválido.');
    const questId = parsed.data.questId;
    const npc = NPCS.find((n) => n.id === QUESTS[questId]?.giverNpcId);
    if (!npc || Math.hypot(npc.x - position.x, npc.y - position.y) > 72)
      throw new Error('Aproxime-se do Ancião Eldrin.');
    return questId;
  }
  acceptQuest(
    id: string,
    raw: unknown,
    getPosition: () => { x: number; y: number } | undefined,
  ) {
    return this.serial(id, async () => {
      const position = getPosition();
      if (!position) throw new Error('Entre na vila para agir.');
      const questId = this.questAt(raw, position);
      await this.repository.quests().accept(id, questId);
      return this.repository.execute(id);
    });
  }
  turnInQuest(
    id: string,
    raw: unknown,
    getPosition: () => { x: number; y: number } | undefined,
  ) {
    return this.serial(id, async () => {
      const position = getPosition();
      if (!position) throw new Error('Entre na vila para agir.');
      const questId = this.questAt(raw, position);
      await this.repository.quests().turnIn(id, questId);
      return this.repository.execute(id);
    });
  }
}
