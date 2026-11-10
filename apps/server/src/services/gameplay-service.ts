import {
  GameActionSchema,
  RESOURCES,
  hasTool,
  type GameplaySnapshot,
  type ItemId,
} from '@aetheria/shared';
import type { GameplayRepository } from '../repositories/gameplay-repository.js';
import { MonsterManager } from './monster-manager.js';
import { QuestManager } from './quest-manager.js';
export class GameplayService {
  private queues = new Map<string, Promise<unknown>>();
  private cooldowns = new Map<string, number>();
  private attackCooldowns = new Map<string, number>();
  readonly monstersManager = new MonsterManager();
  readonly questsManager = new QuestManager();
  constructor(private repository: GameplayRepository) {}
  resources() {
    return Object.fromEntries(this.cooldowns);
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
      if (action.kind === 'attack') {
        const monster = this.monstersManager.get(action.targetId);
        if (!monster) throw new Error('Monstro não encontrado.');
        if (monster.state === 'dead' || monster.health <= 0)
          throw new Error('Monstro já derrotado.');
        if (Math.hypot(monster.x - position.x, monster.y - position.y) > 64)
          throw new Error('Monstro fora de alcance.');
        const lastAttack = this.attackCooldowns.get(id) ?? 0;
        if (Date.now() - lastAttack < 400)
          throw new Error('Aguarde o golpe anterior.');
        this.attackCooldowns.set(id, Date.now());

        const currentSnapshot = await this.repository.execute(id);
        const hasSword = hasTool(currentSnapshot, 'sword');
        const damage = hasSword ? 30 : 20;

        const { killed } = this.monstersManager.takeDamage(
          action.targetId,
          damage,
          id,
        );

        if (killed) {
          this.questsManager.advanceObjective(id, 'defeat', 'slime', 1);
        }

        const reward = killed
          ? {
              item: monster.drop.itemId as ItemId,
              quantity: monster.drop.quantity,
              profession: 'warrior',
              xp: monster.xp,
            }
          : undefined;

        return this.repository.execute(id, action, reward, position);
      }
      if (action.kind === 'craft') {
        const result = await this.repository.execute(
          id,
          action,
          undefined,
          position,
        );
        this.questsManager.advanceObjective(id, 'craft', action.recipeId, 1);
        return result;
      }
      if (action.kind !== 'gather')
        return this.repository.execute(id, action, undefined, position);
      const node = RESOURCES.find((n) => n.id === action.node);
      if (!node || Math.hypot(node.x - position.x, node.y - position.y) > 72)
        throw new Error('Recurso fora de alcance.');
      return this.serial(`node:${node.id}`, async () => {
        const current = getPosition();
        if (!current || Math.hypot(node.x - current.x, node.y - current.y) > 72)
          throw new Error('Recurso fora de alcance.');
        if ((this.cooldowns.get(node.id) ?? 0) > Date.now())
          throw new Error('Recurso se recuperando. Aguarde.');
        const result = await this.repository.execute(
          id,
          action,
          { item: node.item, profession: node.profession },
          current,
        );
        this.cooldowns.set(node.id, Date.now() + 5000);
        this.questsManager.advanceObjective(id, 'gather', node.item, 1);
        return result;
      });
    });
  }
  async turnInQuest(
    id: string,
    questId: string,
    position: { x: number; y: number; direction: string },
  ) {
    const outcome = this.questsManager.turnInQuest(id, questId);
    if (!outcome.success || !outcome.rewards) {
      throw new Error(outcome.error ?? 'Não foi possível entregar a missão.');
    }
    const rewards = outcome.rewards;
    return this.serial(id, async () => {
      let snapshot = await this.repository.execute(id);
      if (rewards.xp) {
        snapshot = await this.repository.execute(
          id,
          undefined,
          {
            item: rewards.items[0]?.itemId ?? 'turnip_seed',
            profession: rewards.xp.profession,
            xp: rewards.xp.amount,
            quantity: 0,
          },
          position,
        );
      }
      for (const it of rewards.items) {
        snapshot = await this.repository.execute(
          id,
          undefined,
          {
            item: it.itemId,
            profession: rewards.xp.profession,
            quantity: it.quantity,
          },
          position,
        );
      }
      return snapshot;
    });
  }
}
