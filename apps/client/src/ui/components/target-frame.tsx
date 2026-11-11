import { useSyncExternalStore } from 'react';
import { getSelectedTarget, NPCS } from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';

function stateLabel(state?: string): string {
  switch (state) {
    case 'chase':
      return '⚔️ Perseguindo';
    case 'windup':
      return '⚠️ Preparando Golpe';
    case 'attack':
      return '⚔️ Atacando';
    case 'patrol':
      return 'Patrulhando';
    case 'return':
      return 'Recuando';
    case 'idle':
      return 'Alerta';
    default:
      return '';
  }
}

export function TargetFrame() {
  const s = useSyncExternalStore(gameBridge.subscribe, gameBridge.getSnapshot);
  const target = getSelectedTarget(
    s.monsters ?? [],
    NPCS,
    s.currentTargetId,
    s.position,
  );

  if (!target) return null;

  const pct = Math.max(
    0,
    Math.min(100, Math.round((target.health / target.maxHealth) * 100)),
  );
  const isHostile = target.hostile;

  const icon =
    target.kind === 'npc'
      ? '🧙‍♂️'
      : target.id.includes('orc')
        ? '👹'
        : target.id.includes('skeleton')
          ? '💀'
          : '🟢';

  const healthColor =
    pct > 50 ? '#2ec4b6' : pct > 25 ? '#ffb703' : '#e63946';

  return (
    <div
      className={`hud-target-frame ${isHostile ? 'hostile' : 'friendly'}`}
      data-testid="hud-target-frame"
      aria-label={`Alvo selecionado: ${target.name}`}
    >
      <div className="target-portrait" aria-hidden="true">
        <span>{icon}</span>
      </div>

      <div className="target-details">
        <div className="target-header">
          <span className="target-name">{target.name}</span>
          <span className="target-level">
            {isHostile ? `Nv. ${target.level}` : 'Aliado'}
          </span>
          <button
            type="button"
            className="target-close-btn"
            onClick={() => gameBridge.selectTarget(null)}
            title="Desselecionar alvo (Esc)"
            aria-label="Desselecionar alvo"
          >
            ✕
          </button>
        </div>

        <div
          className="target-health-bar"
          title={`Vida: ${target.health}/${target.maxHealth} HP`}
        >
          <div
            className="target-health-fill"
            style={{
              width: `${pct}%`,
              backgroundColor: healthColor,
            }}
          />
          <span className="target-health-text" data-testid="target-health">
            {target.health} / {target.maxHealth} HP ({pct}%)
          </span>
        </div>

        <div className="target-subtext">
          {target.distance !== undefined && (
            <span className="target-dist">
              {Math.round(target.distance)} px
            </span>
          )}
          {target.state && (
            <span className="target-state">{stateLabel(target.state)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
