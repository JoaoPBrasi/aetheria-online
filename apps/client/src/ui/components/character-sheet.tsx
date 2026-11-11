import { useSyncExternalStore } from 'react';
import {
  ITEMS,
  UNARMED_DAMAGE,
  WEAPON_DAMAGE,
  hasTool,
  type Cosmetics,
  EQUIPMENT_DEFINITIONS,
  calculateCharacterStats,
  type EquipmentSlot,
} from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';
import type { WorldConnection } from '../../game/networking/world-connection';
import { CharacterPortrait } from './character-portrait';
import { GameplayPanel } from './gameplay-panel';
import { ItemIcon, MetalCorners } from './medieval-art';

export type CharacterView = 'bag' | 'equipment';

const ARMOR_SLOTS: { slot: EquipmentSlot; label: string; placeholderIcon: string }[] = [
  { slot: 'head', label: 'Cabeça', placeholderIcon: '🪖' },
  { slot: 'chest', label: 'Peitoral', placeholderIcon: '🥋' },
  { slot: 'legs', label: 'Calças', placeholderIcon: '👖' },
  { slot: 'feet', label: 'Botas', placeholderIcon: '🥾' },
];

const WEAPON_ACCESSORY_SLOTS: { slot: EquipmentSlot; label: string; placeholderIcon: string }[] = [
  { slot: 'accessory', label: 'Amuleto', placeholderIcon: '📿' },
  { slot: 'tool', label: 'Arma / Mão 1', placeholderIcon: '⚔️' },
  { slot: 'offHand', label: 'Escudo / Mão 2', placeholderIcon: '🛡️' },
];

export function CharacterSheet({
  view,
  onView,
  connection,
  name,
  look,
}: {
  view: CharacterView;
  onView: (view: CharacterView) => void;
  connection: WorldConnection | null;
  name: string;
  look: Cosmetics;
}) {
  const state = useSyncExternalStore(
    gameBridge.subscribe,
    gameBridge.getSnapshot,
  );
  const gameplay = state.gameplay;
  const equipment = gameplay?.equipment ?? [];

  const weapon =
    gameplay && hasTool(gameplay, 'iron_sword')
      ? 'iron_sword'
      : gameplay && hasTool(gameplay, 'sword')
        ? 'sword'
        : undefined;
  const baseDamage = weapon ? WEAPON_DAMAGE[weapon] : UNARMED_DAMAGE;
  const stats = calculateCharacterStats(equipment, baseDamage);

  const busy =
    state.status !== 'connected' || state.actionPending || state.questPending;

  const handleUnequipSlot = (slot: EquipmentSlot) => {
    if (busy || !connection) return;
    connection.action({ kind: 'unequip', slot });
  };

  return (
    <div className="character-sheet" data-view={view}>
      <nav
        className="character-sheet-switch"
        aria-label="Painéis do personagem"
      >
        <button
          type="button"
          aria-pressed={view === 'bag'}
          onClick={() => onView('bag')}
        >
          <kbd>B</kbd> Inventário
        </button>
        <button
          type="button"
          aria-pressed={view === 'equipment'}
          onClick={() => onView('equipment')}
        >
          <kbd>C</kbd> Equipamentos
        </button>
      </nav>

      {/* Seção da Mochila / Inventário */}
      <section
        className="character-sheet-bag medieval-frame"
        aria-labelledby="character-bag-title"
      >
        <MetalCorners />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 4px 8px' }}>
          <h2 className="medieval-plaque" id="character-bag-title" style={{ margin: 0 }}>
            <span aria-hidden="true">▦</span> Inventário
          </h2>
          <span className="shop-wallet" style={{ fontSize: '13px', padding: '2px 8px' }} title="Moedas de ouro">
            <span aria-hidden="true">🪙</span>
            <strong>{gameplay?.gold ?? 0}</strong>
            <small>ouro</small>
          </span>
        </div>
        <GameplayPanel connection={connection} section="bag" />
      </section>

      {/* Seção de Equipamentos (Paper Doll Completa) */}
      <section
        className="character-sheet-equipment medieval-frame"
        aria-labelledby="character-equipment-title"
      >
        <MetalCorners />
        <h2 className="medieval-plaque" id="character-equipment-title">
          <span aria-hidden="true">⚔</span> Equipamentos do Herói
        </h2>

        <div className="paper-doll-layout">
          {/* Coluna Esquerda: Armaduras */}
          <div className="paper-doll-column left">
            {ARMOR_SLOTS.map(({ slot, label, placeholderIcon }) => {
              const piece = equipment.find((e) => e.slot === slot);
              const def = piece ? EQUIPMENT_DEFINITIONS[piece.itemId] : undefined;
              return (
                <div
                  key={slot}
                  className={`equipment-piece ${piece ? 'equipped' : 'empty'}`}
                  data-testid={`equipped-${slot}`}
                  onClick={() => piece && handleUnequipSlot(slot)}
                  title={
                    piece
                      ? `${ITEMS[piece.itemId].name} (${label})\n${def ? `+${def.bonusHp} HP · +${def.armor} Defesa` : ''}\nClique para desequipar`
                      : `Slot de ${label} (Vazio)`
                  }
                >
                  <span className="piece-label">{label}</span>
                  <div className="medieval-slot gear-socket">
                    {piece ? (
                      <ItemIcon item={piece.itemId} />
                    ) : (
                      <span className="slot-placeholder" aria-hidden="true">{placeholderIcon}</span>
                    )}
                  </div>
                  <strong className="piece-name">
                    {piece ? ITEMS[piece.itemId].name : 'Vazio'}
                  </strong>
                </div>
              );
            })}
          </div>

          {/* Coluna Central: Retrato do Personagem */}
          <div className="paper-doll-portrait-center">
            <div className="paper-doll-portrait">
              <CharacterPortrait look={look} />
            </div>
            <strong className="character-hero-name">{name}</strong>
            <span className="character-title-badge">Aventureiro de Brumavale</span>
          </div>

          {/* Coluna Direita: Amuleto, Mão Principal e Secundária */}
          <div className="paper-doll-column right">
            {WEAPON_ACCESSORY_SLOTS.map(({ slot, label, placeholderIcon }) => {
              const piece = equipment.find((e) => e.slot === slot);
              const def = piece ? EQUIPMENT_DEFINITIONS[piece.itemId] : undefined;
              return (
                <div
                  key={slot}
                  className={`equipment-piece ${piece ? 'equipped' : 'empty'}`}
                  data-testid={`equipped-${slot}`}
                  onClick={() => piece && handleUnequipSlot(slot)}
                  title={
                    piece
                      ? `${ITEMS[piece.itemId].name} (${label})\n${def ? `+${def.bonusHp} HP · +${def.armor} Defesa · +${def.bonusAttack} Ataque` : ''}\nClique para desequipar`
                      : `Slot de ${label} (Vazio)`
                  }
                >
                  <span className="piece-label">{label}</span>
                  <div className="medieval-slot gear-socket">
                    {piece ? (
                      <ItemIcon item={piece.itemId} />
                    ) : (
                      <span className="slot-placeholder" aria-hidden="true">{placeholderIcon}</span>
                    )}
                  </div>
                  <strong className="piece-name">
                    {piece ? ITEMS[piece.itemId].name : 'Vazio'}
                  </strong>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel de Atributos do Personagem */}
        <div className="character-attributes medieval-attributes">
          <h3 className="attributes-title">Atributos de Combate</h3>
          <dl className="attributes-grid">
            <div className="attribute-card">
              <dt><span aria-hidden="true">♥</span> Vida Máxima</dt>
              <dd>
                {state.health ?? 100} / {stats.maxHealth}
                {stats.bonusHp > 0 && <small className="stat-bonus"> (+{stats.bonusHp})</small>}
              </dd>
            </div>
            <div className="attribute-card">
              <dt><span aria-hidden="true">🛡️</span> Defesa Física</dt>
              <dd>
                {stats.defense}
                <small className="stat-hint"> (−{stats.defense} absorvido)</small>
              </dd>
            </div>
            <div className="attribute-card">
              <dt><span aria-hidden="true">⚔️</span> Poder de Ataque</dt>
              <dd>
                {stats.attack}
                {stats.bonusAttack > 0 && <small className="stat-bonus"> (+{stats.bonusAttack})</small>}
                <small className="stat-hint"> por golpe</small>
              </dd>
            </div>
            <div className="attribute-card">
              <dt><span aria-hidden="true">⚡</span> Chance de Crítico</dt>
              <dd>
                {stats.critChance}% <small className="stat-hint">(1.5× dano)</small>
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
