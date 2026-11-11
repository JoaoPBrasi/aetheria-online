import { useSyncExternalStore } from 'react';
import {
  ITEMS,
  UNARMED_DAMAGE,
  WEAPON_DAMAGE,
  hasTool,
  type Cosmetics,
} from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';
import type { WorldConnection } from '../../game/networking/world-connection';
import { CharacterPortrait } from './character-portrait';
import { GameplayPanel } from './gameplay-panel';
import { ItemIcon, MetalCorners } from './medieval-art';

export type CharacterView = 'bag' | 'equipment';

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
  const tool = gameplay?.equipment.find(
    (entry) => entry.slot === 'tool',
  )?.itemId;
  const weapon =
    gameplay && hasTool(gameplay, 'iron_sword')
      ? 'iron_sword'
      : gameplay && hasTool(gameplay, 'sword')
        ? 'sword'
        : undefined;
  const damage = weapon ? WEAPON_DAMAGE[weapon] : UNARMED_DAMAGE;
  const busy =
    state.status !== 'connected' || state.actionPending || state.questPending;
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
      <section
        className="character-sheet-bag medieval-frame"
        aria-labelledby="character-bag-title"
      >
        <MetalCorners />
        <h2 className="medieval-plaque" id="character-bag-title">
          <span aria-hidden="true">▦</span> Inventário
        </h2>
        <GameplayPanel connection={connection} section="bag" />
      </section>
      <section
        className="character-sheet-equipment medieval-frame"
        aria-labelledby="character-equipment-title"
      >
        <MetalCorners />
        <h2 className="medieval-plaque" id="character-equipment-title">
          <span aria-hidden="true">⚔</span> Equipamentos
        </h2>
        <div className="paper-doll">
          <div className="equipment-piece" data-testid="equipped-tool">
            <span>Ferramenta</span>
            <div className="medieval-slot gear-socket">
              {tool ? (
                <ItemIcon item={tool} />
              ) : (
                <span aria-hidden="true">⚒</span>
              )}
            </div>
            <strong>{tool ? ITEMS[tool].name : 'Vazio'}</strong>
          </div>
          <div className="paper-doll-portrait">
            <CharacterPortrait look={look} />
            <strong>{name}</strong>
          </div>
          <div className="equipment-piece">
            <span>Arma em uso</span>
            <div className="medieval-slot gear-socket">
              {weapon ? (
                <ItemIcon item={weapon} />
              ) : (
                <span aria-hidden="true">⚔</span>
              )}
            </div>
            <strong>{weapon ? ITEMS[weapon].name : 'Mãos livres'}</strong>
          </div>
        </div>
        <div className="character-attributes">
          <h3>Atributos</h3>
          <dl>
            <div>
              <dt>
                <span aria-hidden="true">♥</span> Vida
              </dt>
              <dd>
                {state.health ?? 100} / {state.maxHealth ?? 100}
              </dd>
            </div>
            <div>
              <dt>
                <span aria-hidden="true">⚔</span> Ataque
              </dt>
              <dd>{damage} por golpe</dd>
            </div>
          </dl>
        </div>
        {tool && (
          <button
            type="button"
            className="equipment-store"
            disabled={busy}
            onClick={() => connection?.action({ kind: 'unequip' })}
          >
            Guardar ferramenta
          </button>
        )}
      </section>
    </div>
  );
}
