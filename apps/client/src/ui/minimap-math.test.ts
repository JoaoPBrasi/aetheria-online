import { describe, it, expect } from 'vitest';
import {
  projectToRadar,
  worldToTile,
  formatCoordinates,
  clampZoom,
  TERRAIN_COLORS,
} from './minimap-math';

describe('Minimap Math & Projection', () => {
  it('projects target inside radar radius correctly without clamping', () => {
    const center = { x: 1000, y: 1000 };
    const target = { x: 1050, y: 1000 };
    const zoom = 0.1; // 50 * 0.1 = 5 pixels de deslocamento
    const radius = 60;

    const result = projectToRadar(target, center, zoom, radius);

    expect(result.isClamped).toBe(false);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(0);
    expect(result.distance).toBeCloseTo(5);
  });

  it('clamps distant markers to the edge of the circular radar', () => {
    const center = { x: 1000, y: 1000 };
    const target = { x: 3000, y: 1000 }; // Muito longe (2000px * 0.1 = 200px > radius 60)
    const zoom = 0.1;
    const radius = 60;

    const result = projectToRadar(target, center, zoom, radius);

    expect(result.isClamped).toBe(true);
    // Deve estar no ângulo de 0 radianos (para a direita) e preso em radius - 6 = 54px
    expect(result.x).toBeCloseTo(54);
    expect(result.y).toBeCloseTo(0);
  });

  it('converts world coordinates to tile indices accurately', () => {
    // TILE_SIZE é 32
    expect(worldToTile(0, 0)).toEqual({ x: 0, y: 0 });
    expect(worldToTile(64, 96)).toEqual({ x: 2, y: 3 });
    expect(worldToTile(1040, 1040)).toEqual({ x: 32, y: 32 });
  });

  it('formats coordinates string with pixels and tile indices', () => {
    const formatted = formatCoordinates(1040, 1040);
    expect(formatted).toBe('X: 1040  Y: 1040  (32, 32)');
  });

  it('clamps zoom values within min and max boundaries', () => {
    expect(clampZoom(0.01)).toBe(0.04);
    expect(clampZoom(0.5)).toBe(0.25);
    expect(clampZoom(0.12)).toBe(0.12);
  });

  it('provides all 5 core terrain colors', () => {
    expect(TERRAIN_COLORS[0]).toBeDefined(); // Grama
    expect(TERRAIN_COLORS[1]).toBeDefined(); // Calçamento
    expect(TERRAIN_COLORS[2]).toBeDefined(); // Fazenda
    expect(TERRAIN_COLORS[3]).toBeDefined(); // Água
    expect(TERRAIN_COLORS[4]).toBeDefined(); // Edifícios
  });
});
