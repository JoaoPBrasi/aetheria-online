import { useEffect, useRef, useState } from 'react';
import type { Cosmetics } from '@aetheria/shared';
import {
  poseAt,
  PLAYER_ANIMATIONS,
  type Facing,
} from '../../game/characters/animation';
import {
  loadPortraitArt,
  portraitFrames,
} from '../../game/characters/portrait-art';

export function CharacterPortrait({
  look,
  direction = 'down',
  walking = false,
}: {
  look: Cosmetics;
  direction?: Facing;
  walking?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false,
      request = 0;
    const target = canvas.current!;
    target.dataset.ready = 'false';
    void loadPortraitArt()
      .then(({ image, frames }) => {
        if (disposed) return;
        setError(false);
        const state = walking ? 'walk' : 'idle',
          count = PLAYER_ANIMATIONS[state].frames;
        const keys = Array.from(
          { length: count },
          (_, i) =>
            poseAt(
              state,
              direction,
              (i * 1000) / PLAYER_ANIMATIONS[state].fps + 1,
            ).key,
        );
        const sheet = portraitFrames(image, frames, look, keys);
        const ctx = target.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        const start = performance.now(),
          reduced = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
          ).matches;
        let previous = -1;
        const draw = (time: number) => {
          if (disposed) return;
          const pose = poseAt(state, direction, reduced ? 0 : time - start);
          if (pose.frame !== previous) {
            ctx.clearRect(0, 0, 128, 176);
            ctx.fillStyle = '#10251e80';
            ctx.beginPath();
            ctx.ellipse(64, 171, 19, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.save();
            if (pose.flip) {
              ctx.translate(128, 0);
              ctx.scale(-1, 1);
            }
            ctx.drawImage(
              sheet,
              pose.frame * 64 + 16,
              4,
              32,
              44,
              0,
              0,
              128,
              176,
            );
            ctx.restore();
            target.dataset.frame = String(pose.frame);
            target.dataset.ready = 'true';
            previous = pose.frame;
          }
          if (!reduced) request = requestAnimationFrame(draw);
        };
        draw(start);
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(request);
    };
  }, [look, direction, walking]);
  return (
    <>
      <canvas
        ref={canvas}
        width={128}
        height={176}
        className="character-portrait"
        hidden={error}
        role="img"
        aria-label="Prévia animada do personagem"
        data-testid="character-portrait"
        data-direction={direction}
        data-motion={walking ? 'walk' : 'idle'}
      />
      {error && (
        <p role="alert">Não foi possível carregar a prévia do personagem.</p>
      )}
    </>
  );
}
