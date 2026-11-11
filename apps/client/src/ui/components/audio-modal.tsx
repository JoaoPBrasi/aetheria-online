import { useSyncExternalStore } from 'react';
import { audioManager } from '../../game/audio/audio-manager';

interface AudioModalProps {
  onClose: () => void;
}

function getSliderBackground(val: number, muted: boolean): string {
  if (muted) return '#15241b';
  const pct = Math.round(val * 100);
  if (pct <= 0) return '#15241b';
  if (pct >= 100) {
    return 'linear-gradient(90deg, #d4b56a 0%, #eed69b 50%, #f5d676 100%)';
  }
  return `linear-gradient(90deg, #d4b56a 0%, #eed69b ${pct}%, #15241b ${pct}%, #15241b 100%)`;
}

function formatVolumeLabel(val: number): string {
  const pct = Math.round(val * 100);
  if (pct >= 100) return '100% (Máx)';
  if (pct <= 0) return '0% (Mudo)';
  return `${pct}%`;
}

export function AudioModal({ onClose }: AudioModalProps) {
  const settings = useSyncExternalStore(
    audioManager.subscribe,
    audioManager.getSnapshot,
  );

  return (
    <div
      className="hud-modal audio-modal"
      role="dialog"
      aria-label="Configurações de Áudio"
    >
      <header>
        <div>
          <span>CONFIGURAÇÕES / ÁUDIO</span>
          <h2>Opções de Som & Trilha</h2>
        </div>
        <button
          onClick={() => {
            audioManager.playSfx('ui_close');
            onClose();
          }}
          aria-label="Fechar configurações de áudio"
        >
          Fechar
        </button>
      </header>

      <div className="audio-modal-body">
        {/* Toggle Mudo */}
        <div className="audio-row toggle-row">
          <div className="toggle-label-wrap">
            <span className="toggle-title">Status do Áudio</span>
            <span className="toggle-sub">
              {settings.muted
                ? 'Todo o áudio está silenciado (SFX e Música)'
                : 'Áudio ativo e reproduzindo normalmente'}
            </span>
          </div>
          <button
            id="audio-mute-toggle"
            type="button"
            className={`audio-toggle-btn ${settings.muted ? 'active' : ''}`}
            onClick={() => audioManager.toggleMute()}
            aria-pressed={settings.muted}
          >
            {settings.muted ? '🔇 Desativado (Mudo)' : '🔊 Ativado (Com Som)'}
          </button>
        </div>

        {/* Volume Master */}
        <div className="audio-row">
          <div className="audio-label">
            <span>Volume Geral</span>
            <b className={settings.masterVolume >= 1 ? 'audio-val-max' : ''}>
              {formatVolumeLabel(settings.masterVolume)}
            </b>
          </div>
          <div className="audio-slider-wrap">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              disabled={settings.muted}
              style={{
                background: getSliderBackground(
                  settings.masterVolume,
                  settings.muted,
                ),
              }}
              onChange={(e) =>
                audioManager.setMasterVolume(parseFloat(e.target.value))
              }
            />
            <div className="audio-slider-ticks">
              <span>0%</span>
              <span className="tick-mid">50%</span>
              <span className="tick-max">100% (Máx)</span>
            </div>
          </div>
        </div>

        {/* Volume BGM */}
        <div className="audio-row">
          <div className="audio-label">
            <span>Música de Fundo (Brumavale)</span>
            <b className={settings.bgmVolume >= 1 ? 'audio-val-max' : ''}>
              {formatVolumeLabel(settings.bgmVolume)}
            </b>
          </div>
          <div className="audio-slider-wrap">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.bgmVolume}
              disabled={settings.muted}
              style={{
                background: getSliderBackground(
                  settings.bgmVolume,
                  settings.muted,
                ),
              }}
              onChange={(e) =>
                audioManager.setBgmVolume(parseFloat(e.target.value))
              }
            />
            <div className="audio-slider-ticks">
              <span>0%</span>
              <span className="tick-mid">50%</span>
              <span className="tick-max">100% (Máx)</span>
            </div>
          </div>
        </div>

        {/* Volume SFX */}
        <div className="audio-row">
          <div className="audio-label">
            <span>Efeitos Sonoros (SFX)</span>
            <b className={settings.sfxVolume >= 1 ? 'audio-val-max' : ''}>
              {formatVolumeLabel(settings.sfxVolume)}
            </b>
          </div>
          <div className="audio-slider-wrap">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              disabled={settings.muted}
              style={{
                background: getSliderBackground(
                  settings.sfxVolume,
                  settings.muted,
                ),
              }}
              onChange={(e) =>
                audioManager.setSfxVolume(parseFloat(e.target.value))
              }
            />
            <div className="audio-slider-ticks">
              <span>0%</span>
              <span className="tick-mid">50%</span>
              <span className="tick-max">100% (Máx)</span>
            </div>
          </div>
        </div>

        {/* Botão de teste rápido */}
        <div className="audio-test-actions">
          <button
            type="button"
            className="audio-sample-btn"
            onClick={() => audioManager.playSfx('craft')}
          >
            Testar Bigorna
          </button>
          <button
            type="button"
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

