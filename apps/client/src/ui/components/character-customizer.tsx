import type { Cosmetics } from '@aetheria/shared';
import { useState } from 'react';
import { CharacterPortrait } from './character-portrait';
import type { Facing } from '../../game/characters/animation';
export { CharacterPortrait } from './character-portrait';
const palettes = {
  clothingColor: [
    '#c4d597',
    '#578ba7',
    '#b76a52',
    '#7d699a',
    '#d4ad63',
    '#384f59',
  ],
  hairColor: ['#59422f', '#221e21', '#bf9253', '#cfbda7', '#a34c35', '#5e6f8a'],
  skinColor: ['#f3d2b0', '#e1b68c', '#c18a60', '#9c654a', '#754834', '#4d3026'],
};
export function CharacterCustomizer({
  look,
  onChange,
}: {
  look: Cosmetics;
  onChange: (look: Cosmetics) => void;
}) {
  const [direction, setDirection] = useState<Facing>('down');
  const [walking, setWalking] = useState(false);
  return (
    <div className="character-workshop">
      <div className="portrait-stage">
        <span>SEU EXPLORADOR</span>
        <CharacterPortrait
          look={look}
          direction={direction}
          walking={walking}
        />
        <div
          className="portrait-directions"
          role="group"
          aria-label="Direção da prévia"
        >
          {(
            [
              ['down', 'Frente'],
              ['left', 'Esquerda'],
              ['up', 'Costas'],
              ['right', 'Direita'],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-label={`Ver de ${label.toLowerCase()}`}
              aria-pressed={direction === value}
              onClick={() => setDirection(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="portrait-motion"
          type="button"
          aria-pressed={walking}
          onClick={() => setWalking(!walking)}
        >
          {walking ? 'Parar caminhada' : 'Testar caminhada'}
        </button>
        <small>O mesmo sprite utilizado no jogo</small>
      </div>
      <div className="color-options">
        {(['clothingColor', 'hairColor', 'skinColor'] as const).map(
          (key, i) => (
            <fieldset key={key}>
              <legend>
                {['Cor da roupa', 'Cor do cabelo', 'Tom de pele'][i]}
              </legend>
              <div className="swatches">
                {palettes[key].map((color, n) => (
                  <button
                    type="button"
                    key={color}
                    aria-label={`${['Roupa', 'Cabelo', 'Pele'][i]} opção ${n + 1}`}
                    aria-pressed={look[key] === color}
                    style={{ background: color }}
                    onClick={() => onChange({ ...look, [key]: color })}
                  />
                ))}
                <input
                  aria-label={
                    ['Cor da roupa', 'Cor do cabelo', 'Cor da pele'][i]
                  }
                  type="color"
                  value={look[key]}
                  onChange={(e) => onChange({ ...look, [key]: e.target.value })}
                />
              </div>
            </fieldset>
          ),
        )}
        <label>
          Cabelo
          <select
            aria-label="Estilo de cabelo"
            value={look.hairStyle}
            onChange={(e) =>
              onChange({
                ...look,
                hairStyle: e.target.value as Cosmetics['hairStyle'],
              })
            }
          >
            <option value="short">Curto</option>
            <option value="long">Comprido</option>
            <option value="bun">Coque</option>
            <option value="none">Sem cabelo</option>
          </select>
        </label>
        <button
          type="button"
          className="shuffle-look"
          onClick={() => {
            const r = crypto.getRandomValues(new Uint8Array(3));
            onChange({
              ...look,
              clothingColor: palettes.clothingColor[r[0]! % 6]!,
              hairColor: palettes.hairColor[r[1]! % 6]!,
              skinColor: palettes.skinColor[r[2]! % 6]!,
            });
          }}
        >
          Aleatorizar cores
        </button>
      </div>
    </div>
  );
}
