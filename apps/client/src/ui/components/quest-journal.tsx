import { useState } from 'react';
import {
  ITEMS,
  NPCS,
  PROFESSION_NAMES,
  QUESTS,
  type CharacterQuestState,
} from '@aetheria/shared';
import { activeQuests } from '../quest-tracking';
import { QuestObjectives } from './quest-objectives';

export function QuestJournal({
  quests,
  hiddenIds,
  onToggle,
}: {
  quests: CharacterQuestState[];
  hiddenIds: string[];
  onToggle: (questId: string) => void;
}) {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const active = activeQuests(quests);
  const completed = quests
    .filter((q) => q.status === 'completed' && QUESTS[q.questId])
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const source = tab === 'active' ? active : completed;
  const visible = source.filter((q) =>
    QUESTS[q.questId]!.title.toLocaleLowerCase('pt-BR').includes(
      search.trim().toLocaleLowerCase('pt-BR'),
    ),
  );
  const selected = visible.find((q) => q.questId === selectedId) ?? visible[0];
  const definition = selected ? QUESTS[selected.questId] : undefined;
  const trackedCount = active.filter(
    (q) => !hiddenIds.includes(q.questId),
  ).length;

  return (
    <section className="quest-journal" aria-label="Diário de missões">
      <div className="journal-intro">
        <div>
          <span className="journal-eyebrow">REGISTROS DE BRUMAVALE</span>
          <h2>Diário de Missões</h2>
        </div>
        <span className="journal-tracked-count">◇ {trackedCount} no HUD</span>
      </div>
      <div
        className="journal-tabs"
        role="tablist"
        aria-label="Estado das missões"
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const next = tab === 'active' ? 'completed' : 'active';
          setTab(next);
          event.currentTarget
            .querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)
            ?.focus();
        }}
      >
        {(
          [
            { id: 'active', label: 'Em andamento', count: active.length },
            { id: 'completed', label: 'Concluídas', count: completed.length },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            id={`quest-tab-${item.id}`}
            data-tab={item.id}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls="quest-journal-content"
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => {
              setTab(item.id);
              setSelectedId(null);
            }}
          >
            {item.label} <span>{item.count}</span>
          </button>
        ))}
      </div>
      <div className="journal-toolbar">
        <label>
          <span className="sr-only">Buscar missão</span>
          <input
            type="search"
            placeholder="Buscar missão…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <small>
          {tab === 'active'
            ? 'Marque ◇ para acompanhar na tela.'
            : 'Suas conquistas ficam guardadas aqui.'}
        </small>
      </div>
      <div
        id="quest-journal-content"
        className="journal-content"
        role="tabpanel"
        aria-labelledby={`quest-tab-${tab}`}
      >
        <div className="journal-list">
          <div className="journal-region">
            <span aria-hidden="true">⌄</span> Brumavale{' '}
            <span>{visible.length}</span>
          </div>
          {visible.length ? (
            <ul
              aria-label={
                tab === 'active' ? 'Missões em andamento' : 'Missões concluídas'
              }
            >
              {visible.map((state) => {
                const quest = QUESTS[state.questId]!;
                const done = state.status === 'completed';
                const ready = state.status === 'ready_to_turn_in';
                const count = quest.objectives.filter(
                  (o) => (state.progress[o.id] ?? 0) >= o.required,
                ).length;
                return (
                  <li
                    key={state.questId}
                    className={`journal-row ${selected?.questId === state.questId ? 'selected' : ''}`}
                  >
                    {!done && (
                      <button
                        type="button"
                        role="checkbox"
                        className="journal-track-checkbox"
                        aria-label={`Acompanhar ${quest.title}`}
                        aria-checked={!hiddenIds.includes(state.questId)}
                        onClick={() => onToggle(state.questId)}
                      >
                        {!hiddenIds.includes(state.questId) ? '✓' : ''}
                      </button>
                    )}
                    {done && (
                      <span className="journal-done-icon" aria-hidden="true">
                        ✓
                      </span>
                    )}
                    <button
                      className="journal-row-select"
                      aria-pressed={selected?.questId === state.questId}
                      onClick={() => setSelectedId(state.questId)}
                    >
                      <span className="journal-row-name">{quest.title}</span>
                      <small className={ready ? 'ready' : ''}>
                        {done
                          ? 'Concluída'
                          : ready
                            ? 'Entregar'
                            : `${count}/${quest.objectives.length} objetivos`}
                      </small>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="journal-empty">
              <span aria-hidden="true">◇</span>
              <h3>
                {search
                  ? 'Nenhuma missão encontrada'
                  : tab === 'active'
                    ? 'Nenhuma missão em andamento'
                    : 'Sua história está começando'}
              </h3>
              <p>
                {search
                  ? 'Tente buscar outro nome.'
                  : tab === 'active'
                    ? 'Fale com o Ancião Eldrin para conhecer novas jornadas.'
                    : 'Ao entregar uma missão, ela aparecerá nesta aba.'}
              </p>
            </div>
          )}
        </div>
        {selected && definition && (
          <article
            className="journal-detail"
            aria-label={`Detalhes de ${definition.title}`}
          >
            <span className={`journal-status ${selected.status}`}>
              {selected.status === 'completed'
                ? '✓ Concluída'
                : selected.status === 'ready_to_turn_in'
                  ? '◇ Pronta para entregar'
                  : 'Em andamento'}
            </span>
            <h3>{definition.title}</h3>
            <p className="journal-npc">
              {NPCS.find((npc) => npc.id === definition.giverNpcId)?.name ??
                'Brumavale'}
            </p>
            <p>{definition.description}</p>
            <h4>Objetivos</h4>
            <QuestObjectives quest={definition} state={selected} />
            <h4>
              {selected.status === 'completed'
                ? 'Recompensas recebidas'
                : 'Recompensas'}
            </h4>
            <ul className="journal-rewards">
              <li>
                ✦ {definition.rewards.xp.amount} XP ·{' '}
                {PROFESSION_NAMES[definition.rewards.xp.profession] ??
                  definition.rewards.xp.profession}
              </li>
              {definition.rewards.items.map((item) => (
                <li key={item.itemId}>
                  {item.quantity}× {ITEMS[item.itemId].name}
                </li>
              ))}
            </ul>
            {selected.status === 'completed' ? (
              <p className="journal-completed-date">
                {selected.completedAt
                  ? `Entregue em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(selected.completedAt)}`
                  : 'Missão entregue.'}
              </p>
            ) : (
              <button
                className="journal-track-action"
                aria-pressed={!hiddenIds.includes(selected.questId)}
                onClick={() => onToggle(selected.questId)}
              >
                {hiddenIds.includes(selected.questId)
                  ? '◇ Acompanhar no HUD'
                  : '✓ Acompanhando · remover do HUD'}
              </button>
            )}
          </article>
        )}
      </div>
      <div className="journal-footer">
        <span>Seu progresso é salvo automaticamente.</span>
        <span>
          <kbd>J</kbd> Diário &nbsp; <kbd>ESC</kbd> Fechar
        </span>
      </div>
    </section>
  );
}
