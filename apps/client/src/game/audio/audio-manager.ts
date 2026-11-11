import {
  type AudioSettings,
  type SfxKind,
  DEFAULT_AUDIO_SETTINGS,
  AUDIO_STORAGE_KEY,
} from './audio-types';
import { synthesizeSfx } from './sfx-synthesizer';
import { BgmGenerator } from './bgm-generator';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgm: BgmGenerator | null = null;

  private settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };
  private listeners = new Set<() => void>();
  private isUnlocked = false;
  private inCombat = false;
  private combatTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadSettings();
  }

  getSnapshot = (): AudioSettings => {
    return this.settings;
  };

  getSettings(): AudioSettings {
    return this.getSnapshot();
  }

  subscribe = (callback: () => void): (() => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  /**
   * Inicializa o contexto de áudio após a primeira interação do usuário.
   */
  unlockAudio(): void {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined')
      return;

    if (!this.ctx) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ctx = new AudioContextClass();

        // 1. Canal Master
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        // 2. Canal SFX
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);

        // 3. Canal BGM
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.connect(this.masterGain);

        // 4. Instância do gerador musical
        this.bgm = new BgmGenerator(this.ctx, this.bgmGain);

        this.applyGains();
      } catch {
        // Fallback silencioso se o áudio falhar no ambiente
        return;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }

    this.isUnlocked = true;

    // Se as configurações permitirem, inicia a trilha ambiente
    if (!this.settings.muted && this.settings.bgmVolume > 0 && this.bgm) {
      this.bgm.start();
    }
  }

  /**
   * Toca um efeito sonoro sintetizado no canal SFX.
   */
  playSfx(kind: SfxKind, volumeScale = 1.0): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    if (!this.isUnlocked) {
      this.unlockAudio();
    }
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;

    try {
      synthesizeSfx(this.ctx, this.sfxGain, kind, volumeScale);
    } catch {
      // Ignora erro acústico para manter o jogo rodando liso
    }
  }

  /**
   * Inicia a música de fundo.
   */
  startBgm(): void {
    if (!this.isUnlocked) {
      this.unlockAudio();
    }
    if (this.bgm && !this.settings.muted && this.settings.bgmVolume > 0) {
      this.bgm.start();
    }
  }

  /**
   * Notifica evento de combate: ativa a trilha de ação e inicia timer de 5s para retorno.
   */
  notifyCombatAction(): void {
    if (!this.inCombat) {
      this.inCombat = true;
      if (this.bgm) {
        this.bgm.setMode('combat');
      }
    }

    if (this.combatTimeoutId !== null) {
      clearTimeout(this.combatTimeoutId);
    }

    // Após 5 segundos sem ações de combate, retorna para a música normal
    this.combatTimeoutId = setTimeout(() => {
      this.exitCombat();
    }, 5000);
  }

  /**
   * Encerra o modo de combate e restaura a música calma de Brumavale.
   */
  exitCombat(): void {
    this.inCombat = false;
    if (this.combatTimeoutId !== null) {
      clearTimeout(this.combatTimeoutId);
      this.combatTimeoutId = null;
    }
    if (this.bgm) {
      this.bgm.setMode('calm');
    }
  }

  isInCombat(): boolean {
    return this.inCombat;
  }

  /**
   * Interrompe a música de fundo.
   */
  stopBgm(): void {
    if (this.bgm) {
      this.bgm.stop();
    }
  }

  setMasterVolume(val: number): void {
    this.settings = {
      ...this.settings,
      masterVolume: Math.max(0, Math.min(1, val)),
    };
    this.applyGains();
    this.saveSettings();
  }

  setBgmVolume(val: number): void {
    this.settings = {
      ...this.settings,
      bgmVolume: Math.max(0, Math.min(1, val)),
    };
    this.applyGains();
    if (this.settings.bgmVolume === 0) {
      this.stopBgm();
    } else if (!this.settings.muted) {
      this.startBgm();
    }
    this.saveSettings();
  }

  setSfxVolume(val: number): void {
    this.settings = {
      ...this.settings,
      sfxVolume: Math.max(0, Math.min(1, val)),
    };
    this.applyGains();
    this.saveSettings();
  }

  toggleMute(): void {
    if (!this.isUnlocked) {
      this.unlockAudio();
    }
    this.settings = {
      ...this.settings,
      muted: !this.settings.muted,
    };
    this.applyGains();
    if (this.settings.muted) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    this.saveSettings();
  }

  private applyGains(): void {
    if (this.ctx) {
      const now = this.ctx.currentTime;

      const master = this.settings.muted ? 0 : this.settings.masterVolume;
      const sfx = this.settings.muted ? 0 : this.settings.sfxVolume;
      const bgm = this.settings.muted ? 0 : this.settings.bgmVolume;

      if (this.masterGain) {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(master, now);
        this.masterGain.gain.value = master;
      }
      if (this.sfxGain) {
        this.sfxGain.gain.cancelScheduledValues(now);
        this.sfxGain.gain.setValueAtTime(sfx, now);
        this.sfxGain.gain.value = sfx;
      }
      if (this.bgmGain) {
        this.bgmGain.gain.cancelScheduledValues(now);
        this.bgmGain.gain.setValueAtTime(bgm, now);
        this.bgmGain.gain.value = bgm;
      }
    }

    this.notify();
  }

  private loadSettings(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const saved = window.localStorage.getItem(AUDIO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AudioSettings>;
        this.settings = {
          masterVolume:
            typeof parsed.masterVolume === 'number'
              ? parsed.masterVolume
              : DEFAULT_AUDIO_SETTINGS.masterVolume,
          bgmVolume:
            typeof parsed.bgmVolume === 'number'
              ? parsed.bgmVolume
              : DEFAULT_AUDIO_SETTINGS.bgmVolume,
          sfxVolume:
            typeof parsed.sfxVolume === 'number'
              ? parsed.sfxVolume
              : DEFAULT_AUDIO_SETTINGS.sfxVolume,
          muted:
            typeof parsed.muted === 'boolean'
              ? parsed.muted
              : DEFAULT_AUDIO_SETTINGS.muted,
        };
      }
    } catch {
      this.settings = { ...DEFAULT_AUDIO_SETTINGS };
    }
  }

  private saveSettings(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        AUDIO_STORAGE_KEY,
        JSON.stringify(this.settings),
      );
    } catch {
      // Ignora erro de cota de armazenamento
    }
  }
}

export const audioManager = new AudioManager();
