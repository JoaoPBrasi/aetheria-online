import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  hasTool,
  ITEMS,
  interaction,
  PROFESSION_NAMES,
  levelForXp,
  WORLD_REGIONS,
  TILE_SIZE,
  CAMPFIRE,
  CAMPFIRE_REST_RANGE,
  type CropId,
  type CraftingStationId,
} from '@aetheria/shared';
import { gameBridge } from '../../game/managers/game-bridge';
import type { WorldConnection } from '../../game/networking/world-connection';
import { audioManager } from '../../game/audio/audio-manager';
import { AudioModal } from './audio-modal';
import { GameplayPanel } from './gameplay-panel';
import { CraftingPanel } from './crafting-panel';
import { DialogueModal } from './dialogue-modal';
import { Hotbar } from './hotbar';
import { Minimap } from './minimap';
import { QuestTracker } from './quest-tracker';
import { QuestJournal } from './quest-journal';
import { soloGuide } from '../solo-guide';
import {
  activeQuests,
  readHiddenQuests,
  saveHiddenQuests,
} from '../quest-tracking';
export function GameHud({
  connection,
  name,
  characterId,
  ready,
  onExit,
}: {
  connection: WorldConnection | null;
  name: string;
  characterId: string;
  ready: boolean | null;
  onExit: () => void;
}) {
  const s = useSyncExternalStore(gameBridge.subscribe, gameBridge.getSnapshot);
  const region =
    s.position &&
    WORLD_REGIONS.find(
      (r) =>
        s.position!.x / TILE_SIZE >= r.x &&
        s.position!.x / TILE_SIZE < r.x + r.w &&
        s.position!.y / TILE_SIZE >= r.y &&
        s.position!.y / TILE_SIZE < r.y + r.h,
    );
  const [panel, setPanel] = useState<
    | 'bag'
    | 'skills'
    | 'farm'
    | 'crafting'
    | 'dialogue'
    | 'quests'
    | 'audio'
    | null
  >(null);
  const [hiddenQuests, setHiddenQuests] = useState(() =>
    readHiddenQuests(characterId),
  );
  const toggleQuest = (questId: string) => {
    const next = hiddenQuests.includes(questId)
      ? hiddenQuests.filter((id) => id !== questId)
      : [...hiddenQuests, questId];
    setHiddenQuests(next);
    saveHiddenQuests(characterId, next);
  };
  const [craftStation, setCraftStation] = useState<
    CraftingStationId | undefined
  >(undefined);
  const [dialogueNpc, setDialogueNpc] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropId>('turnip');
  const close = useRef<HTMLButtonElement>(null);
  const guide =
    s.status === 'connected' && s.position && s.quests
      ? soloGuide(s.quests, s.position, hiddenQuests, s.gameplay)
      : undefined;
  const position = s.position;
  const threatened =
    position &&
    s.monsters?.some(
      (monster) =>
        monster.state === 'windup' &&
        monster.targetId === characterId &&
        Math.hypot(position.x - monster.x, position.y - monster.y) <=
          monster.attackRange + 8,
    );
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
          s.forage,
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
        now.forage,
      );
      if (item?.enabled) {
        audioManager.unlockAudio();
        if (item.payload.kind === 'gather') {
          const nodeName = typeof item.payload.node === 'string' ? item.payload.node : '';
          if (nodeName.startsWith('wood')) {
            audioManager.playSfx('chop');
          } else if (nodeName.startsWith('stone')) {
            audioManager.playSfx('mine');
          } else {
            audioManager.playSfx('gather');
          }
          connection?.action(item.payload);
        } else if (item.payload.kind === 'farm') {
          audioManager.playSfx('gather');
          connection?.action(item.payload);
        } else if (item.payload.kind === 'craft') {
          audioManager.playSfx('craft');
          connection?.action(item.payload);
        } else if (item.payload.kind === 'open_crafting') {
          audioManager.playSfx('ui_open');
          setCraftStation(item.payload.stationId as CraftingStationId);
          setPanel('crafting');
        } else if (item.payload.kind === 'open_dialogue') {
          audioManager.playSfx('ui_open');
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
      if (
        k === 'b' ||
        k === 'l' ||
        k === 'h' ||
        k === 'c' ||
        k === 'j' ||
        k === 'o'
      ) {
        e.preventDefault();
        audioManager.unlockAudio();
        const next =
          k === 'b'
            ? 'bag'
            : k === 'l'
              ? 'skills'
              : k === 'h'
                ? 'farm'
                : k === 'j'
                  ? 'quests'
                  : k === 'o'
                    ? 'audio'
                    : 'crafting';
        setPanel((p) => {
          const res = p === next ? null : next;
          audioManager.playSfx(res ? 'ui_open' : 'ui_close');
          return res;
        });
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
  }, [connection, crop, panel]);
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
            <span className="hud-health-text" data-testid="player-health">
              {s.health ?? 100} / {s.maxHealth ?? 100} HP
            </span>
          </div>
          <small data-testid="connection-status">
            {s.status === 'connected' ? 'Conectado' : 'Reconectando…'} ·{' '}
            <b data-testid="player-count">{s.players} / 16</b>
          </small>
        </div>
      </div>
      <Minimap
        position={s.position}
        regionName={region?.name}
        nearby={s.nearby}
        monsters={s.monsters}
        onExit={onExit}
      />
      <QuestTracker
        quests={activeQuests(s.quests ?? []).filter(
          (q) => !hiddenQuests.includes(q.questId),
        )}
        onOpenJournal={() => setPanel('quests')}
        onUntrack={toggleQuest}
      />
      {!panel && guide && (
        <div className="solo-guide" data-testid="solo-guide">
          <strong>{guide.title}</strong>
          <span className="solo-guide-route">{guide.route}</span>
          <small>{guide.hint}</small>
        </div>
      )}
      {!panel && threatened && (
        <div className="combat-warning" data-testid="enemy-windup">
          Recue do círculo!
        </div>
      )}
      {s.combatText &&
        s.combatAt !== undefined &&
        (s.worldTime ?? 0) - s.combatAt < 1400 && (
          <div
            className="combat-feedback"
            data-testid="combat-feedback"
            aria-live="polite"
          >
            {s.combatText}
          </div>
        )}
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
        ) : s.position &&
          Math.hypot(s.position.x - CAMPFIRE.x, s.position.y - CAMPFIRE.y) <=
            CAMPFIRE_REST_RANGE ? (
          <p>Fogueira · recupere vida fora de combate</p>
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
        <button
          aria-label="Abrir diário de missões"
          aria-expanded={panel === 'quests'}
          onClick={() => {
            audioManager.unlockAudio();
            audioManager.playSfx('ui_click');
            setPanel((p) => (p === 'quests' ? null : 'quests'));
          }}
        >
          <kbd>J</kbd>
          <span>◇</span>Missões
        </button>
        <button
          aria-label="Opções de áudio"
          aria-expanded={panel === 'audio'}
          onClick={() => {
            audioManager.unlockAudio();
            audioManager.playSfx('ui_click');
            setPanel((p) => (p === 'audio' ? null : 'audio'));
          }}
        >
          <kbd>O</kbd>
          <span>🔊</span>Som
        </button>
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
      {panel === 'audio' && <AudioModal onClose={() => setPanel(null)} />}
      {panel && panel !== 'dialogue' && panel !== 'audio' && (
        <div
          className={`hud-modal ${panel === 'quests' ? 'quest-journal-window' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={
            panel === 'bag'
              ? 'Mochila'
              : panel === 'skills'
                ? 'Ofícios'
                : panel === 'quests'
                  ? 'Diário de missões'
                  : panel === 'crafting'
                    ? 'Criação e Forja'
                    : 'Horta'
          }
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              const buttons = e.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled):not([tabindex="-1"]),input,select',
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
                    : panel === 'quests'
                      ? 'DIÁRIO DE MISSÕES'
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
          {panel === 'quests' ? (
            <QuestJournal
              quests={s.quests ?? []}
              hiddenIds={hiddenQuests}
              onToggle={toggleQuest}
            />
          ) : panel === 'bag' ? (
            <GameplayPanel connection={connection} section="bag" />
          ) : panel === 'farm' ? (
            <GameplayPanel connection={connection} section="farm" />
          ) : panel === 'crafting' ? (
            <CraftingPanel
              key={craftStation}
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
