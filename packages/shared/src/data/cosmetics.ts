export const DEFAULT_COSMETICS = {
  clothingColor: '#c4d597',
  hairColor: '#59422f',
  skinColor: '#e1b68c',
  hairStyle: 'short' as const,
};
export interface Cosmetics {
  clothingColor: string;
  hairColor: string;
  skinColor: string;
  hairStyle: 'short' | 'long' | 'bun' | 'none';
}
export function cosmeticsOf(value: Cosmetics): Cosmetics {
  return {
    clothingColor: value.clothingColor,
    hairColor: value.hairColor,
    skinColor: value.skinColor,
    hairStyle: value.hairStyle,
  };
}
