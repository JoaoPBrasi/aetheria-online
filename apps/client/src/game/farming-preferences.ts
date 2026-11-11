import {
  CROPS,
  seedCount,
  type CropId,
  type GameplaySnapshot,
} from '@aetheria/shared';

const lastPlanted = new Map<string, CropId>();
const storageKey = (characterId: string) =>
  `aetheria:farm:last-planted:${characterId}`;

function isCropId(value: unknown): value is CropId {
  return typeof value === 'string' && Object.hasOwn(CROPS, value);
}

export function readLastPlantedCrop(characterId: string) {
  const remembered = lastPlanted.get(characterId);
  if (remembered) return remembered;
  try {
    const stored = localStorage.getItem(storageKey(characterId));
    if (isCropId(stored)) return stored;
  } catch {
    // A preferência em memória continua disponível na sessão.
  }
}

export function rememberConfirmedPlanting(
  action: Record<string, unknown>,
  previous: GameplaySnapshot,
  current: GameplaySnapshot,
) {
  const crop = action.crop;
  if (
    action.kind !== 'farm' ||
    action.operation !== 'plant' ||
    action.revision !== previous.revision ||
    current.revision !== previous.revision + 1 ||
    !isCropId(crop) ||
    current.characterId !== previous.characterId ||
    seedCount(previous, crop) - seedCount(current, crop) !== 1
  )
    return;

  lastPlanted.set(current.characterId, crop);
  try {
    localStorage.setItem(storageKey(current.characterId), crop);
  } catch {
    // A preferência em memória continua disponível na sessão.
  }
}
