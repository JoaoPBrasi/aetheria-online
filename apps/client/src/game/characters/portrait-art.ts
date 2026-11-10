import type { Cosmetics } from '@aetheria/shared';
import { appearanceLayers } from './animation';
type Frame = { frame: { x: number; y: number; w: number; h: number } };
let loading:
  | Promise<{ image: HTMLImageElement; frames: Record<string, Frame> }>
  | undefined;
export function loadPortraitArt() {
  if (!loading)
    loading = (async () => {
      const image = new Image();
      image.src = '/sprites/player-atlas.png';
      const [response] = await Promise.all([
        fetch('/maps/player-atlas.json'),
        image.decode(),
      ]);
      if (!response.ok)
        throw new Error('Não foi possível carregar o personagem.');
      return {
        image,
        frames: (await response.json()).frames as Record<string, Frame>,
      };
    })().catch((error) => {
      loading = undefined;
      throw error;
    });
  return loading;
}
/** Canvas multiplication uses the same RGB tint as Phaser; skin and clothes stay separate. */
export function portraitFrames(
  image: HTMLImageElement,
  frames: Record<string, Frame>,
  look: Cosmetics,
  keys: string[],
) {
  const output = document.createElement('canvas');
  output.width = 64 * keys.length;
  output.height = 64;
  const context = output.getContext('2d')!;
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = layerCanvas.height = 64;
  const layerContext = layerCanvas.getContext('2d')!;
  for (const [n, key] of keys.entries())
    for (const { layer, color } of appearanceLayers(look)) {
      const f = frames[`${key}:${layer}`]?.frame;
      if (!f) throw new Error('Quadro do personagem ausente.');
      layerContext.clearRect(0, 0, 64, 64);
      layerContext.drawImage(image, f.x, f.y, 64, 64, 0, 0, 64, 64);
      if (color) {
        const pixels = layerContext.getImageData(0, 0, 64, 64),
          rgb = [1, 3, 5].map((offset) =>
            parseInt(color.slice(offset, offset + 2), 16),
          );
        for (let i = 0; i < pixels.data.length; i += 4)
          for (let c = 0; c < 3; c++)
            pixels.data[i + c] = Math.floor(
              (pixels.data[i + c]! * rgb[c]!) / 255,
            );
        layerContext.putImageData(pixels, 0, 0);
      }
      context.drawImage(layerCanvas, n * 64, 0);
    }
  return output;
}
