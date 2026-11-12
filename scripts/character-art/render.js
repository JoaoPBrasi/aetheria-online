window.buildCharacterArt = async (
  sources,
  { columns, image: atlasImage, weapons },
) => {
  const size = 64,
    layers = ['backHair', 'base', 'skin', 'clothes', 'short', 'long', 'bun'];
  const atlas = document.createElement('canvas');
  atlas.width = columns * size;
  atlas.height = 4096;
  const output = atlas.getContext('2d');
  const frames = {},
    heads = [];
  let index = 0;
  const packFrame = (name, image) => {
    const x = (index % columns) * size,
      y = Math.floor(index / columns) * size;
    if (y + size > atlas.height) throw new Error('Character atlas overflow');
    output.drawImage(image, x, y);
    frames[name] = {
      frame: { x, y, w: size, h: size },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: size, h: size },
      sourceSize: { w: size, h: size },
    };
    index++;
  };
  const trailFrames = [];
  const swordColors = {
    sword: ['#34271d', '#845232', '#bc8957', '#e1b886', '#a06c43', '#5b3928'],
    iron_sword: [
      '#222931',
      '#68808a',
      '#acc7cd',
      '#edf6e8',
      '#c59453',
      '#493230',
    ],
  };
  for (const source of sources) {
    const image = new Image();
    image.src = source.url;
    await image.decode();
    if (image.height !== size || image.width % size)
      throw new Error('Invalid character sheet: ' + source.name);
    const count = image.width / size;
    for (let n = 0; n < count; n++) {
      const original = document.createElement('canvas');
      original.width = original.height = size;
      const context = original.getContext('2d');
      context.drawImage(image, n * size, 0, size, size, 0, 0, size, size);
      const pixels = context.getImageData(0, 0, size, size);
      const isSkin = (x, y) => {
        const i = (y * size + x) * 4,
          d = pixels.data;
        return (
          d[i + 3] &&
          ((d[i] === 217 && d[i + 1] === 160) ||
            (d[i] === 162 && d[i + 1] === 101) ||
            (d[i] === 250 && d[i + 1] === 200))
        );
      };
      // The skull is the first broad contiguous skin region, excluding raised hands/tools.
      let head;
      for (let y = 8; y < 40 && !head; y++) {
        let start = -1;
        for (let x = 15; x <= 48; x++) {
          if (isSkin(x, y)) {
            if (start < 0) start = x;
          } else {
            if (start >= 0 && x - start >= 6) {
              head = { x: start - 1, y: y - 1, w: x - start + 2, h: 12 };
              break;
            }
            start = -1;
          }
        }
      }
      if (!head)
        throw new Error('Cannot locate head: ' + source.name + ':' + n);
      // First skull row is narrower; its center tracks the head through every pose.
      const cx = Math.round(head.x + head.w / 2),
        top = head.y,
        chin = top + 12;
      heads.push({ name: source.name, frame: n, cx, top });
      const canvases = Object.fromEntries(
        layers.map((layer) => {
          const c = document.createElement('canvas');
          c.width = c.height = size;
          return [layer, c];
        }),
      );
      const base = canvases.base.getContext('2d'),
        skin = canvases.skin.getContext('2d'),
        clothes = canvases.clothes.getContext('2d');
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4,
            d = pixels.data;
          if (!d[i + 3]) continue;
          if (isSkin(x, y)) {
            const shade = d[i] === 162 ? 190 : d[i] === 250 ? 255 : 238;
            if (y > chin + 7) {
              base.fillStyle = y > 45 ? '#4b352a' : '#344451';
              base.fillRect(x, y, 1, 1);
            } else if (y > chin && Math.abs(x - cx) <= 4) {
              if (y === chin + 7) base.fillStyle = '#725239';
              else {
                clothes.fillStyle = `rgb(${shade},${shade},${shade})`;
                clothes.fillRect(x, y, 1, 1);
                continue;
              }
              base.fillRect(x, y, 1, 1);
            } else {
              skin.fillStyle = `rgb(${shade},${shade},${shade})`;
              skin.fillRect(x, y, 1, 1);
            }
          } else {
            base.fillStyle =
              d[i] === 0 && d[i + 1] === 0 && d[i + 2] === 0
                ? '#1c2528'
                : `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
            base.fillRect(x, y, 1, 1);
          }
        }
      const up = source.direction === 'up',
        side = source.direction === 'side';
      const cap = (ctx, long = false) => {
        ctx.fillStyle = '#b7b7b7';
        ctx.fillRect(cx - 5, top + 3, 11, up ? 10 : 5);
        ctx.fillStyle = '#f3f3f3';
        ctx.fillRect(cx - 4, top, 9, 4);
        ctx.fillRect(cx - 5, top + 2, 11, 3);
        ctx.fillStyle = '#d6d6d6';
        ctx.fillRect(cx - 3, top + 1, 6, 1);
        ctx.fillStyle = '#8c8c8c';
        ctx.fillRect(cx - 5, top + 5, 2, side ? 6 : 4);
        if (!up) {
          ctx.fillStyle = '#d6d6d6';
          ctx.fillRect(cx - 3, top + 4, side ? 5 : 2, 2);
          if (!side) ctx.fillRect(cx + 3, top + 4, 2, 3);
        }
        if (long) {
          ctx.fillStyle = '#b7b7b7';
          if (up) ctx.fillRect(cx - 5, top + 8, 11, 10);
          else {
            ctx.fillRect(cx - 6, top + 6, 2, 11);
            if (!side) ctx.fillRect(cx + 5, top + 6, 2, 11);
          }
          ctx.fillStyle = '#dedede';
          ctx.fillRect(cx - 5, top + 9, 1, 7);
        }
      };
      cap(canvases.short.getContext('2d'));
      cap(canvases.long.getContext('2d'), true);
      const bun = canvases.bun.getContext('2d');
      cap(bun);
      bun.fillStyle = '#8c8c8c';
      bun.fillRect(cx - 3, top - 3, 7, 5);
      bun.fillStyle = '#ededed';
      bun.fillRect(cx - 1, top - 4, 3, 1);
      bun.fillRect(cx - 2, top - 3, 5, 3);
      if (!up) {
        const back = canvases.backHair.getContext('2d');
        back.fillStyle = '#999';
        back.fillRect(cx - 6, top + 7, 13, 12);
      }
      for (const layer of layers)
        packFrame(`${source.name}-${n}:${layer}`, canvases[layer]);
      if (weapons && source.name.startsWith('chop-') && (n === 3 || n === 4)) {
        // A máscara da folha original fornece o contorno do arco, separado do corpo.
        const colorAt = (x, y) => {
          if (x < 0 || x >= size || y < 0 || y >= size) return -1;
          const i = (y * size + x) * 4;
          const d = pixels.data;
          return d[i + 3] ? (d[i] << 16) | (d[i + 1] << 8) | d[i + 2] : -1;
        };
        const mask = (x, y) => colorAt(x, y) === 0xe7e7e7;
        for (const [weapon, colors] of Object.entries(swordColors)) {
          const trail = document.createElement('canvas');
          trail.width = trail.height = size;
          const stroke = trail.getContext('2d');
          stroke.globalAlpha = weapon === 'sword' ? 0.68 : 0.85;
          for (let y = 0; y < size; y++)
            for (let x = 0; x < size; x++) {
              if (!mask(x, y)) continue;
              const dx = x - 32;
              const dy = y - 33;
              const sx = Math.abs(dx) * 2 >= Math.abs(dy) ? Math.sign(dx) : 0;
              const sy = Math.abs(dy) * 2 >= Math.abs(dx) ? Math.sign(dy) : 0;
              if (weapon === 'iron_sword') {
                const rim = !mask(x + sx, y + sy);
                const shoulder = !mask(x + sx * 3, y + sy * 3);
                if (!shoulder && mask(x + sx * 6, y + sy * 6)) continue;
                stroke.globalAlpha =
                  (n === 3 ? 1 : 0.6) * (rim ? 1 : shoulder ? 0.8 : 0.35);
                stroke.fillStyle = rim ? colors[3] : colors[2];
                stroke.fillRect(x, y, 1, 1);
                continue;
              }
              stroke.fillStyle = !mask(x + sx, y + sy)
                ? colors[3]
                : !mask(x + 2 * sx, y + 2 * sy)
                  ? colors[2]
                  : !mask(x - sx, y - sy) || !mask(x - 2 * sx, y - 2 * sy)
                    ? colors[1]
                    : colors[2];
              stroke.fillRect(x, y, 1, 1);
            }
          trailFrames.push([`${source.name}-${n}:trail-${weapon}`, trail]);
        }
      }
    }
  }
  for (const [name, sprite] of trailFrames) packFrame(name, sprite);
  for (const [weapon, colors] of weapons ? Object.entries(swordColors) : []) {
    const iron = weapon === 'iron_sword';
    const sword = document.createElement('canvas');
    sword.width = sword.height = size;
    const ctx = sword.getContext('2d');
    const paint = (i, x, y, w, h) => {
      ctx.fillStyle = colors[i];
      ctx.fillRect(x, y, w, h);
    };
    const tip = iron ? 24 : 29;
    paint(0, 31, tip, 2, 3);
    paint(0, iron ? 29 : 30, tip + 3, iron ? 6 : 4, 43 - tip);
    paint(1, iron ? 30 : 31, tip + 4, iron ? 4 : 2, 41 - tip);
    paint(2, 32, tip + 2, iron ? 2 : 1, 43 - tip);
    if (iron) paint(3, 33, tip + 4, 1, 40 - tip);
    paint(0, iron ? 27 : 28, 43, iron ? 10 : 8, 3);
    paint(4, iron ? 28 : 29, 44, iron ? 8 : 6, 1);
    paint(0, 30, 46, 4, 7);
    paint(5, 31, 46, 2, 5);
    paint(4, 30, 51, 4, 1);
    packFrame(`weapon:${weapon}`, sword);
  }
  const height = 2 ** Math.ceil(Math.log2(Math.ceil(index / columns) * size));
  const packed = document.createElement('canvas');
  packed.width = atlas.width;
  packed.height = height;
  packed.getContext('2d').drawImage(atlas, 0, 0);
  return {
    url: packed.toDataURL(),
    atlas: {
      frames,
      meta: {
        image: atlasImage,
        size: { w: packed.width, h: packed.height },
        scale: '1',
      },
    },
    heads,
    frames: index,
  };
};
