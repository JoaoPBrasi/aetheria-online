import { useState, useSyncExternalStore } from 'react';
import {
  ITEMS,
  MARKET_BUY_PRICES,
  MARKET_SELL_PRICES,
  MERCHANT_STOCK,
  type ItemId,
  type Slot,
} from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';
import type { WorldConnection } from '../../game/networking/world-connection';
import { audioManager } from '../../game/audio/audio-manager';
import { ItemIcon, MetalCorners } from './medieval-art';

export function ShopModal({
  connection,
  onClose,
}: {
  connection: WorldConnection | null;
  onClose: () => void;
}) {
  const state = useSyncExternalStore(gameBridge.subscribe, gameBridge.getSnapshot);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const gold = state.gameplay?.gold ?? 0;
  const inventory: Slot[] = state.gameplay?.inventory ?? [];
  const busy =
    state.status !== 'connected' ||
    state.actionPending ||
    state.questPending;

  const handleBuy = (itemId: ItemId) => {
    const qty = quantities[itemId] ?? 1;
    audioManager.unlockAudio();
    audioManager.playSfx('ui_click');
    connection?.action({ kind: 'buy', itemId, quantity: qty });
  };

  const handleSell = (slotIndex: number, maxQty: number) => {
    const qty = quantities[`slot_${slotIndex}`] ?? 1;
    const finalQty = Math.max(1, Math.min(qty, maxQty));
    audioManager.unlockAudio();
    audioManager.playSfx('ui_click');
    connection?.action({ kind: 'sell', from: slotIndex, quantity: finalQty });
  };

  const handleSellAll = (slotIndex: number, maxQty: number) => {
    audioManager.unlockAudio();
    audioManager.playSfx('ui_click');
    connection?.action({ kind: 'sell', from: slotIndex, quantity: maxQty });
  };

  const setQty = (key: string, val: number, max: number = 99) => {
    const clamped = Math.max(1, Math.min(max, val));
    setQuantities((prev) => ({ ...prev, [key]: clamped }));
  };

  const sellableSlots = inventory.filter(
    (s) => (MARKET_SELL_PRICES[s.itemId] ?? 0) > 0,
  );

  return (
    <div
      className="shop-window medieval-frame"
      role="dialog"
      aria-modal="true"
      aria-label="Mercado de Brumavale"
    >
      <MetalCorners />
      <header className="shop-header">
        <h2 className="medieval-plaque">
          <span aria-hidden="true">🪙</span> Mercado de Brumavale · Mira
        </h2>
        <div className="shop-wallet" title="Seu saldo de moedas de ouro">
          <span className="coin-glow" aria-hidden="true">🪙</span>
          <strong>{gold}</strong>
          <small>Moedas de Ouro</small>
        </div>
        <button
          type="button"
          className="shop-close-btn"
          onClick={onClose}
          aria-label="Fechar mercado"
          title="Fechar mercado (Esc)"
        >
          ✕
        </button>
      </header>

      <nav className="shop-tabs" aria-label="Navegação da loja">
        <button
          type="button"
          className={`shop-tab-btn ${tab === 'buy' ? 'active' : ''}`}
          onClick={() => {
            audioManager.playSfx('ui_open');
            setTab('buy');
          }}
          aria-pressed={tab === 'buy'}
        >
          🛒 Comprar Artigos
        </button>
        <button
          type="button"
          className={`shop-tab-btn ${tab === 'sell' ? 'active' : ''}`}
          onClick={() => {
            audioManager.playSfx('ui_open');
            setTab('sell');
          }}
          aria-pressed={tab === 'sell'}
        >
          💰 Vender Itens ({sellableSlots.length})
        </button>
      </nav>

      <div className="shop-content inventory-paper">
        {tab === 'buy' ? (
          <div className="shop-grid">
            {MERCHANT_STOCK.map((itemId) => {
              const item = ITEMS[itemId];
              const unitPrice = MARKET_BUY_PRICES[itemId] ?? 0;
              const qty = quantities[itemId] ?? 1;
              const totalCost = unitPrice * qty;
              const canAfford = gold >= totalCost;

              return (
                <div
                  key={itemId}
                  className={`shop-item-card ${canAfford ? '' : 'unaffordable'}`}
                >
                  <div className="medieval-slot shop-item-icon">
                    <ItemIcon item={itemId} />
                  </div>
                  <div className="shop-item-info">
                    <strong>{item.name}</strong>
                    <span className="shop-item-price">
                      🪙 {unitPrice} <small>cada</small>
                    </span>
                  </div>
                  <div className="shop-qty-controls">
                    <button
                      type="button"
                      disabled={qty <= 1}
                      onClick={() => setQty(itemId, qty - 1)}
                      aria-label="Diminuir quantidade"
                    >
                      -
                    </button>
                    <span>{qty}</span>
                    <button
                      type="button"
                      disabled={qty >= item.stack}
                      onClick={() => setQty(itemId, qty + 1, item.stack)}
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="shop-action-btn buy-btn"
                    disabled={busy || !canAfford}
                    onClick={() => handleBuy(itemId)}
                    title={
                      canAfford
                        ? `Comprar por ${totalCost} ouro`
                        : 'Ouro insuficiente'
                    }
                  >
                    Comprar ({totalCost} 🪙)
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="shop-sell-view">
            {sellableSlots.length === 0 ? (
              <div className="shop-empty-state">
                <p>Você não possui itens vendíveis na mochila no momento.</p>
                <small>
                  Colha vegetais na horta, extraia madeira ou minérios, ou
                  derrote slimes para obter artigos com valor comercial.
                </small>
              </div>
            ) : (
              <div className="shop-grid">
                {sellableSlots.map((slot) => {
                  const item = ITEMS[slot.itemId];
                  const unitPrice = MARKET_SELL_PRICES[slot.itemId] ?? 0;
                  const key = `slot_${slot.index}`;
                  const qty = quantities[key] ?? 1;
                  const currentQty = Math.max(1, Math.min(qty, slot.quantity));
                  const totalRevenue = unitPrice * currentQty;

                  return (
                    <div
                      key={slot.index}
                      className="shop-item-card sell-card"
                    >
                      <div className="medieval-slot shop-item-icon">
                        <ItemIcon item={slot.itemId} />
                        {slot.quantity > 1 && (
                          <span className="slot-badge">×{slot.quantity}</span>
                        )}
                      </div>
                      <div className="shop-item-info">
                        <strong>{item.name}</strong>
                        <span className="shop-item-price sell-price">
                          🪙 +{unitPrice}{' '}
                          <small>cada (possuído: {slot.quantity})</small>
                        </span>
                      </div>
                      <div className="shop-qty-controls">
                        <button
                          type="button"
                          disabled={currentQty <= 1}
                          onClick={() =>
                            setQty(key, currentQty - 1, slot.quantity)
                          }
                          aria-label="Diminuir quantidade a vender"
                        >
                          -
                        </button>
                        <span>{currentQty}</span>
                        <button
                          type="button"
                          disabled={currentQty >= slot.quantity}
                          onClick={() =>
                            setQty(key, currentQty + 1, slot.quantity)
                          }
                          aria-label="Aumentar quantidade a vender"
                        >
                          +
                        </button>
                      </div>
                      <div className="shop-sell-buttons">
                        <button
                          type="button"
                          className="shop-action-btn sell-btn"
                          disabled={busy}
                          onClick={() => handleSell(slot.index, slot.quantity)}
                        >
                          Vender ({totalRevenue} 🪙)
                        </button>
                        {slot.quantity > 1 && (
                          <button
                            type="button"
                            className="shop-action-btn sell-all-btn"
                            disabled={busy}
                            onClick={() =>
                              handleSellAll(slot.index, slot.quantity)
                            }
                            title={`Vender todos os ${slot.quantity} itens por ${unitPrice * slot.quantity} ouro`}
                          >
                            Tudo ({unitPrice * slot.quantity} 🪙)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
