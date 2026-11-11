export type BgmMode = 'calm' | 'combat';

/**
 * Gerador de trilha sonora ambiente procedural com suporte a BGM Dinâmica.
 * - Modo 'calm': Tema relaxante de Brumavale (72 BPM) com harpa e flauta.
 * - Modo 'combat': Trilha tensa de ação (130 BPM) com baixo staccato pulsante.
 */
export class BgmGenerator {
  private isPlaying = false;
  private intervalId: number | null = null;
  private currentStep = 0;
  private nextNoteTime = 0;
  private mode: BgmMode = 'calm';

  // Frequências das notas (A1 a E5 em Hertz)
  private readonly notes: Record<string, number> = {
    A1: 55.0,
    D2: 73.42,
    E2: 82.41,
    F2: 87.31,
    G2: 98.0,
    A2: 110.0,
    C3: 130.81,
    D3: 146.83,
    E3: 164.81,
    F3: 174.61,
    G3: 196.0,
    A3: 220.0,
    B3: 246.94,
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    F4: 349.23,
    G4: 392.0,
    A4: 440.0,
    B4: 493.88,
    C5: 523.25,
    D5: 587.33,
    E5: 659.25,
  };

  // --- MODO CALMO (Tema de Brumavale) ---
  private readonly calmArpeggio = [
    // Am
    'A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'A3', 'C4',
    // F
    'F3', 'A3', 'C4', 'F4', 'C4', 'A3', 'F3', 'A3',
    // C
    'C3', 'E3', 'G3', 'C4', 'G3', 'E3', 'C3', 'E3',
    // G
    'G3', 'B3', 'D4', 'G4', 'D4', 'B3', 'G3', 'B3',
  ];

  private readonly calmFlute: (string | null)[] = [
    'E5', null, 'D5', null, 'C5', null, 'B4', null,
    'A4', null, 'C5', null, 'B4', null, null, null,
    'G4', null, 'A4', null, 'B4', null, 'C5', null,
    'D5', null, 'B4', null, 'A4', null, null, null,
  ];

  // --- MODO COMBATE (Tema de Ação / Batalha) ---
  private readonly combatBass = [
    // Dm (Tensão rápida em semicolcheias)
    'D2', 'D2', 'F2', 'D2', 'A2', 'D2', 'F2', 'A2',
    // Am
    'A1', 'A1', 'C3', 'A1', 'E2', 'A1', 'C3', 'E2',
    // Dm
    'D2', 'D2', 'F2', 'D2', 'A2', 'D2', 'F2', 'A2',
    // E7 (Tensão que resolve de volta para Dm)
    'E2', 'E2', 'G2', 'E2', 'B2', 'E2', 'D3', 'B2',
  ];

  private readonly combatLead: (string | null)[] = [
    'D4', null, 'F4', null, 'E4', 'D4', 'C4', null,
    'A3', null, 'C4', null, 'D4', null, null, null,
    'D4', null, 'F4', null, 'G4', 'F4', 'E4', null,
    'E4', null, 'F4', null, 'D4', null, null, null,
  ];

  constructor(
    private readonly ctx: AudioContext,
    private readonly destination: AudioNode,
  ) {}

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    this.intervalId = window.setInterval(() => {
      this.scheduler();
    }, 25);
  }

  stop(): void {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setMode(newMode: BgmMode): void {
    if (this.mode === newMode) return;
    this.mode = newMode;
    // Reinicia o ciclo na próxima nota para sincronizar o andamento
    this.currentStep = 0;
  }

  getMode(): BgmMode {
    return this.mode;
  }

  private scheduler(): void {
    const isCombat = this.mode === 'combat';
    // 72 BPM para calmo (~0.208s por nota) | 130 BPM para combate (~0.115s por nota)
    const stepDuration = isCombat ? 0.115 : 0.208;
    const patternLength = isCombat
      ? this.combatBass.length
      : this.calmArpeggio.length;

    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      if (isCombat) {
        this.playCombatStep(this.nextNoteTime, this.currentStep);
      } else {
        this.playCalmStep(this.nextNoteTime, this.currentStep);
      }
      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % patternLength;
    }
  }

  private playCalmStep(time: number, step: number): void {
    // Harpa dedilhada
    const harpNote = this.calmArpeggio[step];
    if (harpNote && this.notes[harpNote]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.notes[harpNote], time);

      gain.gain.setValueAtTime(0.028, time);
      gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.38);

      osc.connect(gain).connect(this.destination);
      osc.start(time);
      osc.stop(time + 0.4);
    }

    // Flauta lírica
    const fluteNote = this.calmFlute[step];
    if (fluteNote && this.notes[fluteNote]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.notes[fluteNote], time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.024, time + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.42);

      osc.connect(gain).connect(this.destination);
      osc.start(time);
      osc.stop(time + 0.45);
    }
  }

  private playCombatStep(time: number, step: number): void {
    // 1. Baixo pulsante de ação em staccato
    const bassNote = this.combatBass[step];
    if (bassNote && this.notes[bassNote]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this.notes[bassNote], time);

      // Decaimento curto e agressivo de combate
      gain.gain.setValueAtTime(0.038, time);
      gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.1);

      osc.connect(gain).connect(this.destination);
      osc.start(time);
      osc.stop(time + 0.11);
    }

    // 2. Melodia tensa de combate
    const leadNote = this.combatLead[step];
    if (leadNote && this.notes[leadNote]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.notes[leadNote], time);

      gain.gain.setValueAtTime(0.026, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      osc.connect(gain).connect(this.destination);
      osc.start(time);
      osc.stop(time + 0.19);
    }
  }
}
