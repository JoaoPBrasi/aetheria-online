import { useEffect, useSyncExternalStore } from 'react';
import {
  ITEMS,
  CRAFTING_RECIPES,
  CRAFTING_STATIONS,
  CRAFTING_INTERACTION_RANGE,
  canCraft,
  type CraftingStationId,
  type RecipeId,
} from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';
import type { WorldConnection } from '../../game/networking/world-connection';
import { audioManager } from '../../game/audio/audio-manager';

const STATION_DETAILS: Record<
  string,
  { icon: string; specialty: string; description: string }
> = {
  workbench: {
    icon: '🪵',
    specialty: 'Carpintaria & Artesanato Rústico',
    description:
      'Processe toras de madeira colhidas no bosque em tábuas nobres e outros componentes rústicos.',
  },
  forge: {
    icon: '⚒️',
    specialty: 'Armaria & Metalurgia',
    description:
      'Molde lingotes incandescentes de ferro na bigorna para forjar armas de combate, machados reforçados e ferramentas pesadas.',
  },
  furnace: {
    icon: '🔥',
    specialty: 'Fundição & Refino de Minérios',
    description:
      'Alimente o fogo com lenha para queimar carvão vegetal e purificar minério de ferro bruto em lingotes de alto valor.',
  },
};

export function CraftingPanel({
  connection,
  stationId,
  onClose,
}: {
  connection: WorldConnection | null;
  stationId: CraftingStationId;
  onClose?: () => void;
}) {
  const state = useSyncExternalStore(
    gameBridge.subscribe,
    gameBridge.getSnapshot,
  );
  const activeCast = useSyncExternalStore(
    gameBridge.subscribeCast,
    gameBridge.getCast,
  );
  const isCasting = activeCast?.status === 'channeling';

  const currentStation =
    CRAFTING_STATIONS.find((s) => s.id === stationId) ?? CRAFTING_STATIONS[0];
  const snapshot = state.gameplay;

  // Fecha o menu automaticamente se o jogador se afastar da estação
  useEffect(() => {
    if (state.position) {
      const dist = Math.hypot(
        currentStation.x - state.position.x,
        currentStation.y - state.position.y,
      );
      if (dist > CRAFTING_INTERACTION_RANGE) {
        onClose?.();
      }
    }
  }, [state.position, currentStation, onClose]);

  if (!snapshot) return null;

  const isNear =
    state.position &&
    Math.hypot(
      currentStation.x - state.position.x,
      currentStation.y - state.position.y,
    ) <= CRAFTING_INTERACTION_RANGE;

  const recipes = Object.values(CRAFTING_RECIPES).filter(
    (r) => r.station === currentStation.type,
  );

  const busy = state.status !== 'connected' || state.actionPending;
  const details = STATION_DETAILS[currentStation.type] ?? {
    icon: '🔨',
    specialty: 'Oficina Artesanal',
    description: 'Fabricação de suprimentos e equipamentos.',
  };

  const handleCraft = (recipeId: RecipeId) => {
    const recipe = CRAFTING_RECIPES[recipeId];
    if (!currentStation || !isNear || busy || isCasting || !recipe) return;

    let durationMs = 2000;
    if (recipe.station === 'furnace') {
      durationMs = 2500;
    } else if (recipe.station === 'forge') {
      durationMs = 3500;
    }

    const outputItem = ITEMS[recipe.output.itemId];
    const label = `Forjando ${outputItem?.name ?? 'item'}…`;
    const icon = recipe.station === 'furnace' ? '🔥' : '🔨';

    audioManager.unlockAudio();
    audioManager.playSfx('craft');
    gameBridge.animateCharacter?.({ kind: 'craft' });

    gameBridge.startCast({
      label,
      icon,
      durationMs,
      payload: { kind: 'craft', recipeId, stationId: currentStation.id },
      onComplete: () => {
        connection?.action({
          kind: 'craft',
          recipeId,
          stationId: currentStation.id,
        });
      },
    });
  };

  return (
    <section
      className="crafting-panel dedicated-station-panel"
      aria-label={currentStation.name}
    >
      <div className="station-banner">
        <span className="station-banner-icon">{details.icon}</span>
        <div className="station-banner-text">
          <h2>{currentStation.name}</h2>
          <small>{details.specialty}</small>
        </div>
      </div>
      <p className="station-description">{details.description}</p>

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
                  {r.output.quantity} × {outputItem.name}
                </strong>
                <span className="recipe-xp">+{r.xp} XP Ferreiro</span>
              </div>

              <div className="recipe-ingredients">
                <span>Materiais Necessários:</span>
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
                  disabled={busy || isCasting || !possible || !isNear}
                  onClick={() => handleCraft(r.id)}
                >
                  {isCasting
                    ? 'Fabricando…'
                    : busy
                      ? 'Processando…'
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
