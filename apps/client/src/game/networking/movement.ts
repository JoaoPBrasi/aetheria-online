import {
  moveInWorld,
  WORLD_SPAWN,
  DEFAULT_COSMETICS,
  type Cosmetics,
  type MovementInput,
  type WorldState,
} from '@aetheria/shared';
import {
  facingFromInput,
  validFacing,
  type Facing,
} from '../characters/animation';
type Sample = { at: number; x: number; y: number };
export const movement = {
  cosmetics: { ...DEFAULT_COSMETICS } as Cosmetics,
  position: { ...WORLD_SPAWN },
  direction: 'down' as Facing,
  seq: 0,
  pending: [] as MovementInput[],
  remotes: new Map<
    string,
    {
      name: string;
      appearance: string;
      connected: boolean;
      samples: Sample[];
      clothingColor: string;
      hairColor: string;
      skinColor: string;
      hairStyle: string;
      direction: Facing;
    }
  >(),
  send: undefined as ((input: MovementInput) => void) | undefined,
  reset() {
    this.pending = [];
    this.seq = 0;
    this.remotes.clear();
    this.send = undefined;
    this.position = { ...WORLD_SPAWN };
    this.direction = 'down';
    this.cosmetics = { ...DEFAULT_COSMETICS };
  },
  input(dx: number, dy: number) {
    if (!this.send || this.pending.length >= 8) return;
    const input = { seq: ++this.seq, dx: Math.sign(dx), dy: Math.sign(dy) };
    this.pending.push(input);
    this.direction = facingFromInput(input.dx, input.dy, this.direction);
    this.position = moveInWorld(
      this.position.x,
      this.position.y,
      input.dx,
      input.dy,
      0.05,
    );
    this.send(input);
  },
  reconcile(state: WorldState, self: string) {
    const player = state.players.get(self);
    if (player) {
      this.cosmetics = {
        clothingColor: player.clothingColor,
        hairColor: player.hairColor,
        skinColor: player.skinColor,
        hairStyle: player.hairStyle as Cosmetics['hairStyle'],
      };
      this.seq = Math.max(this.seq, player.ack);
      this.pending = this.pending.filter((i) => i.seq > player.ack);
      this.position = { x: player.x, y: player.y };
      this.direction = validFacing(player.direction);
      for (const i of this.pending) {
        this.direction = facingFromInput(i.dx, i.dy, this.direction);
        this.position = moveInWorld(
          this.position.x,
          this.position.y,
          i.dx,
          i.dy,
          0.05,
        );
      }
    }
    const seen = new Set<string>();
    state.players.forEach((p, id) => {
      if (id === self) return;
      seen.add(id);
      const previous = this.remotes.get(id);
      const samples = [
        ...(previous?.samples ?? []),
        { at: performance.now(), x: p.x, y: p.y },
      ].slice(-8);
      this.remotes.set(id, {
        name: p.name,
        appearance: p.appearance,
        clothingColor: p.clothingColor,
        hairColor: p.hairColor,
        skinColor: p.skinColor,
        hairStyle: p.hairStyle,
        direction: validFacing(p.direction),
        connected: p.connected,
        samples,
      });
    });
    for (const id of this.remotes.keys())
      if (!seen.has(id)) this.remotes.delete(id);
  },
  interpolate(samples: Sample[], now: number) {
    const target = now - 100;
    let a = samples[0]!;
    for (const b of samples) {
      if (b.at >= target) {
        const t =
          b.at === a.at
            ? 0
            : Math.max(0, Math.min(1, (target - a.at) / (b.at - a.at)));
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      a = b;
    }
    return { x: a.x, y: a.y };
  },
};
