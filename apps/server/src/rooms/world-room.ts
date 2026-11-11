import { Room, ServerError, type Client } from '@colyseus/core';
import {
  JoinWorldSchema,
  MAX_PLAYERS,
  PlayerPresence,
  WorldState,
  MovementQueue,
  canStand,
  WORLD_SPAWN,
  CAMPFIRE,
  CAMPFIRE_REST_RANGE,
  type CombatFeedback,
  type CharacterSummary,
} from '@aetheria/shared';
import type { IdentityRepository } from '../repositories/identity-repository.js';
import type { PresenceRegistry } from '../services/presence-registry.js';
import { AppError } from '../services/errors.js';
import type { GameplayService } from '../services/gameplay-service.js';
export class WorldRoom extends Room<{
  state: WorldState;
  client: Client<{ auth: CharacterSummary }>;
}> {
  private inputs = new Map<string, MovementQueue>();
  private lastSync = new Map<string, number>();
  private lastCombat = new Map<string, number>();
  private pendingSaves = new Map<
    string,
    { x: number; y: number; direction: string }
  >();
  constructor(
    private identities: IdentityRepository,
    private leases: PresenceRegistry,
    private devIdentity: boolean,
    private gameplay: GameplayService,
  ) {
    super();
  }
  onCreate() {
    this.maxClients = MAX_PLAYERS;
    this.autoDispose = false;
    this.setState(new WorldState());
    this.setPatchRate(100);
    this.maxMessagesPerSecond = 60;
    this.onMessage('sync', async (client) => {
      if (Date.now() - (this.lastSync.get(client.sessionId) ?? 0) < 500) return;
      this.lastSync.set(client.sessionId, Date.now());
      const p = this.state.players.get(client.sessionId);
      if (!p?.connected) return;
      try {
        client.send('gameplay', await this.gameplay.sync(p.characterId));
        client.send('resources', await this.gameplay.resources());
        client.send('forage', this.gameplay.forage.nodes());
        client.send('plots', await this.gameplay.plots());
        client.send('monsters', this.gameplay.monsters());
        client.send('quests', await this.gameplay.quests(p.characterId));
      } catch {
        client.send('gameplayError', 'Banco indisponível. Tente novamente.');
      }
    });
    this.onMessage('action', async (client, raw: unknown) => {
      const p = this.state.players.get(client.sessionId);
      if (!p?.connected) return;
      try {
        const snapshot = await this.gameplay.act(
          p.characterId,
          raw,
          () => {
            if (!p.connected || !this.state.players.has(client.sessionId))
              return undefined;
            return { x: p.x, y: p.y, direction: p.direction };
          },
          (event) => {
            if (this.state.players.has(client.sessionId))
              this.lastCombat.set(client.sessionId, Date.now());
            this.sendCombat(event);
          },
        );
        client.send('gameplay', snapshot);
        if (
          raw &&
          typeof raw === 'object' &&
          'kind' in raw &&
          raw.kind === 'gather'
        ) {
          this.broadcast('forage', this.gameplay.forage.nodes());
          this.broadcast('resources', await this.gameplay.resources());
        }
        client.send('quests', await this.gameplay.quests(p.characterId));
        if (
          raw &&
          typeof raw === 'object' &&
          'kind' in raw &&
          raw.kind === 'farm'
        )
          this.broadcast('plots', await this.gameplay.plots());
        if (
          raw &&
          typeof raw === 'object' &&
          'kind' in raw &&
          raw.kind === 'attack'
        )
          this.broadcast('monsters', this.gameplay.monsters());
      } catch (error) {
        const safe = [
          'Parcela fora de alcance.',
          'Esta parcela pertence a outro jogador.',
          'Equipe a enxada.',
          'A parcela já está preparada ou plantada.',
          'Limite de quatro parcelas por personagem.',
          'Prepare a parcela primeiro.',
          'Prepare a terra e escolha uma cultura.',
          'Sementes insuficientes.',
          'Equipe o regador.',
          'Plante primeiro; cada cultura precisa de uma rega.',
          'Cultura inválida.',
          'A cultura ainda não está pronta.',
          'Colha antes de liberar a parcela.',
          'Comando inválido.',
          'Aguarde a operação anterior.',
          'Entre na vila para agir.',
          'Recurso fora de alcance.',
          'Recurso se recuperando. Aguarde.',
          'Estado desatualizado. Tente novamente.',
          'Inventário cheio.',
          'Escolha outro slot.',
          'Quantidade indisponível.',
          'Para trocar, mova a pilha inteira.',
          'Limite da pilha excedido.',
          'Escolha uma ferramenta.',
          'Recurso indisponível.',
          'Equipe a ferramenta adequada.',
          'Receita desconhecida.',
          'Estação de trabalho desconhecida.',
          'Estação incorreta para esta receita.',
          'Estação de trabalho fora de alcance.',
          'Materiais insuficientes.',
          'Monstro não encontrado.',
          'Monstro já derrotado.',
          'Monstro fora de alcance.',
          'Aguarde o golpe anterior.',
        ];
        client.send(
          'gameplayError',
          error instanceof Error && safe.includes(error.message)
            ? error.message
            : 'Banco indisponível. A operação não foi confirmada.',
        );
      }
    });
    this.clock.setInterval(() => {
      void this.flushPositions();
    }, 30000);
    this.onMessage('move', (client, message: unknown) => {
      if (this.state.players.get(client.sessionId)?.connected)
        this.inputs.get(client.sessionId)?.accept(message);
    });
    for (const kind of ['quest:accept', 'quest:turn_in'] as const) {
      this.onMessage(kind, async (client, raw: unknown) => {
        const player = this.state.players.get(client.sessionId);
        if (!player?.connected) return;
        const position = () =>
          player.connected && this.state.players.has(client.sessionId)
            ? { x: player.x, y: player.y, direction: player.direction }
            : undefined;
        try {
          if (kind === 'quest:accept') {
            client.send(
              'gameplay',
              await this.gameplay.acceptQuest(
                player.characterId,
                raw,
                position,
              ),
            );
          } else {
            client.send(
              'gameplay',
              await this.gameplay.turnInQuest(
                player.characterId,
                raw,
                position,
              ),
            );
          }
          client.send('quests', await this.gameplay.quests(player.characterId));
        } catch (error) {
          const safe = [
            'Comando de missão inválido.',
            'Aproxime-se do Ancião Eldrin.',
            'Entre na vila para agir.',
            'Você ainda não aceitou esta missão.',
            'Você ainda não cumpriu todos os objetivos da missão.',
            'Inventário cheio.',
          ];
          client.send(
            'gameplayError',
            error instanceof Error && safe.includes(error.message)
              ? error.message
              : 'Não foi possível confirmar a missão. Tente novamente.',
          );
        }
      });
    }
    let monsterBroadcastCounter = 0;
    this.setSimulationInterval(() => {
      if (this.gameplay.forage.tick(Date.now()))
        this.broadcast('forage', this.gameplay.forage.nodes());
      for (const [id, player] of this.state.players) {
        if (!player.connected) continue;
        const next = this.inputs.get(id)?.step(player.x, player.y);
        if (next) {
          player.x = next.x;
          player.y = next.y;
          player.ack = next.seq;
          if (next.direction) player.direction = next.direction;
        }
      }

      const playerTargets = new Map<
        string,
        import('../services/monster-manager.js').PlayerTarget
      >();
      for (const [sessionId, p] of this.state.players) {
        if (!p.connected) continue;
        playerTargets.set(p.characterId, {
          sessionId,
          characterId: p.characterId,
          x: p.x,
          y: p.y,
          health: p.health,
          connected: p.connected,
        });
      }

      const { playerDamages } = this.gameplay.monstersManager.tick(
        0.05,
        playerTargets,
      );
      for (const hit of playerDamages) {
        const player = this.state.players.get(hit.sessionId);
        if (player && player.connected) {
          this.lastCombat.set(hit.sessionId, Date.now());
          this.sendCombat({
            kind: 'hurt',
            playerId: player.characterId,
            x: player.x,
            y: player.y,
            amount: Math.min(hit.damage, player.health),
          });
          player.health = Math.max(0, player.health - hit.damage);
          if (player.health <= 0) {
            player.health = player.maxHealth;
            player.x = WORLD_SPAWN.x;
            player.y = WORLD_SPAWN.y;
            this.inputs.get(hit.sessionId)?.clear();
            const client = this.clients.find(
              (c) => c.sessionId === hit.sessionId,
            );
            client?.send(
              'gameplayError',
              'Você foi derrotado e retornou à praça de Brumavale.',
            );
          }
        }
      }

      monsterBroadcastCounter++;
      if (monsterBroadcastCounter % 20 === 0) this.restoreAtCamp();
      if (monsterBroadcastCounter % 2 === 0) {
        this.broadcast('monsters', this.gameplay.monsters());
      }
    }, 50);
  }
  private sendCombat(event: CombatFeedback) {
    this.broadcast('combat', event);
  }
  private restoreAtCamp() {
    const now = Date.now();
    for (const [sessionId, player] of this.state.players) {
      if (
        !player.connected ||
        player.health >= player.maxHealth ||
        now - (this.lastCombat.get(sessionId) ?? 0) < 4_000 ||
        Math.hypot(player.x - CAMPFIRE.x, player.y - CAMPFIRE.y) >
          CAMPFIRE_REST_RANGE ||
        this.gameplay.monstersManager.threatens(player.characterId)
      )
        continue;
      const amount = Math.min(8, player.maxHealth - player.health);
      player.health += amount;
      this.sendCombat({
        kind: 'heal',
        playerId: player.characterId,
        x: player.x,
        y: player.y,
        amount,
      });
    }
  }
  async onAuth(client: Client, options: unknown) {
    if (!this.devIdentity) throw new ServerError(503, 'AUTH_NOT_CONFIGURED');
    const parsed = JoinWorldSchema.safeParse(options);
    if (!parsed.success) throw new ServerError(400, 'INVALID_JOIN');
    try {
      const character = await this.identities.loadCharacter(parsed.data.token);
      this.leases.acquire(character.id, client.sessionId);
      try {
        return await this.identities.loadCharacter(parsed.data.token);
      } catch (error) {
        this.leases.release(character.id, client.sessionId);
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError)
        throw new ServerError(error.status, error.code);
      console.error('world_auth_failed');
      throw new ServerError(503, 'PERSISTENCE_UNAVAILABLE');
    }
  }
  async onJoin(client: Client, _options: unknown, character: CharacterSummary) {
    const recovery = this.pendingSaves.get(character.id);
    try {
      if (recovery) {
        await this.gameplay.save(character.id, recovery);
        this.pendingSaves.delete(character.id);
      } else await this.gameplay.sync(character.id);
    } catch {
      this.leases.release(character.id, client.sessionId);
      throw new ServerError(503, 'PERSISTENCE_UNAVAILABLE');
    }
    const player = new PlayerPresence();
    player.characterId = character.id;
    player.name = character.name;
    player.appearance = character.appearance;
    player.clothingColor = character.clothingColor;
    player.hairColor = character.hairColor;
    player.skinColor = character.skinColor;
    player.hairStyle = character.hairStyle;
    const candidate = recovery ?? character;
    const pos = canStand(candidate.x, candidate.y) ? candidate : WORLD_SPAWN;
    player.x = pos.x;
    player.y = pos.y;
    player.direction = candidate.direction;
    this.inputs.set(client.sessionId, new MovementQueue());
    this.state.players.set(client.sessionId, player);
  }
  async onLeave(client: Client) {
    this.lastSync.delete(client.sessionId);
    this.lastCombat.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.connected = false;
      this.pendingSaves.set(player.characterId, {
        x: player.x,
        y: player.y,
        direction: player.direction,
      });
      await this.flushPositions(player.characterId);
      this.leases.release(player.characterId, client.sessionId);
    }
    this.state.players.delete(client.sessionId);
  }
  onDrop(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = false;
    this.inputs.get(client.sessionId)?.clear();
    void this.allowReconnection(client, 15).catch(() => undefined);
  }
  onReconnect(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = true;
    this.inputs.get(client.sessionId)?.clear();
  }
  private async flushPositions(onlyId?: string) {
    for (const p of this.state.players.values())
      if (!onlyId || p.characterId === onlyId)
        this.pendingSaves.set(p.characterId, {
          x: p.x,
          y: p.y,
          direction: p.direction,
        });
    await Promise.all(
      [...this.pendingSaves]
        .filter(([id]) => !onlyId || id === onlyId)
        .map(async ([id, pos]) => {
          try {
            const snapshot = await this.gameplay.save(id, pos);
            if (this.pendingSaves.get(id) === pos) this.pendingSaves.delete(id);
            const client = this.clients.find(
              (c) => this.state.players.get(c.sessionId)?.characterId === id,
            );
            client?.send('gameplay', snapshot);
          } catch {
            console.error('position_save_failed');
          }
        }),
    );
  }
  async onDispose() {
    await this.flushPositions();
    for (const [sessionId, player] of this.state.players)
      this.leases.release(player.characterId, sessionId);
  }
}
