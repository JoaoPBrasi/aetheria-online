import {
  GameActionSchema,
  RESOURCES,
  type GameplaySnapshot,
} from '@aetheria/shared';
import type { GameplayRepository } from '../repositories/gameplay-repository.js';
export class GameplayService {
  private queues = new Map<string, Promise<unknown>>();
  private cooldowns = new Map<string, number>();
  constructor(private repository: GameplayRepository) {}
  resources() {
    return Object.fromEntries(this.cooldowns);
  }
  plots() {
    return this.repository.plots();
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
        return result;
      });
    });
  }
}
