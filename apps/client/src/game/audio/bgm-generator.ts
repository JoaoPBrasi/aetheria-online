/**
 * Gerador de trilha sonora ambiente procedural (Tema de Brumavale).
 * Reproduz arpeggios de harpa e melodia suave de flauta em loop contínuo.
 */
export class BgmGenerator {
  private isPlaying = false;
  private intervalId: number | null = null;
  private currentStep = 0;
  private nextNoteTime = 0;

  // Escala Dórica / Pentatônica em Lá (A3 a E5 em Hertz)
  private readonly notes: Record<string, number> = {
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

  // Progressão de acordes dedilhados (Harpa / Violão Medieval)
  private readonly arpeggioPattern = [
    // Am (Compasso 1-2)
    'A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'A3', 'C4',
    // F (Compasso 3-4)
    'F3', 'A3', 'C4', 'F4', 'C4', 'A3', 'F3', 'A3',
    // C (Compasso 5-6)
    'C3', 'E3', 'G3', 'C4', 'G3', 'E3', 'C3', 'E3',
    // G (Compasso 7-8)
    'G3', 'B3', 'D4', 'G4', 'D4', 'B3', 'G3', 'B3',
  ];

  // Frases da flauta melódica sobre a harmonia
  private readonly fluteMelody: (string | null)[] = [
    'E5', null, 'D5', null, 'C5', null, 'B4', null,
    'A4', null, 'C5', null, 'B4', null, null, null,
    'G4', null, 'A4', null, 'B4', null, 'C5', null,
    'D5', null, 'B4', null, 'A4', null, null, null,
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

    // Agenda as notas com lookahead de 25ms para precisão de tempo impecável
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

  private scheduler(): void {
    // Agenda as notas que devem tocar nos próximos 100ms
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.playStep(this.nextNoteTime, this.currentStep);
      // Cada semicolcheia a 72 BPM dura aproximadamente 0.208s
      this.nextNoteTime += 0.208;
      this.currentStep = (this.currentStep + 1) % this.arpeggioPattern.length;
    }
  }

  private playStep(time: number, step: number): void {
    // 1. Nota da Harpa (Arpeggio)
    const harpNoteName = this.arpeggioPattern[step];
    if (harpNoteName && this.notes[harpNoteName]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.notes[harpNoteName], time);

      // Envelope percussivo suave de corda dedilhada
      gain.gain.setValueAtTime(0.028, time);
      gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.38);

      osc.connect(gain).connect(this.destination);
      osc.start(time);
      osc.stop(time + 0.4);
    }

    // 2. Nota da Flauta Suave
    const fluteNoteName = this.fluteMelody[step];
    if (fluteNoteName && this.notes[fluteNoteName]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.notes[fluteNoteName], time);

      // Envelope com ataque suave de sopro e sustentação
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.024, time + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.42);

      osc.connect(gain).connect(this.destination);
      osc.start(time);
      osc.stop(time + 0.45);
    }
  }
}
