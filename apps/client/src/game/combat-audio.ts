import { audioManager } from './audio/audio-manager';

export function unlockCombatAudio() {
  audioManager.unlockAudio();
}

export function playCombatSound(kind: 'strike' | 'hurt' | 'heal') {
  audioManager.playSfx(kind);
}
