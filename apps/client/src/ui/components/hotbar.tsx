import {
  ITEMS,
  ROASTED_TURNIP_HEAL,
  type ItemId,
  type Slot,
} from '@aetheria/shared';

const ITEM_ICONS: Record<ItemId, string> = {
  axe: '🪓',
  pickaxe: '⛏️',
  sickle: '🌾',
  hoe: '🌱',
  watering_can: '💧',
  sword: '⚔️',
  wood: '🪵',
  stone: '🪨',
  fiber: '🌿',
  turnip_seed: '🌰',
  pumpkin_seed: '🌰',
  turnip: '🧅',
  roasted_turnip: '🍲',
  pumpkin: '🎃',
  plank: '🪵',
  slime_goo: '🟢',
  flower: '🌼',
  iron_ore: '🪨',
  iron_ingot: '🔩',
  charcoal: '⚫',
  iron_axe: '🪓',
  iron_sword: '⚔️',
};

interface HotbarProps {
  inventory: Slot[];
  equipment: { slot: string; itemId: ItemId }[];
  onEquip: (index: number) => void;
  onConsume: (index: number) => void;
  onUnequip: () => void;
}

export function Hotbar({
  inventory,
  equipment,
  onEquip,
  onConsume,
  onUnequip,
}: HotbarProps) {
  const equippedToolId = equipment.find((e) => e.slot === 'tool')?.itemId;

  const slots = Array.from({ length: 8 }, (_, idx) => {
    const item = inventory.find((s) => s.index === idx);
    const isEquipped = item && item.itemId === equippedToolId;
    return {
      index: idx,
      keyNumber: idx + 1,
      item,
      isEquipped,
    };
  });

  const handleClick = (slotIndex: number, item?: Slot) => {
    if (!item) return;
    if (item.itemId === 'roasted_turnip') {
      onConsume(slotIndex);
    } else if (ITEMS[item.itemId]?.tool) {
      if (item.itemId === equippedToolId) {
        onUnequip();
      } else {
        onEquip(slotIndex);
      }
    }
  };

  return (
    <div className="hotbar-container" aria-label="Barra de acesso rápido">
      <div className="hotbar">
        {slots.map(({ index, keyNumber, item, isEquipped }) => (
          <button
            key={index}
            className={`hotbar-slot ${item ? 'has-item' : 'empty'} ${isEquipped ? 'equipped' : ''}`}
            onClick={() => handleClick(index, item)}
            title={
              item
                ? `${ITEMS[item.itemId].name} (Tecla ${keyNumber})${isEquipped ? ' · Equipado' : ''}${item.itemId === 'roasted_turnip' ? ` · Recupera até ${ROASTED_TURNIP_HEAL} de vida` : ''}`
                : `Slot vazio (Tecla ${keyNumber})`
            }
            aria-label={`Slot ${keyNumber}: ${item ? ITEMS[item.itemId].name : 'Vazio'}`}
          >
            <span className="hotbar-key">{keyNumber}</span>
            {item ? (
              <>
                <span className="hotbar-icon">
                  {ITEM_ICONS[item.itemId] ?? '📦'}
                </span>
                {item.quantity > 1 && (
                  <span className="hotbar-qty">{item.quantity}</span>
                )}
                {isEquipped && <span className="hotbar-equipped-badge">E</span>}
              </>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
