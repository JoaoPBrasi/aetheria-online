import { useEffect, useRef } from 'react';
export function WorldPreview() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let destroy: (() => void) | undefined;
    void import('../../game/create-game').then(({ createGame }) => {
      if (disposed || !host.current) return;
      const game = createGame(host.current);
      const element = host.current;
      const resize = () => {
        if (game.isBooted && element.clientWidth && element.clientHeight)
          game.scale.resize(element.clientWidth, element.clientHeight);
      };
      game.events.once('ready', resize);
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      destroy = () => {
        observer.disconnect();
        game.destroy(true);
      };
    });
    return () => {
      disposed = true;
      destroy?.();
    };
  }, []);
  return (
    <div
      ref={host}
      className="world-preview"
      aria-label="Mundo de Brumavale. Entre na vila e use WASD ou setas para andar."
    />
  );
}
