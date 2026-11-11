import { TILE_SIZE } from '@aetheria/shared';

export interface MinimapPoint {
  x: number;
  y: number;
}

export interface RadarProjection {
  x: number;
  y: number;
  isClamped: boolean;
  distance: number;
}

/**
 * Cores temáticas em pixel art dos tipos de terreno de Brumavale:
 * 0: Grama / Prado
 * 1: Calçamento / Estradas / Pontes
 * 2: Terra arada / Fazenda
 * 3: Água (Lago dos Junços e Rio)
 * 4: Obstáculos / Edifícios / Rochedos
 */
export const TERRAIN_COLORS: Record<number, string> = {
  0: '#3d5c38', // Grama florestal
  1: '#7d7a64', // Calçamento e pedras talhadas
  2: '#684d31', // Terra arada
  3: '#29546b', // Água límpida
  4: '#222d26', // Paredes e construções
};

/**
 * Projeta uma coordenada do mundo (em pixels) para o espaço relativo do radar circular.
 */
export function projectToRadar(
  target: MinimapPoint,
  center: MinimapPoint,
  zoom: number,
  radius: number,
): RadarProjection {
  // Delta em pixels de mundo
  const dx = (target.x - center.x) * zoom;
  const dy = (target.y - center.y) * zoom;
  const distance = Math.hypot(dx, dy);

  if (distance <= radius) {
    return {
      x: dx,
      y: dy,
      isClamped: false,
      distance,
    };
  }

  // Prende o marcador na borda do radar circular
  const angle = Math.atan2(dy, dx);
  const clampedRadius = radius - 6; // Pequena folga da borda
  return {
    x: Math.cos(angle) * clampedRadius,
    y: Math.sin(angle) * clampedRadius,
    isClamped: true,
    distance,
  };
}

/**
 * Converte coordenadas de pixel para coordenadas de tile do mundo.
 */
export function worldToTile(x: number, y: number): MinimapPoint {
  return {
    x: Math.floor(x / TILE_SIZE),
    y: Math.floor(y / TILE_SIZE),
  };
}

/**
 * Formata coordenadas para exibição textual amigável no HUD (ex: X: 1040, Y: 1040).
 */
export function formatCoordinates(x: number, y: number): string {
  const tile = worldToTile(x, y);
  return `X: ${Math.round(x)}  Y: ${Math.round(y)}  (${tile.x}, ${tile.y})`;
}

/**
 * Limita o valor de zoom permitido para o minimapa.
 */
export function clampZoom(zoom: number): number {
  return Math.max(0.04, Math.min(0.25, zoom));
}
