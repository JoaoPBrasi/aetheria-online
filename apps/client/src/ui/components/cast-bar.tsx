import { useEffect, useRef, useSyncExternalStore } from 'react';
import { gameBridge } from '../../game/managers/game-bridge';

export function CastBar() {
  const cast = useSyncExternalStore(
    gameBridge.subscribeCast,
    gameBridge.getCast,
  );

  const fillRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!cast || cast.status !== 'channeling') return;

    let animId: number;
    const duration = cast.durationMs;
    const started = cast.startedAt;

    const tick = () => {
      const now = Date.now();
      const elapsed = Math.min(duration, Math.max(0, now - started));
      const pct = Math.min(100, (elapsed / duration) * 100);

      if (fillRef.current) {
        fillRef.current.style.width = `${pct.toFixed(1)}%`;
      }
      if (timeRef.current) {
        const curSec = (elapsed / 1000).toFixed(1);
        const totSec = (duration / 1000).toFixed(1);
        timeRef.current.textContent = `${curSec}s / ${totSec}s`;
      }

      if (elapsed < duration) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [cast]);

  if (!cast) return null;

  const isInterrupted = cast.status === 'interrupted';
  const isCompleted = cast.status === 'completed';

  return (
    <div
      className={`hud-cast-bar ${cast.status}`}
      role="progressbar"
      aria-label={cast.label}
      aria-live="polite"
      aria-valuemin={0}
      aria-valuemax={100}
      data-testid="hud-cast-bar"
    >
      <div className="cast-bar-inner">
        <div
          ref={fillRef}
          className="cast-bar-fill"
          style={{ width: isCompleted ? '100%' : undefined }}
        >
          {!isInterrupted && <div className="cast-bar-spark" />}
        </div>
        <div className="cast-bar-content">
          <span className="cast-bar-icon">{cast.icon}</span>
          <span className="cast-bar-label">
            {isInterrupted
              ? cast.interruptedReason || 'Ação interrompida!'
              : isCompleted
                ? 'Concluído!'
                : cast.label}
          </span>
          <span ref={timeRef} className="cast-bar-time">
            {isInterrupted
              ? 'Cancelado'
              : isCompleted
                ? 'Sucesso'
                : `${(cast.durationMs / 1000).toFixed(1)}s`}
          </span>
        </div>
      </div>
    </div>
  );
}

