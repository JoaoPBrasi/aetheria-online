import { useEffect, useRef, useState } from 'react';
import { MAP_SIZE, TILE_SIZE, worldTiles } from '@aetheria/shared';
import {
  projectToRadar,
  formatCoordinates,
  clampZoom,
  TERRAIN_COLORS,
} from '../minimap-math';

export interface MinimapMarker {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  symbol: string;
}

// Marcos fixos essenciais de Brumavale para navegação no radar
const STATIC_LANDMARKS: MinimapMarker[] = [
  {
    id: 'eldrin',
    name: 'Ancião Eldrin',
    x: 1040,
    y: 980,
    color: '#f5d475',
    symbol: '⭐',
  },
  {
    id: 'bonfire',
    name: 'Fogueira Central',
    x: 1040,
    y: 1040,
    color: '#f59842',
    symbol: '🔥',
  },
  {
    id: 'forge',
    name: 'Forja do Ferreiro',
    x: 1152,
    y: 1168,
    color: '#a3b8cc',
    symbol: '🔨',
  },
  {
    id: 'farm',
    name: 'Fazenda Comunitária',
    x: 432,
    y: 1328,
    color: '#9ed670',
    symbol: '🌾',
  },
  {
    id: 'quarry',
    name: 'Pedreira do Lago',
    x: 1920,
    y: 320,
    color: '#d1c7bd',
    symbol: '⛏️',
  },
  {
    id: 'slimes',
    name: 'Prado dos Slimes',
    x: 1540,
    y: 1720,
    color: '#70e09b',
    symbol: '⚔️',
  },
  {
    id: 'cemetery',
    name: 'Cemitério da Vigia',
    x: 2200,
    y: 2200,
    color: '#8b839c',
    symbol: '🪦',
  },
  {
    id: 'lake-pier',
    name: 'Píer dos Junços',
    x: 2240,
    y: 960,
    color: '#5dbcd2',
    symbol: '⚓',
  },
];

interface MinimapProps {
  position?: { x: number; y: number };
  regionName?: string;
  nearby?: { name: string; x: number; y: number }[];
  monsters?: { id: string; x: number; y: number }[];
  onExit?: () => void;
}

export function Minimap({
  position,
  regionName,
  nearby = [],
  monsters = [],
  onExit,
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cacheCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(0.08); // Escala balanceada para visão de radar
  const [isExpanded, setIsExpanded] = useState(false);

  const playerPos = position ?? { x: 1040, y: 1040 };

  // Pré-renderiza a matriz do mapa de Brumavale (96×96) em um canvas auxiliar cacheado
  useEffect(() => {
    const cache = document.createElement('canvas');
    cache.width = MAP_SIZE;
    cache.height = MAP_SIZE;
    const ctx = cache.getContext('2d');
    if (!ctx) return;

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const terrain = worldTiles[y]?.[x] ?? 0;
        ctx.fillStyle = TERRAIN_COLORS[terrain] ?? '#3d5c38';
        ctx.fillRect(x, y, 1, 1);
      }
    }

    cacheCanvasRef.current = cache;
  }, []);

  // Renderiza o radar dinâmico no canvas principal
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 4;

    ctx.clearRect(0, 0, width, height);

    // 1. Recorte circular do radar
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    // Fundo escuro padrão
    ctx.fillStyle = '#182b23';
    ctx.fillRect(0, 0, width, height);

    // 2. Renderiza o terreno de fundo escalado
    const cache = cacheCanvasRef.current;
    if (cache) {
      ctx.imageSmoothingEnabled = false;
      const scale = zoom * TILE_SIZE; // pixels na tela por tile

      // Posição do canto superior esquerdo do mapa relativo ao centro do radar
      const mapScreenX = centerX - (playerPos.x / TILE_SIZE) * scale;
      const mapScreenY = centerY - (playerPos.y / TILE_SIZE) * scale;
      const mapScreenWidth = MAP_SIZE * scale;
      const mapScreenHeight = MAP_SIZE * scale;

      ctx.drawImage(
        cache,
        mapScreenX,
        mapScreenY,
        mapScreenWidth,
        mapScreenHeight,
      );
    }

    // Grade sutil do radar
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Marcadores de Marcos / NPCs
    STATIC_LANDMARKS.forEach((m) => {
      const proj = projectToRadar(m, playerPos, zoom, radius);
      const px = centerX + proj.x;
      const py = centerY + proj.y;

      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(px, py, proj.isClamped ? 3 : 4, 0, Math.PI * 2);
      ctx.fill();

      if (!proj.isClamped) {
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(m.symbol, px, py - 9);
      }
    });

    // 4. Marcadores de Monstros (pontos vermelhos)
    monsters.forEach((mob) => {
      const proj = projectToRadar(mob, playerPos, zoom, radius);
      if (!proj.isClamped) {
        const px = centerX + proj.x;
        const py = centerY + proj.y;
        ctx.fillStyle = '#e84545';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 5. Marcadores de Outros Jogadores Conectados (pontos verdes)
    nearby.forEach((other) => {
      const proj = projectToRadar(other, playerPos, zoom, radius);
      const px = centerX + proj.x;
      const py = centerY + proj.y;
      ctx.fillStyle = '#65d677';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 6. Marcador do Jogador Local (Centro)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pulso do jogador
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // 7. Borda Ornamental Medieval e Rosa dos Ventos
    ctx.strokeStyle = '#c2ad79';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Indicador do Norte (N)
    ctx.fillStyle = '#eed69b';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', centerX, 11);
  }, [playerPos, zoom, nearby, monsters]);

  return (
    <div className={`minimap-shell ${isExpanded ? 'expanded' : ''}`}>
      <div className="minimap-header">
        <div className="minimap-location-info">
          <span className="minimap-realm">AETHERIA / BRUMAVALE</span>
          <strong className="minimap-region-name" data-testid="world-region">
            {regionName ?? 'Vila de Brumavale'}
          </strong>
        </div>
        <div className="minimap-actions">
          <button
            className="minimap-btn"
            title="Aproximar Zoom"
            onClick={() => setZoom((z) => clampZoom(z + 0.03))}
          >
            +
          </button>
          <button
            className="minimap-btn"
            title="Afastar Zoom"
            onClick={() => setZoom((z) => clampZoom(z - 0.03))}
          >
            −
          </button>
          <button
            className="minimap-btn"
            title={isExpanded ? 'Recolher mapa' : 'Expandir mapa'}
            onClick={() => setIsExpanded((v) => !v)}
          >
            {isExpanded ? '⤡' : '⤢'}
          </button>
        </div>
      </div>

      <div className="minimap-body">
        <canvas
          ref={canvasRef}
          width={136}
          height={136}
          className="minimap-canvas"
        />
        <div className="minimap-coords">
          {formatCoordinates(playerPos.x, playerPos.y)}
        </div>
      </div>

      {onExit && (
        <button className="minimap-exit-btn" onClick={onExit}>
          Sair da sala
        </button>
      )}
    </div>
  );
}
