import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioManager } from './audio-manager';
import { DEFAULT_AUDIO_SETTINGS } from './audio-types';

describe('AudioManager', () => {
  let manager: AudioManager;

  beforeEach(() => {
    manager = new AudioManager();
  });

  it('initializes with default audio settings', () => {
    const settings = manager.getSettings();
    expect(settings.masterVolume).toBe(DEFAULT_AUDIO_SETTINGS.masterVolume);
    expect(settings.bgmVolume).toBe(DEFAULT_AUDIO_SETTINGS.bgmVolume);
    expect(settings.sfxVolume).toBe(DEFAULT_AUDIO_SETTINGS.sfxVolume);
    expect(settings.muted).toBe(false);
  });

  it('clamps master volume between 0 and 1', () => {
    manager.setMasterVolume(1.5);
    expect(manager.getSettings().masterVolume).toBe(1.0);

    manager.setMasterVolume(-0.5);
    expect(manager.getSettings().masterVolume).toBe(0.0);

    manager.setMasterVolume(0.45);
    expect(manager.getSettings().masterVolume).toBe(0.45);
  });

  it('clamps BGM and SFX volumes appropriately', () => {
    manager.setBgmVolume(2.0);
    expect(manager.getSettings().bgmVolume).toBe(1.0);

    manager.setSfxVolume(-1.0);
    expect(manager.getSettings().sfxVolume).toBe(0.0);
  });

  it('toggles mute status correctly', () => {
    expect(manager.getSettings().muted).toBe(false);

    manager.toggleMute();
    expect(manager.getSettings().muted).toBe(true);

    manager.toggleMute();
    expect(manager.getSettings().muted).toBe(false);
  });

  it('notifies subscribers upon volume modifications', () => {
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    manager.setMasterVolume(0.6);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();

    manager.setMasterVolume(0.3);
    expect(listener).not.toHaveBeenCalled();
  });
});
