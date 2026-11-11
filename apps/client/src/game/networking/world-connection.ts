import { Client, type Room } from '@colyseus/sdk';
import {
  ITEMS,
  type WorldState,
  type GameplaySnapshot,
  type CombatFeedback,
} from '@aetheria/shared';
import { gameBridge } from '../managers/game-bridge';
import { request, RequestError } from './api';
import { movement } from './movement';
import { unlockCombatAudio } from '../combat-audio';
import { rememberConfirmedPlanting } from '../farming-preferences';
const connectionErrors: Record<string, string> = {
  ALREADY_CONNECTED: 'Personagem já conectado em outra janela.',
  INVALID_SESSION: 'Sessão inválida. Crie uma nova identidade local.',
  PERSISTENCE_UNAVAILABLE: 'Banco de dados indisponível. Tente novamente.',
  INVALID_JOIN: 'Não foi possível validar a entrada na vila.',
  AUTH_NOT_CONFIGURED: 'Autenticação indisponível neste ambiente.',
};
const connectionMessage = (message?: string) =>
  (message && connectionErrors[message]) ||
  'Não foi possível conectar à vila. Tente novamente.';
export class WorldConnection {
  private room?: Room<WorldState>;
  private disposed = false;
  private lastAction?: Record<string, unknown>;
  refresh() {
    if (gameBridge.getSnapshot().status === 'connected')
      this.room?.send('sync');
  }
  sendChat(text: string, channel: 'local' | 'global' = 'local') {
    if (this.disposed || gameBridge.getSnapshot().status !== 'connected') return;
    this.room?.send('chat', { text, channel });
  }
  action(payload: Record<string, unknown>) {
    const current = gameBridge.getSnapshot();
    if (
      current.status !== 'connected' ||
      current.actionPending ||
      current.questPending ||
      !current.gameplay
    )
      return;
    if (payload.kind === 'attack') unlockCombatAudio();
    this.lastAction = {
      ...payload,
      id: crypto.randomUUID(),
      revision: current.gameplay.revision,
    };
    this.retryAction();
  }
  retryAction() {
    if (!this.lastAction || gameBridge.getSnapshot().status !== 'connected')
      return;
    gameBridge.update({ actionPending: true, gameplayError: null });
    this.room?.send('action', this.lastAction);
  }
  async connect(token: string) {
    gameBridge.update({ status: 'connecting', error: null });
    movement.reset();
    gameBridge.update({
      gameplay: undefined,
      gameplayError: null,
      actionPending: false,
      questPending: false,
      quests: undefined,
      plots: undefined,
      farmTarget: undefined,
      resources: undefined,
      forage: undefined,
      combatText: undefined,
      combatAt: undefined,
    });
    try {
      const reservation = (await request(
        '/api/world/seat',
        token,
      )) as Parameters<Client['consumeSeatReservation']>[0];
      if (this.disposed) return;
      const client = new Client(
        `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/socket`,
      );
      const room = await client.consumeSeatReservation<WorldState>(reservation);
      if (this.disposed) {
        await room.leave();
        return;
      }
      room.reconnection.enabled = true;
      room.reconnection.maxRetries = 12;
      room.reconnection.maxDelay = 2000;
      this.room = room;
      room.onMessage(
        'plots',
        (plots: import('@aetheria/shared').FarmSnapshot[]) => {
          if (!this.disposed) gameBridge.update({ plots });
        },
      );
      room.onMessage(
        'resources',
        (resources: import('@aetheria/shared').ResourceStates) => {
          if (!this.disposed) gameBridge.update({ resources });
        },
      );
      room.onMessage(
        'forage',
        (forage: import('@aetheria/shared').ForageNode[]) => {
          if (!this.disposed) gameBridge.update({ forage });
        },
      );
      room.onMessage(
        'monsters',
        (monsters: import('@aetheria/shared').MonsterSnapshot[]) => {
          if (!this.disposed) gameBridge.update({ monsters });
        },
      );
      room.onMessage(
        'quests',
        (quests: import('@aetheria/shared').CharacterQuestState[]) => {
          if (!this.disposed)
            gameBridge.update({ quests, questPending: false });
        },
      );
      room.onMessage('gameplay', (snapshot: GameplaySnapshot) => {
        if (this.disposed) return;
        const old = gameBridge.getSnapshot().gameplay;
        if (old && snapshot.revision > old.revision) {
          if (this.lastAction)
            rememberConfirmedPlanting(this.lastAction, old, snapshot);
          if (
            gameBridge.getSnapshot().actionPending &&
            this.lastAction &&
            this.lastAction.kind !== 'attack'
          )
            gameBridge.animateCharacter?.(this.lastAction);
          const gains = Object.keys(ITEMS)
            .map((id) => {
              const count = (snap: GameplaySnapshot) =>
                snap.inventory
                  .filter((i) => i.itemId === id)
                  .reduce((a, b) => a + b.quantity, 0);
              return {
                id: id as keyof typeof ITEMS,
                n: count(snapshot) - count(old),
              };
            })
            .filter(
              (g) =>
                g.n > 0 &&
                (!ITEMS[g.id].tool ||
                  (g.id === 'sword' && gameBridge.getSnapshot().questPending)),
            );
          if (gains.length)
            gameBridge.update({
              feedback: gains
                .map((g) => `+${g.n} ${ITEMS[g.id].name}`)
                .join(' · '),
              feedbackAt: Date.now(),
            });
        }
        if (!old || snapshot.revision >= old.revision)
          gameBridge.update({
            gameplay: snapshot,
            actionPending: false,
            gameplayError: gameBridge.getSnapshot().actionPending
              ? null
              : gameBridge.getSnapshot().gameplayError,
          });
      });
      room.onMessage('combat', (event: CombatFeedback) => {
        if (this.disposed) return;
        const characterId =
          event.kind === 'strike' ? event.attackerId : event.playerId;
        const local =
          room.state.players.get(room.sessionId)?.characterId === characterId;
        const attackerSession =
          event.kind === 'strike' && !local
            ? [...room.state.players].find(
                ([, player]) => player.characterId === characterId,
              )?.[0]
            : undefined;
        gameBridge.combatFeedback?.(event, local, attackerSession);
        if (!local) return;
        const combatText =
          event.kind === 'strike'
            ? event.lethal
              ? 'Alvo derrotado'
              : `${event.amount} de dano causado`
            : event.kind === 'hurt'
              ? `${event.amount} de dano recebido`
              : `${event.source === 'food' ? ITEMS.roasted_turnip.name : 'Fogueira'} · +${event.amount} de vida`;
        gameBridge.update({ combatText, combatAt: Date.now() });
      });
      room.onMessage('gameplayError', (message: string) => {
        if (this.disposed) return;
        gameBridge.update({
          gameplayError: message,
          actionPending: false,
          questPending: false,
        });
        room.send('sync');
      });
      room.onMessage('chat', (message: import('@aetheria/shared').ChatMessage) => {
        if (this.disposed) return;
        gameBridge.pushChatMessage(message);
      });
      room.send('sync');
      movement.send = (input) => room.send('move', input);
      const questCommand = (
        kind: 'quest:accept' | 'quest:turn_in',
        questId: string,
      ) => {
        const current = gameBridge.getSnapshot();
        if (
          this.disposed ||
          current.status !== 'connected' ||
          current.actionPending ||
          current.questPending
        )
          return;
        gameBridge.update({ questPending: true, gameplayError: null });
        room.send(kind, { questId });
      };
      gameBridge.acceptQuest = (questId) =>
        questCommand('quest:accept', questId);
      gameBridge.turnInQuest = (questId) =>
        questCommand('quest:turn_in', questId);
      room.onDrop(() => {
        if (this.disposed) return;
        movement.send = undefined;
        movement.pending = [];
        gameBridge.update({
          status: 'connecting',
          error: 'Reconectando à vila…',
        });
      });
      room.onReconnect(() => {
        if (this.disposed) return;
        movement.pending = [];
        movement.reconcile(room.state, room.sessionId);
        movement.send = (input) => room.send('move', input);
        const self = room.state.players.get(room.sessionId);
        gameBridge.update({
          status: 'connected',
          error: null,
          health: self?.health ?? 100,
          maxHealth: self?.maxHealth ?? 100,
        });
        room.send('sync');
      });
      gameBridge.update({
        status: 'connected',
        players: room.state?.players?.size ?? 0,
      });
      room.onStateChange((state) => {
        if (this.disposed) return;
        movement.reconcile(state, room.sessionId);
        const self = state.players.get(room.sessionId);
        if (!this.disposed)
          gameBridge.update({
            players: state.players.size,
            health: self?.health ?? 100,
            maxHealth: self?.maxHealth ?? 100,
          });
      });
      room.onLeave(() => {
        if (this.disposed) return;
        movement.send = undefined;
        movement.pending = [];
        movement.remotes.clear();
        if (!this.disposed)
          gameBridge.update({
            status: 'offline',
            players: 0,
            error: 'Conexão encerrada. Entre novamente na vila.',
          });
      });
      room.onError((_code, message) => {
        if (!this.disposed)
          gameBridge.update({
            status: 'error',
            error: connectionMessage(message),
          });
      });
    } catch (error) {
      if (!this.disposed)
        gameBridge.update({
          status: 'error',
          players: 0,
          error:
            error instanceof RequestError
              ? error.message
              : connectionMessage(
                  error instanceof Error ? error.message : undefined,
                ),
        });
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    movement.send = undefined;
    movement.pending = [];
    movement.remotes.clear();
    if (this.room) void this.room.leave();
    gameBridge.acceptQuest = undefined;
    gameBridge.turnInQuest = undefined;
    gameBridge.update({
      status: 'offline',
      players: 0,
      quests: undefined,
      questPending: false,
    });
  }
}
