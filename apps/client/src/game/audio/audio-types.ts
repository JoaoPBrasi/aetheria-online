export type SfxKind =
  | 'footstep'
  | 'chop'
  | 'mine'
  | 'gather'
  | 'craft'
  | 'level_up'
  | 'quest_complete'
  | 'ui_click'
  | 'ui_open'
  | 'ui_close'
  | 'strike'
  | 'hurt'
  | 'heal';

export interface AudioSettings {
  masterVolume: number; // 0.0 a 1.0
  bgmVolume: number; // 0.0 a 1.0
  sfxVolume: number; // 0.0 a 1.0
  muted: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  bgmVolume: 0.5,
  sfxVolume: 0.8,
  muted: false,
};

export const AUDIO_STORAGE_KEY = 'aetheria_audio_settings';
