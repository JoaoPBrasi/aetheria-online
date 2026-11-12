import {
  TALENTS,
  TALENT_IDS,
  TALENT_XP,
  availableTalentPoints,
  combatLevel,
  talentBlock,
  type GameplaySnapshot,
  type TalentId,
} from '@aetheria/shared';

export function TalentPanel({
  gameplay,
  busy,
  onAllocate,
}: {
  gameplay: GameplaySnapshot;
  busy: boolean;
  onAllocate: (id: TalentId) => void;
}) {
  const xp =
    gameplay.skills.find((skill) => skill.profession === 'warrior')?.xp ?? 0;
  const ranks = gameplay.talents ?? {};
  const points = availableTalentPoints(xp, ranks);
  const nodes = (ids: readonly TalentId[]) =>
    ids.map((id) => {
      const talent = TALENTS[id];
      const block = talentBlock(id, ranks, xp);
      return (
        <li
          key={id}
          className={talent.requires ? 'talent-branch-child' : undefined}
        >
          <div>
            <strong>{talent.name}</strong>{' '}
            <small>
              {ranks[id] ?? 0}/{talent.max}
            </small>
          </div>
          <p>{talent.effect}</p>
          <button
            type="button"
            disabled={busy || !!block}
            onClick={() => onAllocate(id)}
          >
            {block ?? `Investir em ${talent.name}`}
          </button>
        </li>
      );
    });
  return (
    <section className="talent-panel" aria-label="Árvore de talentos">
      <h2>Talentos</h2>
      <p>
        Nível de combate {combatLevel(xp)} · {points}{' '}
        {points === 1 ? 'ponto disponível' : 'pontos disponíveis'}
      </p>
      <label>
        Progresso até o próximo ponto · {xp % TALENT_XP}/{TALENT_XP} XP de
        combate
        <progress value={xp % TALENT_XP} max={TALENT_XP} />
      </label>
      <div className="talent-branches">
        {(['strength', 'vitality', 'intellect'] as const).map((root) => (
          <ul key={root} aria-label={TALENTS[root].name}>
            {nodes([
              root,
              ...TALENT_IDS.filter((id) => TALENTS[id].requires === root),
            ])}
          </ul>
        ))}
      </div>
    </section>
  );
}
