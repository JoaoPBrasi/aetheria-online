import type { Cosmetics } from '@aetheria/shared';
export function CharacterPortrait({ look }: { look: Cosmetics }) {
  return (
    <svg
      viewBox="0 0 64 80"
      role="img"
      aria-label="Prévia do personagem"
      data-testid="character-preview"
    >
      <ellipse cx="32" cy="73" rx="21" ry="5" fill="#172a23" opacity=".5" />
      {look.hairStyle === 'long' && (
        <rect x="18" y="10" width="28" height="39" fill={look.hairColor} />
      )}
      <rect x="22" y="55" width="9" height="18" fill="#35434c" />
      <rect x="34" y="55" width="9" height="18" fill="#35434c" />
      <rect x="17" y="31" width="30" height="27" fill={look.clothingColor} />
      <rect x="12" y="34" width="7" height="18" fill={look.skinColor} />
      <rect x="45" y="34" width="7" height="18" fill={look.skinColor} />
      <rect x="22" y="10" width="22" height="24" fill={look.skinColor} />
      <rect x="25" y="22" width="3" height="3" fill="#29382c" />
      <rect x="38" y="22" width="3" height="3" fill="#29382c" />
      {look.hairStyle !== 'none' && (
        <>
          <rect x="20" y="7" width="26" height="10" fill={look.hairColor} />
          <rect x="20" y="15" width="5" height="10" fill={look.hairColor} />
        </>
      )}
      {look.hairStyle === 'bun' && (
        <rect x="27" y="0" width="12" height="10" fill={look.hairColor} />
      )}
    </svg>
  );
}
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
  return (
    <div className="character-workshop">
      <div className="portrait-stage">
        <span>SEU EXPLORADOR</span>
        <CharacterPortrait look={look} />
        <small>Prévia em tempo real</small>
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
