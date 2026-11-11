import { useState, useSyncExternalStore } from 'react';
import {
  CROPS,
  FARM_RANGE,
  MAX_OWNED_PLOTS,
  cropStatusLabel,
  farmInteraction,
  plotPosition,
  seedCount,
  type CropId,
} from '@aetheria/shared';
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
  const cast = useSyncExternalStore(
    gameBridge.subscribeCast,
    gameBridge.getCast,
  );
  const [selected, setSelected] = useState<string>();
  const gameplay = state.gameplay;
  if (!gameplay) return null;

  const crop = state.farmCrop ?? 'turnip';
  const plots = state.plots ?? [];
  const now = state.worldTime ?? 0;
  const owned = plots.filter((p) => p.ownerId === gameplay.characterId);
  const distance = (plot: (typeof plots)[number]) => {
    const point = plotPosition(plot);
    return state.position
      ? Math.hypot(point.x - state.position.x, point.y - state.position.y)
      : Infinity;
  };
  const closestFree = plots
    .filter((p) => !p.ownerId)
    .sort((a, b) => distance(a) - distance(b))[0];
  const plot =
    plots.find((p) => p.id === (selected ?? state.farmTarget)) ??
    owned[0] ??
    closestFree;
  const action =
    plot && farmInteraction(gameplay, plot, plots, state.position, now, crop);
  const busy =
    state.status !== 'connected' ||
    state.actionPending ||
    cast?.status === 'channeling';
  const name = (id: string) => 'Parcela ' + id.split('-').at(-1);
  return (
    <section className="farming-panel" aria-label="Agricultura">
      <h3>Horta de Brumavale</h3>
      <p>
        A sudoeste da Praça · {owned.length}/{MAX_OWNED_PLOTS} parcelas suas
      </p>
      {owned.length === 0 && (
        <p>Vá até a horta e prepare uma parcela livre para começar.</p>
      )}
      <ul className="farm-plot-list" aria-label="Parcelas do personagem">
        {owned.map((p) => {
          const next = farmInteraction(
            gameplay,
            p,
            plots,
            state.position,
            now,
            crop,
          );
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={plot?.id === p.id}
                onClick={() => setSelected(p.id)}
              >
                <strong>
                  {name(p.id)} ·{' '}
                  {p.cropId ? CROPS[p.cropId].name : 'Sem cultura'}
                </strong>
                <span>{cropStatusLabel(p, now)}</span>
                {next.payload.operation && (
                  <small>
                    {next.label}
                    {next.reason ? ` · ${next.reason}` : ''}
                  </small>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {closestFree && owned.length < MAX_OWNED_PLOTS && (
        <button
          type="button"
          aria-pressed={plot?.id === closestFree.id}
          onClick={() => setSelected(closestFree.id)}
        >
          Parcela livre mais próxima · {name(closestFree.id)}
        </button>
      )}
      {plot && action && (
        <div className="farm-plot-detail">
          <p data-testid="farm-status">
            {name(plot.id)} · {cropStatusLabel(plot, now)}
          </p>
          {action.payload.operation === 'plant' && (
            <label>
              Cultura{' '}
              <select
                aria-label="Cultura"
                value={crop}
                onChange={(event) =>
                  gameBridge.update({ farmCrop: event.target.value as CropId })
                }
              >
                {(Object.keys(CROPS) as CropId[]).map((id) => (
                  <option key={id} value={id}>
                    {CROPS[id].name} · {seedCount(gameplay, id)} sementes ·{' '}
                    {CROPS[id].growMs / 1000} s após regar
                  </option>
                ))}
              </select>
            </label>
          )}
          {action.reason && <p>{action.reason}</p>}
          <div className="resource-controls">
            {action.payload.operation && (
              <button
                type="button"
                disabled={busy || !action.enabled}
                onClick={() => gameBridge.interact?.(plot.id, crop)}
              >
                {action.label}
              </button>
            )}
            {plot.ownerId === gameplay.characterId && !plot.cropId && (
              <button
                type="button"
                disabled={busy || action.distance > FARM_RANGE}
                onClick={() =>
                  connection?.action({
                    kind: 'farm',
                    plot: plot.id,
                    operation: 'abandon',
                  })
                }
              >
                Liberar parcela
              </button>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => connection?.refresh()}
      >
        Atualizar horta / receber kit
      </button>
    </section>
  );
}
