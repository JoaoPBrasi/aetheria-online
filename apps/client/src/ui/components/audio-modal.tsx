import { useSyncExternalStore } from 'react';
import { audioManager } from '../../game/audio/audio-manager';

interface AudioModalProps {
  onClose: () => void;
}

export function AudioModal({ onClose }: AudioModalProps) {
  const settings = useSyncExternalStore(
    audioManager.subscribe,
    () => audioManager.getSettings(),
  );

  return (
    <div
      className="hud-modal audio-modal"
      role="dialog"
      aria-label="Configurações de Áudio"
    >
      <div className="hud-modal-header">
        <h3>Opções de Som & Trilha</h3>
        <button
          className="hud-close"
          onClick={() => {
            audioManager.playSfx('ui_close');
            onClose();
          }}
          aria-label="Fechar configurações de áudio"
        >
          ×
        </button>
      </div>

      <div className="audio-modal-body">
        {/* Toggle Mudo */}
        <div className="audio-row toggle-row">
          <label htmlFor="audio-mute-toggle">Silenciar todo o áudio</label>
          <button
            id="audio-mute-toggle"
            className={`audio-toggle-btn ${settings.muted ? 'active' : ''}`}
            onClick={() => audioManager.toggleMute()}
          >
            {settings.muted ? '🔇 Mudo' : '🔊 Ativo'}
          </button>
        </div>

        {/* Volume Master */}
        <div className="audio-row">
          <div className="audio-label">
            <span>Volume Geral</span>
            <b>{Math.round(settings.masterVolume * 100)}%</b>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.masterVolume}
            disabled={settings.muted}
            onChange={(e) =>
              audioManager.setMasterVolume(parseFloat(e.target.value))
            }
          />
        </div>

        {/* Volume BGM */}
        <div className="audio-row">
          <div className="audio-label">
            <span>Música de Fundo (Brumavale)</span>
            <b>{Math.round(settings.bgmVolume * 100)}%</b>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.bgmVolume}
            disabled={settings.muted}
            onChange={(e) =>
              audioManager.setBgmVolume(parseFloat(e.target.value))
            }
          />
        </div>

        {/* Volume SFX */}
        <div className="audio-row">
          <div className="audio-label">
            <span>Efeitos Sonoros (SFX)</span>
            <b>{Math.round(settings.sfxVolume * 100)}%</b>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.sfxVolume}
            disabled={settings.muted}
            onChange={(e) =>
              audioManager.setSfxVolume(parseFloat(e.target.value))
            }
          />
        </div>

        {/* Botão de teste rápido */}
        <div className="audio-test-actions">
          <button
            className="audio-sample-btn"
            onClick={() => audioManager.playSfx('craft')}
          >
            Testar Bigorna
          </button>
          <button
            className="audio-sample-btn"
            onClick={() => audioManager.playSfx('level_up')}
          >
            Testar Fanfarra
          </button>
        </div>
      </div>
    </div>
  );
}
