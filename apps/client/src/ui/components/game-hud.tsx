import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  hasTool,
  ITEMS,
  interaction,
  PROFESSION_NAMES,
  levelForXp,
  type CropId,
  type CraftingStationId,
} from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';
import type { WorldConnection } from '../../game/networking/world-connection';
import { GameplayPanel } from './gameplay-panel';
import { CraftingPanel } from './crafting-panel';
import { DialogueModal } from './dialogue-modal';
import { Hotbar } from './hotbar';
export function GameHud({
  connection,
  name,
  ready,
  onExit,
}: {
  connection: WorldConnection | null;
  name: string;
  ready: boolean | null;
  onExit: () => void;
}) {
  const s = useSyncExternalStore(gameBridge.subscribe, gameBridge.getSnapshot);
  const [panel, setPanel] = useState<
    'bag' | 'skills' | 'farm' | 'crafting' | 'dialogue' | null
  >(null);
  const [craftStation, setCraftStation] = useState<
    CraftingStationId | undefined
  >(undefined);
  const [dialogueNpc, setDialogueNpc] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropId>('turnip');
  const close = useRef<HTMLButtonElement>(null);
  const nearby =
    s.gameplay && s.position
      ? interaction(
          s.gameplay,
          s.position,
          s.plots ?? [],
          s.resources ?? {},
          s.worldTime ?? 0,
          crop,
          undefined,
          s.monsters ?? [],
        )
      : undefined;
  useEffect(() => {
    gameBridge.update({ inputBlocked: !!panel });
    if (panel) close.current?.focus();
    return () => gameBridge.update({ inputBlocked: false });
  }, [panel]);
  useEffect(() => {
    const act = (target?: string) => {
      const now = gameBridge.getSnapshot();
      if (
        now.status !== 'connected' ||
        now.actionPending ||
        now.inputBlocked ||
        !now.gameplay ||
        !now.position
      )
        return;
      const item = interaction(
        now.gameplay,
        now.position,
        now.plots ?? [],
        now.resources ?? {},
        now.worldTime ?? 0,
        crop,
        target,
        now.monsters ?? [],
      );
      if (item?.enabled) {
        if (item.payload.kind === 'open_crafting') {
          setCraftStation(item.payload.stationId as CraftingStationId);
          setPanel('crafting');
        } else if (item.payload.kind === 'open_dialogue') {
          setDialogueNpc(item.payload.npcId as string);
          setPanel('dialogue');
        } else {
          connection?.action(item.payload);
        }
      }
    };
    gameBridge.interact = act;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPanel(null);
        return;
      }
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('input,textarea,select,[contenteditable=true]')
      )
        return;
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        setPanel(null);
        return;
      }
      const num = parseInt(k, 10);
      if (!panel && !isNaN(num) && num >= 1 && num <= 8) {
        e.preventDefault();
        const slotIndex = num - 1;
        const currentSnap = gameBridge.getSnapshot().gameplay;
        if (currentSnap) {
          const slotItem = currentSnap.inventory.find(
            (i) => i.index === slotIndex,
          );
          const equippedTool = currentSnap.equipment.find(
            (eq) => eq.slot === 'tool',
          )?.itemId;
          if (slotItem && ITEMS[slotItem.itemId]?.tool) {
            if (slotItem.itemId === equippedTool) {
              connection?.action({ kind: 'unequip' });
            } else {
              connection?.action({ kind: 'equip', from: slotIndex });
            }
          }
        }
        return;
      }
      if (k === 'b' || k === 'l' || k === 'h' || k === 'c') {
        e.preventDefault();
        const next =
          k === 'b'
            ? 'bag'
            : k === 'l'
              ? 'skills'
              : k === 'h'
                ? 'farm'
                : 'crafting';
        setPanel((p) => (p === next ? null : next));
      }
      if (k === 'e' || k === ' ') {
        e.preventDefault();
        act();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      gameBridge.interact = undefined;
    };
  }, [connection, crop]);
  return (
    <div className="game-hud">
      <div className="hud-identity">
        <div className="hud-avatar">✦</div>
        <div>
          <strong>{name}</strong>
          <span>Explorador de Brumavale</span>
          <div
            className="hud-health-bar"
            title={`Vida: ${s.health ?? 100}/${s.maxHealth ?? 100} HP`}
          >
            <div
              className="hud-health-fill"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    ((s.health ?? 100) / (s.maxHealth ?? 100)) * 100,
                  ),
                )}%`,
              }}
            />
            <span className="hud-health-text">
              {s.health ?? 100} / {s.maxHealth ?? 100} HP
            </span>
          </div>
          <small data-testid="connection-status">
            {s.status === 'connected' ? 'Conectado' : 'Reconectando…'} ·{' '}
            <b data-testid="player-count">{s.players} / 16</b>
          </small>
        </div>
      </div>
      <div className="hud-location">
        <span>AETHERIA / TERRAS LIVRES</span>
        <strong>Brumavale</strong>
        <small>WASD · mover &nbsp; E · interagir</small>
        <button onClick={onExit}>Sair da sala</button>
      </div>
      <div className="hud-context" aria-live="polite">
        {s.status !== 'connected' ? (
          <p>Reconectando… As ações estão pausadas.</p>
        ) : nearby ? (
          <>
            <small>{nearby.name}</small>
            <button
              data-testid="context-action"
              disabled={!nearby.enabled || s.actionPending || !!panel}
              onClick={() => gameBridge.interact?.()}
            >
              <kbd>E</kbd>
              {s.actionPending ? 'Trabalhando…' : nearby.label}
            </button>
            {nearby.payload.operation === 'plant' && (
              <div className="crop-quick">
                <button
                  aria-pressed={crop === 'turnip'}
                  onClick={() => setCrop('turnip')}
                >
                  Nabo · 60s
                </button>
                <button
                  aria-pressed={crop === 'pumpkin'}
                  onClick={() => setCrop('pumpkin')}
                >
                  Abóbora · 120s
                </button>
              </div>
            )}
          </>
        ) : (
          <p>Explore. Aproxime-se de um recurso para interagir.</p>
        )}
      </div>
      {s.feedback &&
        !!s.feedbackAt &&
        (s.worldTime ?? 0) - s.feedbackAt < 2500 &&
        !s.gameplayError && (
          <div className="hud-toast success" role="status">
            {s.feedback}
          </div>
        )}
      {s.gameplayError && (
        <div className="hud-toast" role="alert">
          {s.gameplayError}
        </div>
      )}
      {s.gameplay && (
        <Hotbar
          inventory={s.gameplay.inventory}
          equipment={s.gameplay.equipment}
          onEquip={(fromIndex) =>
            connection?.action({ kind: 'equip', from: fromIndex })
          }
          onUnequip={() => connection?.action({ kind: 'unequip' })}
        />
      )}
      <nav className="hud-dock" aria-label="Atalhos do jogo">
        <button
          aria-label="Abrir mochila"
          onClick={() => setPanel((p) => (p === 'bag' ? null : 'bag'))}
        >
          <kbd>B</kbd>
          <span>▦</span>Mochila
        </button>
        <div className="dock-divider" />
        <button
          aria-label="Abrir ofícios"
          onClick={() => setPanel((p) => (p === 'skills' ? null : 'skills'))}
        >
          <kbd>L</kbd>
          <span>⚒</span>Ofícios
        </button>
        <button
          aria-label="Abrir horta"
          onClick={() => setPanel((p) => (p === 'farm' ? null : 'farm'))}
        >
          <kbd>H</kbd>
          <span>♧</span>Horta
        </button>
        <button
          aria-label="Abrir criação"
          onClick={() =>
            setPanel((p) => (p === 'crafting' ? null : 'crafting'))
          }
        >
          <kbd>C</kbd>
          <span>🔨</span>Criação
        </button>
        <div className="dock-divider" />
        <span className="dock-note">
          FERRAMENTAS AUTOMÁTICAS
          <br />
          <small>Mochila ou equipamento</small>
        </span>
      </nav>
      <div className="hud-status">
        <span data-testid="database-status">
          {ready ? 'Disponível' : 'Indisponível'}
        </span>
        <span>{s.fps} FPS</span>
        <span data-testid="world-position">
          {s.position?.x}, {s.position?.y} ·{' '}
          {s.motion === 'walking' ? 'Andando' : 'Parado'}
        </span>
      </div>
      <div className="hud-party" data-testid="nearby-players">
        {s.nearby?.map((p) => (
          <span key={p.name} data-x={Math.round(p.x)} data-y={Math.round(p.y)}>
            {p.name}
          </span>
        ))}
      </div>
      {panel && panel !== 'dialogue' && (
        <div
          className="hud-modal"
          role="dialog"
          aria-modal="true"
          aria-label={
            panel === 'bag'
              ? 'Mochila'
              : panel === 'skills'
                ? 'Ofícios'
                : 'Horta'
          }
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              const buttons = e.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,select',
              );
              const first = buttons[0],
                last = buttons[buttons.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <header>
            <span>
              EXPLORADOR /{' '}
              {panel === 'bag'
                ? 'PERTENCES'
                : panel === 'skills'
                  ? 'OFÍCIOS'
                  : panel === 'farm'
                    ? 'AGRICULTURA'
                    : 'CRIAÇÃO & FORJA'}
            </span>
            <button
              ref={close}
              aria-label="Fechar painel"
              onClick={() => setPanel(null)}
            >
              ✕ <kbd>ESC</kbd>
            </button>
          </header>
          {panel === 'bag' ? (
            <GameplayPanel connection={connection} section="bag" />
          ) : panel === 'farm' ? (
            <GameplayPanel connection={connection} section="farm" />
          ) : panel === 'crafting' ? (
            <CraftingPanel
              connection={connection}
              initialStation={craftStation}
            />
          ) : (
            <section className="lifeskills">
              <h2>Ofícios & ferramentas</h2>
              <p>
                Não é preciso trocar de ferramenta. Basta carregá-la na mochila
                ou mantê-la equipada.
              </p>
              <div className="tool-belt">
                {(
                  ['axe', 'pickaxe', 'sickle', 'hoe', 'watering_can'] as const
                ).map((t) => (
                  <div
                    key={t}
                    className={
                      s.gameplay && hasTool(s.gameplay, t)
                        ? 'available'
                        : 'missing'
                    }
                  >
                    <span>⚒</span>
                    <strong>{ITEMS[t].name}</strong>
                    <small>
                      {s.gameplay && hasTool(s.gameplay, t)
                        ? 'Pronta para usar'
                        : 'Não disponível'}
                    </small>
                  </div>
                ))}
              </div>
              <h3>Seu progresso</h3>
              {s.gameplay?.skills.map((p) => (
                <p key={p.profession}>
                  {PROFESSION_NAMES[p.profession]}{' '}
                  <b>Nível {levelForXp(p.xp)}</b>
                  <progress
                    aria-label={PROFESSION_NAMES[p.profession]}
                    max={100 * levelForXp(p.xp) ** 2}
                    value={p.xp}
                  />
                  <small>{p.xp} XP</small>
                </p>
              ))}
            </section>
          )}
        </div>
      )}
      {panel === 'dialogue' && (
        <DialogueModal
          npcId={dialogueNpc ?? 'elder-eldrin'}
          onClose={() => {
            setPanel(null);
            setDialogueNpc(null);
          }}
        />
      )}
    </div>
  );
}
