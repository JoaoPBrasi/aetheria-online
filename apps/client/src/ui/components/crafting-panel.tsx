import { useState, useSyncExternalStore } from 'react';
import {
  ITEMS,
  CRAFTING_RECIPES,
  CRAFTING_STATIONS,
  canCraft,
  type CraftingStationId,
  type RecipeId,
} from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';
import type { WorldConnection } from '../../game/networking/world-connection';

export function CraftingPanel({
  connection,
  initialStation,
}: {
  connection: WorldConnection | null;
  initialStation?: CraftingStationId;
}) {
  const state = useSyncExternalStore(
    gameBridge.subscribe,
    gameBridge.getSnapshot,
  );
  const [stationId, setStationId] = useState<CraftingStationId>(
    initialStation ?? 'workbench-plaza',
  );

  const currentStation = CRAFTING_STATIONS.find((s) => s.id === stationId);
  const snapshot = state.gameplay;
  if (!snapshot) return null;

  const isNear =
    currentStation &&
    state.position &&
    Math.hypot(
      currentStation.x - state.position.x,
      currentStation.y - state.position.y,
    ) <= 72;

  const recipes = Object.values(CRAFTING_RECIPES).filter(
    (r) => currentStation && r.station === currentStation.type,
  );

  const busy = state.status !== 'connected' || state.actionPending;

  const handleCraft = (recipeId: RecipeId) => {
    if (!currentStation || !isNear || busy) return;
    connection?.action({
      kind: 'craft',
      recipeId,
      stationId: currentStation.id,
    });
  };

  return (
    <section className="crafting-panel" aria-label="Criação e Forja">
      <h2>Estações de Criação</h2>
      <p>
        Aproxime-se da estação na vila para fabricar itens e ganhar experiência
        de Ferreiro.
      </p>

      <div className="station-tabs" role="tablist">
        {CRAFTING_STATIONS.map((st) => {
          const nearThis =
            state.position &&
            Math.hypot(st.x - state.position.x, st.y - state.position.y) <= 72;
          return (
            <button
              key={st.id}
              role="tab"
              aria-selected={stationId === st.id}
              className={`station-tab ${stationId === st.id ? 'active' : ''}`}
              onClick={() => setStationId(st.id)}
            >
              {st.name} {nearThis ? '🟢 (Ao alcance)' : '⚪ (Distante)'}
            </button>
          );
        })}
      </div>

      <div className="recipes-list">
        {recipes.map((r) => {
          const possible = canCraft(snapshot.inventory, r);
          const outputItem = ITEMS[r.output.itemId];
          return (
            <div
              key={r.id}
              className={`recipe-card ${possible && isNear ? 'ready' : 'locked'}`}
            >
              <div className="recipe-header">
                <strong>
                  {outputItem.name} {r.output.quantity > 1 ? `x${r.output.quantity}` : ''}
                </strong>
                <span className="recipe-xp">+{r.xp} XP Ferreiro</span>
              </div>

              <div className="recipe-ingredients">
                <span>Materiais:</span>
                <ul>
                  {r.inputs.map((inp) => {
                    const have = snapshot.inventory
                      .filter((s) => s.itemId === inp.itemId)
                      .reduce((sum, s) => sum + s.quantity, 0);
                    const satisfied = have >= inp.quantity;
                    return (
                      <li
                        key={inp.itemId}
                        className={satisfied ? 'ok' : 'missing'}
                      >
                        {ITEMS[inp.itemId].name}: {have} / {inp.quantity}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="recipe-actions">
                <button
                  type="button"
                  disabled={busy || !possible || !isNear}
                  onClick={() => handleCraft(r.id)}
                >
                  {busy
                    ? 'Fabricando…'
                    : !isNear
                      ? 'Estação distante'
                      : !possible
                        ? 'Faltam materiais'
                        : 'Fabricar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
