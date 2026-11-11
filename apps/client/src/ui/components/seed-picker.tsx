import { useEffect, useRef } from 'react';
import {
  CROPS,
  ITEMS,
  seedCount,
  type CropId,
  type GameplaySnapshot,
} from '@aetheria/shared';

export function SeedPicker({
  plotId,
  gameplay,
  disabled,
  onChoose,
  onClose,
}: {
  plotId: string;
  gameplay: GameplaySnapshot;
  disabled: boolean;
  onChoose: (crop: CropId) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  const seeds = (Object.keys(CROPS) as CropId[])
    .map((crop) => ({ crop, count: seedCount(gameplay, crop) }))
    .filter(({ count }) => count > 0);

  useEffect(() => {
    const picker = dialog.current;
    (
      picker?.querySelector<HTMLButtonElement>('li button:enabled') ??
      picker?.querySelector('button')
    )?.focus();
  }, [plotId]);

  return (
    <section
      ref={dialog}
      className="seed-picker"
      role="dialog"
      aria-labelledby="seed-picker-title"
    >
      <header>
        <div>
          <h3 id="seed-picker-title">Escolha uma semente</h3>
          <small>Parcela {plotId.split('-').at(-1)}</small>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar escolha de sementes"
        >
          <kbd>Esc</kbd>
        </button>
      </header>
      {seeds.length ? (
        <ul>
          {seeds.map(({ crop, count }) => (
            <li key={crop}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChoose(crop)}
              >
                <span
                  className={`seed-picker-icon seed-picker-icon--${crop}`}
                  aria-hidden="true"
                />
                <span>
                  <strong>{ITEMS[CROPS[crop].seed].name}</strong>
                  <small>{CROPS[crop].growMs / 1000} s após regar</small>
                </span>
                <span className="seed-picker-count">{count} na mochila</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Você está sem sementes na mochila.</p>
      )}
    </section>
  );
}
