import { useState, useSyncExternalStore } from 'react';
import {
  ITEMS,
  RESOURCES,
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
          <p>
            Equipe a ferramenta, aproxime-se do recurso e colete. Cada coleta
            rende 3 itens e 10 XP; o recurso se recupera em 5 segundos.
          </p>
          <div className="resource-controls">
            {RESOURCES.map((r) => {
              const inReach =
                state.position &&
                Math.hypot(r.x - state.position.x, r.y - state.position.y) <=
                  72;
              return (
                <button
                  key={r.id}
                  disabled={
                    disabled ||
                    !inReach ||
                    (state.resources?.[r.id] ?? 0) > (state.worldTime ?? 0)
                  }
                  title={`${r.x}, ${r.y} · ${ITEMS[r.tool].name}`}
                  onClick={() =>
                    connection?.action({ kind: 'gather', node: r.id })
                  }
                >
                  {r.name}
                  {!inReach ? ' · longe' : ''}
                  {(state.resources?.[r.id] ?? 0) > (state.worldTime ?? 0)
                    ? ' · recuperando'
                    : ''}
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
