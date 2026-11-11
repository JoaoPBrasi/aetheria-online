import type { CombatFeedback, GameSnapshot } from '@aetheria/shared';

export interface ActiveCast {
  id: string;
  label: string;
  icon: string;
  durationMs: number;
  startedAt: number;
  endsAt: number;
  status: 'channeling' | 'completed' | 'interrupted';
  interruptedReason?: string;
  payload?: Record<string, unknown>;
  onComplete?: () => void;
  onCancel?: () => void;
}

/** External store: React receives coarse snapshots, never frame-by-frame updates. */
export class GameBridge {
  interact?: (
    target?: string,
    farmCropFromPanel?: import('@aetheria/shared').CropId,
  ) => void;
  acceptQuest?: (questId: string) => void;
  turnInQuest?: (questId: string) => void;
  animateCharacter?: (action: Record<string, unknown>) => void;
  combatFeedback?: (
    event: CombatFeedback,
    local: boolean,
    attackerSession?: string,
  ) => void;
  private snapshot: GameSnapshot = {
    status: 'offline',
    players: 0,
    error: null,
    fps: 0,
    health: 100,
    maxHealth: 100,
    monsters: [],
  };
  private listeners = new Set<() => void>();
  private activeCast: ActiveCast | null = null;
  private castListeners = new Set<() => void>();

  getSnapshot = () => this.snapshot;
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  update(patch: Partial<GameSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  getCast = () => this.activeCast;

  subscribeCast = (callback: () => void) => {
    this.castListeners.add(callback);
    return () => {
      this.castListeners.delete(callback);
    };
  };

  startCast(params: {
    label: string;
    icon: string;
    durationMs: number;
    payload?: Record<string, unknown>;
    onComplete?: () => void;
    onCancel?: () => void;
  }) {
    // Cancela cast anterior se houver
    if (this.activeCast && this.activeCast.status === 'channeling') {
      this.cancelCast('Nova ação iniciada.');
    }
    const now = Date.now();
    const cast: ActiveCast = {
      id: Math.random().toString(36).slice(2, 9),
      label: params.label,
      icon: params.icon,
      durationMs: params.durationMs,
      startedAt: now,
      endsAt: now + params.durationMs,
      status: 'channeling',
      payload: params.payload,
      onComplete: params.onComplete,
      onCancel: params.onCancel,
    };
    this.activeCast = cast;
    this.notifyCast();

    // Timer de conclusão
    setTimeout(() => {
      if (
        this.activeCast &&
        this.activeCast.id === cast.id &&
        this.activeCast.status === 'channeling'
      ) {
        this.activeCast.status = 'completed';
        this.notifyCast();
        try {
          cast.onComplete?.();
        } finally {
          // Desvanece após pulso de conclusão
          setTimeout(() => {
            if (this.activeCast && this.activeCast.id === cast.id) {
              this.activeCast = null;
              this.notifyCast();
            }
          }, 450);
        }
      }
    }, params.durationMs);
  }

  cancelCast(reason: string = 'Ação interrompida!') {
    if (!this.activeCast || this.activeCast.status !== 'channeling') return;
    const cast = this.activeCast;
    cast.status = 'interrupted';
    cast.interruptedReason = reason;
    this.notifyCast();
    cast.onCancel?.();
    setTimeout(() => {
      if (this.activeCast && this.activeCast.id === cast.id) {
        this.activeCast = null;
        this.notifyCast();
      }
    }, 550);
  }

  private notifyCast() {
    this.castListeners.forEach((fn) => fn());
  }
}
export const gameBridge = new GameBridge();
