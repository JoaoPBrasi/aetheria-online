import {
  GameActionSchema,
  RESOURCES,
  hasTool,
  PLAYER_ATTACK_RANGE,
  PLAYER_ATTACK_COOLDOWN_MS,
  UNARMED_DAMAGE,
  WEAPON_DAMAGE,
  attributeBonuses,
  calculateCharacterStats,
  CRIT_MULTIPLIER,
  physicalTalentBonus,
  arcaneTalentBonus,
  COMBAT_SKILLS,
  calculateSkillDamage,
  type SkillId,
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
  private attackReadyAt = new Map<string, number>();
  private skillCooldowns = new Map<string, Map<SkillId, number>>();
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
    onStrike?: (feedback: CombatFeedback) => void,
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
          if (Date.now() < (this.attackReadyAt.get(id) ?? 0))
            throw new Error('Aguarde o golpe anterior.');
          const equipment = await this.repository.execute(id);
          const attributes = attributeBonuses(equipment.attributes);

          const weapon: ItemId | undefined = hasTool(equipment, 'iron_sword')
            ? 'iron_sword'
            : hasTool(equipment, 'sword')
              ? 'sword'
              : undefined;
          const { attack } = calculateCharacterStats(
            equipment.equipment,
            weapon ? WEAPON_DAMAGE[weapon] : UNARMED_DAMAGE,
            equipment.attributes,
            equipment.talents,
          );
          const isCrit =
            attributes.basicCritChance > 0 &&
            Math.random() < attributes.basicCritChance;
          const damage = isCrit ? Math.round(attack * CRIT_MULTIPLIER) : attack;
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
          this.attackReadyAt.set(id, Date.now() + PLAYER_ATTACK_COOLDOWN_MS / attributes.attackRate);
          onStrike?.({
            kind: 'strike',
            attackerId: id,
            monsterId: monster.id,
            origin: { x: current.x, y: current.y },
            x: monster.x,
            y: monster.y,
            amount,
            lethal,
            isCrit,
          });
          return snapshot;
        });
      }
      if (action.kind === 'skill') {
        const skill = COMBAT_SKILLS[action.skillId];
        if (!skill) throw new Error('Habilidade desconhecida.');
        const now = Date.now();
        let playerSkills = this.skillCooldowns.get(id);
        if (!playerSkills) {
          playerSkills = new Map<SkillId, number>();
          this.skillCooldowns.set(id, playerSkills);
        }
        const readyAt = playerSkills.get(action.skillId) ?? 0;
        if (now < readyAt) {
          const remainingSec = ((readyAt - now) / 1000).toFixed(1);
          throw new Error(`${skill.name} em recarga (${remainingSec}s).`);
        }

        if (action.skillId === 'heal') {
          const snapshot = await this.repository.execute(
            id,
            action,
            undefined,
            position,
          );
          playerSkills.set(action.skillId, now + skill.cooldownMs);
          onStrike?.({
            kind: 'heal',
            source: 'skill',
            playerId: id,
            x: position.x,
            y: position.y,
            amount:
              (skill.healAmount ?? 35) +
              arcaneTalentBonus(snapshot.talents) +
              attributeBonuses(snapshot.attributes).healing +
              (snapshot.talents?.heal ?? 0) * 5,
            skillId: 'heal',
          });
          return snapshot;
        }

        if (!action.targetId)
          throw new Error(`Selecione um alvo para usar ${skill.name}.`);

        return this.serial(`monster:${action.targetId}`, async () => {
          const monster = this.monstersManager.get(action.targetId!);
          if (!monster) throw new Error('Monstro não encontrado.');
          if (monster.state === 'dead' || monster.health <= 0)
            throw new Error('Monstro já derrotado.');

          const current = getPosition();
          if (!current) throw new Error('Entre na vila para agir.');
          const dist = Math.hypot(monster.x - current.x, monster.y - current.y);
          if (dist > skill.range)
            throw new Error(
              `Alvo fora de alcance (${skill.name} requer até ${skill.range}px, você está a ${Math.round(dist)}px).`,
            );

          const equipment = await this.repository.execute(id);
          const weapon: ItemId | undefined = hasTool(equipment, 'iron_sword')
            ? 'iron_sword'
            : hasTool(equipment, 'sword')
              ? 'sword'
              : undefined;
          const ranks = equipment.talents;
          const attributes = attributeBonuses(equipment.attributes);
          const { attack } = calculateCharacterStats(
            equipment.equipment,
            weapon ? WEAPON_DAMAGE[weapon] : UNARMED_DAMAGE,
            equipment.attributes,
            ranks,
          );
          const bonus =
            action.skillId === 'magic_dart'
              ? arcaneTalentBonus(ranks) +
                attributes.arcaneDamage +
                (ranks?.magic_dart ?? 0) * 4
              : action.skillId === 'charge'
                ? physicalTalentBonus(ranks) +
                  attributes.physicalAttack +
                  (ranks?.charge ?? 0) * 5
                : (ranks?.cleave ?? 0) * 4;
          const { damage, isCrit } = calculateSkillDamage(
            action.skillId,
            attack,
            Math.random() < attributes.skillCritChance,
            bonus,
          );
          const dashFrom =
            skill.type === 'dash' ? { x: current.x, y: current.y } : undefined;

          if (skill.type === 'dash') {
            const angle = Math.atan2(
              monster.y - current.y,
              monster.x - current.x,
            );
            current.x = Math.round(monster.x - Math.cos(angle) * 36);
            current.y = Math.round(monster.y - Math.sin(angle) * 36);
          }

          const lethal = damage >= monster.health;
          const reward = lethal
            ? {
                item: monster.drop.itemId as ItemId,
                quantity: monster.drop.quantity,
                profession: 'warrior',
                xp: monster.xp + 10,
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
          playerSkills!.set(action.skillId, now + skill.cooldownMs);
          onStrike?.({
            kind: 'strike',
            attackerId: id,
            monsterId: monster.id,
            origin: { x: current.x, y: current.y },
            x: monster.x,
            y: monster.y,
            amount,
            lethal,
            isCrit,
            dashFrom,
            skillId: action.skillId,
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
      if (action.kind === 'buy' || action.kind === 'sell') {
        const merchant = NPCS.find((n) => n.id === 'mira-merchant');
        if (
          !merchant ||
          !position ||
          Math.hypot(merchant.x - position.x, merchant.y - position.y) > 140
        ) {
          throw new Error('Aproxime-se da Mercadora Mira para negociar.');
        }
        return this.repository.execute(id, action, undefined, position);
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
