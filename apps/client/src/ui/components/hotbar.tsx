import { useEffect, useState } from 'react';
import {
  ITEMS,
  ROASTED_TURNIP_HEAL,
  COMBAT_SKILLS,
  HOTBAR_SKILL_IDS,
  type SkillId,
  type ItemId,
  type Slot,
} from '@aetheria/shared';

import { ItemIcon, MetalCorners } from './medieval-art';

interface HotbarProps {
  inventory: Slot[];
  equipment: { slot: string; itemId: ItemId }[];
  cooldowns?: Partial<Record<SkillId, number>>;
  onUseSkill?: (skillId: SkillId) => void;
  onEquip: (index: number) => void;
  onConsume: (index: number) => void;
  onUnequip: () => void;
}

export function Hotbar({
  inventory,
  equipment,
  cooldowns = {},
  onUseSkill,
  onEquip,
  onConsume,
  onUnequip,
}: HotbarProps) {
  const [now, setNow] = useState(() => Date.now());

  // Atualiza suavemente o cronômetro visual de cooldown a cada 100ms
  useEffect(() => {
    const hasActive = Object.values(cooldowns).some((time) => typeof time === 'number' && time > now);
    if (!hasActive) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, [cooldowns, now]);

  const equippedToolId = equipment.find((e) => e.slot === 'tool')?.itemId;

  // Slots 5 a 8: Itens rápidos da mochila (índices 0 a 3 do inventário)
  const itemSlots = Array.from({ length: 4 }, (_, i) => {
    const inventoryIndex = i;
    const keyNumber = i + 5;
    const item = inventory.find((s) => s.index === inventoryIndex);
    const isEquipped = item && item.itemId === equippedToolId;
    return {
      inventoryIndex,
      keyNumber,
      item,
      isEquipped,
    };
  });

  const handleClickItem = (slotIndex: number, item?: Slot) => {
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
      <div className="hotbar medieval-frame">
        <MetalCorners />

        {/* Slots 1 a 4: Habilidades de Combate */}
        {HOTBAR_SKILL_IDS.map((skillId, idx) => {
          const keyNumber = idx + 1;
          const config = COMBAT_SKILLS[skillId];
          const readyAt = cooldowns[skillId] ?? 0;
          const remainingMs = Math.max(0, readyAt - now);
          const isCooling = remainingMs > 0;
          const remainingSec = (remainingMs / 1000).toFixed(1);

          return (
            <button
              key={skillId}
              type="button"
              className={`hotbar-slot hotbar-skill-slot medieval-slot has-item ${isCooling ? 'cooling' : ''}`}
              onClick={() => onUseSkill?.(skillId)}
              title={`${config.name} (Tecla ${keyNumber})\n${config.description}\nTempo de Recarga: ${config.cooldownMs / 1000}s · Alcance: ${config.range}px`}
              aria-label={`Habilidade ${keyNumber}: ${config.name}${isCooling ? ` (${remainingSec}s restantes)` : ''}`}
            >
              <span className="hotbar-key">{keyNumber}</span>
              <span className="hotbar-skill-icon">{config.icon}</span>

              {isCooling && (
                <div className="hotbar-cooldown-overlay">
                  <span className="hotbar-cooldown-text">{remainingSec}s</span>
                </div>
              )}
            </button>
          );
        })}

        {/* Divisor estético entre Habilidades e Itens */}
        <div className="hotbar-divider" title="Divisor Habilidades / Itens" />

        {/* Slots 5 a 8: Itens Rápidos da Mochila */}
        {itemSlots.map(({ inventoryIndex, keyNumber, item, isEquipped }) => (
          <button
            key={keyNumber}
            type="button"
            className={`hotbar-slot medieval-slot ${item ? 'has-item' : 'empty'} ${isEquipped ? 'equipped' : ''}`}
            onClick={() => handleClickItem(inventoryIndex, item)}
            title={
              item
                ? `${ITEMS[item.itemId].name} (Tecla ${keyNumber})${isEquipped ? ' · Equipado' : ''}${item.itemId === 'roasted_turnip' ? ` · Recupera até ${ROASTED_TURNIP_HEAL} de vida` : ''}`
                : `Slot de item vazio (Tecla ${keyNumber})`
            }
            aria-label={`Item ${keyNumber}: ${item ? ITEMS[item.itemId].name : 'Vazio'}`}
          >
            <span className="hotbar-key">{keyNumber}</span>
            {item ? (
              <>
                <ItemIcon item={item.itemId} />
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
