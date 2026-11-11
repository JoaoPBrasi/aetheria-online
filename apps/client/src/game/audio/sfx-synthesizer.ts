import type { SfxKind } from './audio-types';

/**
 * Sintetizador procedural de efeitos sonoros 16-bit com Web Audio API.
 * Gera áudio orgânico e responsivo sem necessidade de baixar arquivos de áudio.
 */
export function synthesizeSfx(
  ctx: AudioContext,
  destination: AudioNode,
  kind: SfxKind,
  volumeScale = 1.0,
): void {
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(destination);

  switch (kind) {
    case 'footstep': {
      // Passo curto e abafado
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.06);

      gain.gain.setValueAtTime(0.04 * volumeScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.07);
      break;
    }

    case 'chop': {
      // Golpe de machado na madeira: baque grave seguido de estalo
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.1);

      gain.gain.setValueAtTime(0.12 * volumeScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.13);
      break;
    }

    case 'mine': {
      // Picareta na rocha: ressonância metálica/mineral aguda
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.14);

      gain.gain.setValueAtTime(0.09 * volumeScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.16);
      break;
    }

    case 'gather': {
      // Coleta de fibras e colheita: sussurro suave
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.1);

      gain.gain.setValueAtTime(0.06 * volumeScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.12);
      break;
    }

    case 'craft': {
      // Martelo batendo no metal da bigorna: harmônicos duplos de sino
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(980, now);
      osc2.frequency.setValueAtTime(1470, now);

      gain.gain.setValueAtTime(0.08 * volumeScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.23);
      osc2.stop(now + 0.23);
      break;
    }

    case 'level_up': {
      // Fanfarra arpeggiada de 4 notas ascendentes (C4, E4, G4, C5)
      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((freq, index) => {
        const noteStart = now + index * 0.08;
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        noteOsc.type = 'triangle';
        noteOsc.frequency.setValueAtTime(freq, noteStart);

        noteGain.gain.setValueAtTime(0.08 * volumeScale, noteStart);
        noteGain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.2);

        noteOsc.connect(noteGain).connect(destination);
        noteOsc.start(noteStart);
        noteOsc.stop(noteStart + 0.21);
      });
      break;
    }

    case 'quest_complete': {
      // Fanfarra dourada triunfante (G4, B4, D5, G5 com sustentação)
      const notes = [392.0, 493.88, 587.33, 783.99];
      notes.forEach((freq, index) => {
        const noteStart = now + index * 0.09;
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        noteOsc.type = 'sine';
        noteOsc.frequency.setValueAtTime(freq, noteStart);

        const duration = index === notes.length - 1 ? 0.45 : 0.18;
        noteGain.gain.setValueAtTime(0.09 * volumeScale, noteStart);
        noteGain.gain.exponentialRampToValueAtTime(0.001, noteStart + duration);

        noteOsc.connect(noteGain).connect(destination);
        noteOsc.start(noteStart);
        noteOsc.stop(noteStart + duration + 0.01);
      });
      break;
    }

    case 'ui_click': {
      // Clique de botão tátil rápido
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.03);

      gain.gain.setValueAtTime(0.05 * volumeScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.04);
      break;
    }

    case 'ui_open': {
      // Abertura de janela (tom ascendente suave)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);

      gain.gain.setValueAtTime(0.06 * volumeScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    }

    case 'ui_close': {
      // Fechamento de janela (tom descendente suave)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.07);

      gain.gain.setValueAtTime(0.05 * volumeScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.09);
      break;
    }

    case 'strike': {
      // Golpe de combate (compatível com combat-audio)
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(230, now);
      osc.frequency.exponentialRampToValueAtTime(83, now + 0.12);

      gain.gain.setValueAtTime(0.075 * volumeScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.17);
      break;
    }

    case 'hurt': {
      // Dano recebido
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(51, now + 0.12);

      gain.gain.setValueAtTime(0.08 * volumeScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.17);
      break;
    }

    case 'heal': {
      // Cura / Recuperação
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(390, now);
      osc.frequency.exponentialRampToValueAtTime(590, now + 0.12);

      gain.gain.setValueAtTime(0.075 * volumeScale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.17);
      break;
    }
  }
}

