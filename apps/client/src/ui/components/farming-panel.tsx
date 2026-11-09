import { useState, useSyncExternalStore } from 'react';
import { CROPS, cropStatus, type CropId } from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';
import type { WorldConnection } from '../../game/networking/world-connection';
export function FarmingPanel({
  connection,
}: {
  connection: WorldConnection | null;
}) {
  const state = useSyncExternalStore(
    gameBridge.subscribe,
    gameBridge.getSnapshot,
  );
  const [selected, setSelected] = useState('brumavale-farm-1');
  const [crop, setCrop] = useState<CropId>('turnip');
  const plot = state.plots?.find((p) => p.id === selected);
  if (!state.gameplay) return null;
  const busy = state.status !== 'connected' || state.actionPending;
  const owned = plot?.ownerId === state.gameplay.characterId;
  const near =
    plot &&
    state.position &&
    Math.hypot(
      plot.tileX * 32 + 16 - state.position.x,
      plot.tileY * 32 + 16 - state.position.y,
    ) <= 72;
  const status = plot ? cropStatus(plot, state.worldTime ?? 0) : 'empty';
  const act = (operation: string) =>
    connection?.action({
      kind: 'farm',
      plot: selected,
      operation,
      ...(operation === 'plant' ? { crop } : {}),
    });
  return (
    <section aria-label="Agricultura">
      <h3>Horta de Brumavale</h3>
      <p>
        Fazenda a sudoeste da praça. Equipe a enxada para preparar e o regador
        para regar. Cada personagem pode ocupar até 4 parcelas. A colheita rende
        3 alimentos, 2 sementes e 25 XP.
      </p>
      <button disabled={busy} onClick={() => connection?.refresh()}>
        Atualizar horta / receber kit
      </button>
      <div className="inventory-grid">
        {state.plots?.map((p) => (
          <button
            key={p.id}
            aria-pressed={selected === p.id}
            onClick={() => setSelected(p.id)}
          >
            {p.id.replace('brumavale-farm-', 'Parcela ')}
            <br />
            {p.ownerId
              ? p.ownerId === state.gameplay?.characterId
                ? 'Sua'
                : 'Ocupada'
              : 'Livre'}
          </button>
        ))}
      </div>
      {plot && (
        <>
          <p data-testid="farm-status">
            {plot.id.replace('brumavale-farm-', 'Parcela ')} ·{' '}
            {plot.tileX * 32 + 16}, {plot.tileY * 32 + 16} ·{' '}
            {status === 'thirsty'
              ? 'Precisa de rega'
              : status === 'ready'
                ? 'Pronta para colher'
                : status === 'growing'
                  ? `Crescendo · ${Math.max(0, Math.ceil(((plot.harvestAt ?? 0) - (state.worldTime ?? 0)) / 1000))} s`
                  : status === 'prepared'
                    ? 'Terra preparada'
                    : 'Terra não preparada'}
            {!near ? ' · aproxime-se' : ''}
          </p>
          <label>
            Cultura{' '}
            <select
              aria-label="Cultura"
              value={crop}
              onChange={(e) => setCrop(e.target.value as CropId)}
            >
              {Object.entries(CROPS).map(([id, c]) => (
                <option key={id} value={id}>
                  {c.name} · {c.growMs / 1000}s
                </option>
              ))}
            </select>
          </label>
          <div className="resource-controls">
            <button
              disabled={
                busy ||
                !near ||
                (!!plot.ownerId && !owned) ||
                status !== 'empty'
              }
              onClick={() => act('prepare')}
            >
              Preparar terra
            </button>
            <button
              disabled={busy || !near || !owned || status !== 'prepared'}
              onClick={() => act('plant')}
            >
              Plantar
            </button>
            <button
              disabled={busy || !near || !owned || status !== 'thirsty'}
              onClick={() => act('water')}
            >
              Regar
            </button>
            <button
              disabled={busy || !near || !owned || status !== 'ready'}
              onClick={() => act('harvest')}
            >
              Colher
            </button>
            <button
              disabled={busy || !near || !owned || !!plot.cropId}
              onClick={() => act('abandon')}
            >
              Liberar parcela
            </button>
          </div>
        </>
      )}
    </section>
  );
}
