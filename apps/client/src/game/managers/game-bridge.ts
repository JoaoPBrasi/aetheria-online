import type { GameSnapshot } from '@aetheria/shared';
/** External store: React receives coarse snapshots, never frame-by-frame updates. */
export class GameBridge {
  interact?: (target?: string) => void;
  private snapshot: GameSnapshot = {
    status: 'offline',
    players: 0,
    error: null,
    fps: 0,
  };
  private listeners = new Set<() => void>();
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
}
export const gameBridge = new GameBridge();
