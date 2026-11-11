import { useState, useSyncExternalStore } from 'react';
import {
  ITEMS,
  RESOURCES,
  WEAPON_DAMAGE,
  ROASTED_TURNIP_HEAL,
  interaction,
  PROFESSION_NAMES,
  levelForXp,
  XP_PER_LEVEL,
} from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';
import type { WorldConnection } from '../../game/networking/world-connection';
import { FarmingPanel } from './farming-panel';
export function GameplayPanel({
  connection,
  section = 'all',
}: {
  connection: WorldConnection | null;
  section?: 'all' | 'bag' | 'farm';
}) {
  const state = useSyncExternalStore(
    gameBridge.subscribe,
    gameBridge.getSnapshot,
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [destination, setDestination] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const snapshot = state.gameplay;
  if (!snapshot)
    return state.status === 'connected' ? (
      <section className="gameplay-panel">
        <p>{state.gameplayError ?? 'Carregando mochila…'}</p>
        <button onClick={() => connection?.refresh()}>Carregar mochila</button>
      </section>
    ) : null;
  const disabled = state.status !== 'connected' || state.actionPending;
  const source = snapshot.inventory.find((s) => s.index === selected);
  return (
    <section className="gameplay-panel" aria-label="Inventário e profissões">
      {section !== 'farm' && (
        <>
          <h2>
            Mochila <small>24 espaços</small>
          </h2>
          <div className="inventory-grid">
            {Array.from({ length: 24 }, (_, index) => {
              const item = snapshot.inventory.find((s) => s.index === index);
              return (
                <button
                  key={index}
                  type="button"
                  aria-pressed={selected === index}
                  aria-label={`Slot ${index + 1}${item ? `: ${ITEMS[item.itemId].name}, ${item.quantity}` : ': vazio'}`}
                  onClick={() => {
                    setSelected(index);
                    setQuantity(1);
                  }}
                >
                  <small>{index + 1}</small>
                  {item ? (
                    <>
                      {ITEMS[item.itemId].name}
                      <strong>×{item.quantity}</strong>
                    </>
                  ) : (
                    '—'
                  )}
                </button>
              );
            })}
          </div>
          {(source?.itemId === 'sword' || source?.itemId === 'iron_sword') && (
            <p>
              {WEAPON_DAMAGE[source.itemId]} de dano por golpe. O combate usa a
              melhor espada que você carrega.
            </p>
          )}
          {source?.itemId === 'roasted_turnip' && (
            <p>Recupera até {ROASTED_TURNIP_HEAL} pontos de vida.</p>
          )}
          <div className="inventory-controls">
            <label>
              Quantidade
              <input
                aria-label="Quantidade a mover"
                type="number"
                min={1}
                max={source?.quantity ?? 1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
            <label>
              Slot de destino
              <input
                aria-label="Slot de destino"
                type="number"
                min={1}
                max={24}
                value={destination}
                onChange={(e) => setDestination(Number(e.target.value))}
              />
            </label>
            <button
              disabled={disabled || !source}
              onClick={() =>
                connection?.action({
                  kind: 'transfer',
                  from: selected,
                  to: destination - 1,
                  quantity,
                })
              }
            >
              Mover / dividir
            </button>
            <button
              disabled={disabled || !source || !ITEMS[source.itemId].tool}
              onClick={() =>
                connection?.action({ kind: 'equip', from: selected })
              }
            >
              Equipar
            </button>
            {source?.itemId === 'roasted_turnip' && (
              <button
                type="button"
                disabled={
                  disabled || (state.health ?? 100) >= (state.maxHealth ?? 100)
                }
                onClick={() =>
                  connection?.action({ kind: 'consume', from: source.index })
                }
              >
                {(state.health ?? 100) >= (state.maxHealth ?? 100)
                  ? 'Vida cheia'
                  : 'Comer nabo assado'}
              </button>
            )}
          </div>
          <p data-testid="equipped-tool">
            Ferramenta:{' '}
            {snapshot.equipment[0]
              ? ITEMS[snapshot.equipment[0].itemId].name
              : 'Nenhuma'}{' '}
            <button
              disabled={disabled || !snapshot.equipment.length}
              onClick={() => connection?.action({ kind: 'unequip' })}
            >
              Guardar ferramenta
            </button>
          </p>
        </>
      )}
      {section === 'all' && (
        <>
          <h3>Coleta</h3>
          <p>Aproxime-se de um recurso e use a ferramenta indicada.</p>
          <div className="resource-controls">
            {[...RESOURCES, ...(state.forage ?? [])].map((r) => {
              if (!state.position) return null;
              const target = interaction(
                snapshot,
                state.position,
                [],
                state.resources ?? {},
                state.worldTime ?? 0,
                undefined,
                r.id,
                [],
                state.forage,
              );
              if (!target) return null;
              return (
                <button
                  key={r.id}
                  disabled={disabled || !target.enabled}
                  onClick={() =>
                    connection?.action({ kind: 'gather', node: r.id })
                  }
                >
                  {target.label}
                </button>
              );
            })}
          </div>
          {state.gameplayError && <p role="alert">{state.gameplayError}</p>}
          {state.actionPending && (
            <p role="status">
              Confirmando operação…{' '}
              <button onClick={() => connection?.retryAction()}>
                Repetir solicitação
              </button>
            </p>
          )}
        </>
      )}
      {section !== 'bag' && <FarmingPanel connection={connection} />}
      {section === 'all' && (
        <>
          <h3>Profissões</h3>
          <ul>
            {snapshot.skills.map((s) => {
              const level = levelForXp(s.xp);
              return (
                <li key={s.profession}>
                  {PROFESSION_NAMES[s.profession]} · nível {level} · {s.xp} XP{' '}
                  <progress
                    aria-label={`Progresso de ${PROFESSION_NAMES[s.profession]}`}
                    value={s.xp - XP_PER_LEVEL * (level - 1) ** 2}
                    max={XP_PER_LEVEL * (level ** 2 - (level - 1) ** 2)}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
