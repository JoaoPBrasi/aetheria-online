import { useState } from 'react';
import {
  ATTRIBUTES,
  ATTRIBUTE_IDS,
  MAX_ATTRIBUTE_RANK,
  TALENT_XP,
  availableAttributePoints,
  combatLevel,
  type AttributeId,
  type GameplaySnapshot,
} from '@aetheria/shared';

export function AttributePanel({
  gameplay,
  busy,
  onAllocate,
}: {
  gameplay: GameplaySnapshot;
  busy: boolean;
  onAllocate: (attribute: AttributeId) => void;
}) {
  const xp =
    gameplay.skills.find((skill) => skill.profession === 'warrior')?.xp ?? 0;
  const ranks = gameplay.attributes ?? {};
  const [help, setHelp] = useState<AttributeId>();
  const points = availableAttributePoints(xp, ranks);
  return (
    <section
      className="character-attributes attribute-allocation"
      aria-labelledby="attribute-allocation-title"
    >
      <h3 className="attributes-title" id="attribute-allocation-title">
        Distribuir atributos
      </h3>
      <p className="attribute-points">
        Nível de combate {combatLevel(xp)} ·{' '}
        <strong aria-live="polite">
          {points} {points === 1 ? 'ponto disponível' : 'pontos disponíveis'}
        </strong>
      </p>
      {combatLevel(xp) < ATTRIBUTE_IDS.length * MAX_ATTRIBUTE_RANK && (
        <label className="attribute-progress">
          Próximo nível · {xp % TALENT_XP}/{TALENT_XP} XP de combate
          <progress max={TALENT_XP} value={xp % TALENT_XP} />
        </label>
      )}
      <ul className="attribute-ranks">
        {ATTRIBUTE_IDS.map((id) => {
          const { name, effect } = ATTRIBUTES[id];
          const rank = ranks[id] ?? 0;
          return (
            <li key={id}>
              <strong>
                {name}{' '}
                <small>
                  {rank}/{MAX_ATTRIBUTE_RANK}
                </small>
              </strong>
              <button
                type="button"
                className="attribute-increase"
                disabled={busy || points === 0 || rank >= MAX_ATTRIBUTE_RANK}
                aria-label={`Investir 1 ponto em ${name}`}
                onClick={() => onAllocate(id)}
              >
                +
              </button>
              <button
                type="button"
                className="attribute-help"
                aria-label={`O que ${name} melhora?`}
                aria-expanded={help === id}
                onClick={() => setHelp(help === id ? undefined : id)}
              >
                ?
              </button>
              {help === id && (
                <p className="attribute-explanation">Por ponto: {effect}</p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="attribute-builds">
        Tanque: Vitalidade e Agilidade. Dano: Força ou Inteligência. Coleta:
        Sorte e Agilidade.
      </p>
      <p className="attribute-builds">Os investimentos são permanentes.</p>
    </section>
  );
}
