/* Cemitério composto em tiles de 16 px, com texturas do pacote fornecido.
   As silhuetas das lápides são adaptações; não são sprites prontos do ZIP. */
window.CemeteryStudy = (() => {
  const tile = 16,
    origin = { x: 61, y: 5 };
  const rows = [
    'P###############P',
    '#......:::......#',
    '#......:::......#',
    '#......:::......#',
    '#:::::::::::::::#',
    '#.gg.gg:::gg.gg.#',
    '#.gg.gg:::gg.gg.#',
    '#......:::......#',
    '#.gg.gg:::gg.gg.#',
    '#.gg.gg:::gg.gg.#',
    '#:::::::::::::::#',
    '#.gg.gg:::gg.gg.#',
    '#.gg.gg:::gg.gg.#',
    '#......:::......#',
    '#......:::......#',
    '#......:::......#',
    'P#####P:::P#####P',
  ];
  if (rows.length !== 17 || rows.some((r) => r.length !== 17))
    throw new Error('Cemetery grid must be 17 × 17.');
  const graves = [5, 8, 11].flatMap((row, ri) =>
    [2, 5, 10, 13].map((col, ci) => ({
      col,
      row,
      type:
        ri === 2 && ci === 3
          ? 'open'
          : ['arched', 'cross', 'square'][(ri + ci) % 3],
      moss: (ri + ci) % 2 === 0,
    })),
  );
  const layout = {
    name: 'Cemitério da Vigia',
    tileSize: tile,
    origin,
    columns: 17,
    rows,
    legend: {
      P: 'Pilar de pedra',
      '#': 'Mureta e grade',
      '.': 'Grama envelhecida',
      ':': 'Caminho de pedra',
      g: 'Leito de sepultura',
    },
    graves,
    entrance: { col: 8, row: 16, widthTiles: 3 },
    cryptDoor: { col: 8, row: 4 },
    adaptedAssets: [
      'Lápides e cruzes compostas com textura de Wall_Tiles',
      'Grades e arco isolados de Dungeon_Tiles',
    ],
    originalAssets: [
      'Caixão e vela de Dungeon_Props',
      'Vegetação seca e árvores sem folhas',
      'Porta e paredes da cripta',
    ],
  };

  function build({ ground, objects, draw, shadow }) {
    const ox = origin.x * tile,
      oy = origin.y * tile;
    const add = (id, x, y, paint) =>
      objects.push({ id, x, y, cemetery: true, paint });
    const paintTile = (col, row, id, crop) =>
      draw(ground, id, ...crop, ox + col * tile, oy + row * tile);
    const imageData = (id, crop) => {
      const c = document.createElement('canvas');
      c.width = crop[2];
      c.height = crop[3];
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      draw(ctx, id, ...crop, 0, 0);
      return {
        canvas: c,
        ctx,
        data: ctx.getImageData(0, 0, c.width, c.height),
      };
    };
    const isolate = (id, crop) => {
      const { canvas, ctx, data } = imageData(id, crop);
      // Remove only the black backing of the dungeon atlas, preserving its bars.
      for (let i = 0; i < data.data.length; i += 4)
        if (data.data[i] < 22 && data.data[i + 1] < 29 && data.data[i + 2] < 32)
          data.data[i + 3] = 0;
      ctx.putImageData(data, 0, 0);
      return canvas;
    };
    const texture = imageData('cliff', [128, 32, 16, 16]).data.data;
    const headstones = new Map();
    function headstone(kind, moss) {
      const key = `${kind}-${moss}`;
      if (headstones.has(key)) return headstones.get(key);
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 26;
      const ctx = c.getContext('2d'),
        pixels = ctx.createImageData(16, 26);
      const solid = (x, y) => {
        if (x < 0 || x > 15 || y < 0 || y > 25) return false;
        if (y >= 23) return x >= 0 && x <= 15;
        if (kind === 'cross')
          return y < 3
            ? x >= 6 && x <= 9
            : y < 7
              ? x >= 5 && x <= 10
              : y < 11
                ? x >= 2 && x <= 13
                : x >= 5 && x <= 10;
        if (kind === 'square')
          return y < 2 ? false : x >= (y < 4 ? 2 : 1) && x <= (y < 4 ? 13 : 14);
        const margin = y < 2 ? 5 : y < 4 ? 3 : y < 6 ? 2 : 1;
        return x >= margin && x <= 15 - margin;
      };
      for (let y = 0; y < 26; y++)
        for (let x = 0; x < 16; x++) {
          if (!solid(x, y)) continue;
          const target = (y * 16 + x) * 4,
            source = ((y % 16) * 16 + x) * 4;
          let rgb = [texture[source], texture[source + 1], texture[source + 2]];
          if (!solid(x, y - 1)) rgb = [146, 155, 151];
          else if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y + 1))
            rgb = [47, 61, 65];
          else if ((x + y * 3) % 19 === 0) rgb = [110, 123, 117];
          if (moss && y > 19 && (x * 3 + y) % 4 < 2) rgb = [80, 99, 67];
          pixels.data.set([...rgb, 255], target);
        }
      ctx.putImageData(pixels, 0, 0);
      if (kind !== 'cross') {
        ctx.fillStyle = '#334449';
        ctx.fillRect(7, 8, 2, 8);
        ctx.fillRect(5, 10, 6, 2);
        ctx.fillRect(4, 18, 4, 1);
        ctx.fillRect(9, 18, 3, 1);
        ctx.fillStyle = '#a6ada0';
        ctx.fillRect(6, 8, 1, 2);
      } else {
        ctx.fillStyle = '#34454a';
        ctx.fillRect(8, 12, 1, 7);
      }
      headstones.set(key, c);
      return c;
    }
    const rail = isolate('dungeon', [144, 64, 16, 32]);
    const gate = isolate('dungeon', [0, 160, 32, 48]);

    // Restore the old ruin rectangle and its margins before placing the new grid.
    for (let y = 4; y <= 23; y++)
      for (let x = 60; x <= 78; x++) {
        draw(
          ground,
          'floors',
          16 + ((x + y) % 3) * tile,
          160,
          tile,
          tile,
          x * tile,
          y * tile,
        );
      }
    // Two-tile approach follows the outside of the fence into the south gate.
    for (let y = 22; y <= 23; y++)
      for (let x = 60; x <= 70; x++) {
        draw(
          ground,
          'floors',
          176 + ((x + y) % 3) * tile,
          160,
          tile,
          tile,
          x * tile,
          y * tile,
        );
        if (y === 23)
          draw(ground, 'floors', 32, 64, 16, 16, x * tile, y * tile);
      }
    for (let r = 0; r < rows.length; r++)
      for (let col = 0; col < rows[r].length; col++) {
        const symbol = rows[r][col],
          x = ox + col * tile,
          y = oy + r * tile;
        paintTile(col, r, 'floors', [16 + ((col + r) % 3) * tile, 160, 16, 16]);
        ground.fillStyle = '#172b2942';
        ground.fillRect(x, y, tile, tile);
        if (symbol === ':') {
          paintTile(col, r, 'floors', [
            96 + ((col + r) % 3) * tile,
            160,
            16,
            16,
          ]);
          ground.fillStyle = '#253b3c32';
          ground.fillRect(x, y, tile, tile);
        } else if (symbol === 'g') {
          paintTile(col, r, 'floors', [176, 160, 16, 16]);
          ground.fillStyle = '#17201e66';
          ground.fillRect(x, y, tile, tile);
        } else if (symbol === '.') {
          if ((col * 7 + r) % 9 === 0) {
            ground.save();
            ground.globalAlpha = 0.38;
            paintTile(col, r, 'dungeon', [176, 16, 16, 16]);
            ground.restore();
          }
        }
        if (symbol === '#' || symbol === 'P') {
          const side = col === 0 || col === 16;
          ground.save();
          ground.beginPath();
          ground.rect(
            x + (side ? 4 : 0),
            y + (side ? 0 : 9),
            side ? 8 : 16,
            side ? 16 : 7,
          );
          ground.clip();
          paintTile(col, r, 'cliff', [128, 32, 16, 16]);
          ground.restore();
          add('cemetery-fence', x + 8, y + 13, (c) => {
            if (side && symbol !== 'P') {
              c.drawImage(rail, 0, 0, 3, 16, x + 6, y - 8, 3, 16);
              c.drawImage(rail, 0, 8, 3, 16, x + 9, y, 3, 16);
              c.fillStyle = '#6f8688';
              c.fillRect(x + 7, y - 9, 1, 24);
            } else if (symbol !== 'P') c.drawImage(rail, x, y - 18);
          });
          if (symbol === 'P')
            add('cemetery-pillar', x + 8, y + 16, (c) => {
              shadow(c, x + 8, y + 15, 21, 7);
              draw(c, 'cliff', 128, 32, 16, 16, x, y - 16);
              draw(c, 'cliff', 128, 32, 16, 16, x, y);
              c.fillStyle = '#33464c';
              c.fillRect(x + 12, y - 14, 4, 28);
              c.fillStyle = '#a2aaa0';
              c.fillRect(x - 1, y - 18, 18, 3);
              c.fillStyle = '#455952';
              c.fillRect(x - 1, y + 13, 18, 3);
            });
        }
      }
    for (const grave of graves) {
      const left = ox + grave.col * tile,
        y = oy + grave.row * tile,
        center = left + 16;
      // A complete 2×2 bed, outlined without extending into the circulation lane.
      ground.fillStyle = '#192524aa';
      ground.fillRect(left + 3, y + 3, 27, 29);
      for (let yy = 0; yy < 2; yy++)
        for (let xx = 0; xx < 2; xx++)
          draw(
            ground,
            'floors',
            176 + ((xx + yy) % 2) * tile,
            160,
            16,
            16,
            left + xx * tile,
            y + yy * tile,
          );
      ground.fillStyle = '#202a2266';
      ground.fillRect(left + 2, y + 2, 28, 29);
      if (grave.type === 'open') {
        ground.fillStyle = '#101c1d';
        ground.fillRect(center - 9, y + 7, 18, 23);
        ground.fillStyle = '#534934';
        ground.fillRect(center - 9, y + 7, 2, 23);
        ground.fillStyle = '#8c7652';
        ground.fillRect(center - 9, y + 7, 18, 2);
        add('cemetery-coffin', center, y + 26, (c) =>
          draw(c, 'dungeonProps', 112, 0, 16, 24, center - 8, y + 8),
        );
      } else {
        ground.save();
        ground.beginPath();
        ground.rect(center - 10, y + 10, 20, 20);
        ground.clip();
        draw(ground, 'cliff', 128, 32, 16, 16, center - 10, y + 10);
        draw(ground, 'cliff', 128, 32, 16, 16, center + 6, y + 10);
        draw(ground, 'cliff', 128, 32, 16, 16, center - 10, y + 26);
        draw(ground, 'cliff', 128, 32, 16, 16, center + 6, y + 26);
        ground.restore();
        ground.fillStyle = '#87948a';
        ground.fillRect(center - 10, y + 10, 20, 1);
        ground.fillStyle = '#263c40';
        ground.fillRect(center + 9, y + 11, 1, 19);
        ground.fillRect(center - 10, y + 29, 20, 1);
        ground.fillStyle = '#455d55';
        ground.fillRect(center - 6, y + 16, 12, 1);
        ground.fillRect(center - 5, y + 24, 10, 1);
      }
      add('cemetery-headstone', center, y + 15, (c) => {
        shadow(c, center, y + 14, 23, 7);
        c.drawImage(
          headstone(grave.type === 'open' ? 'square' : grave.type, grave.moss),
          center - 8,
          y - 10,
        );
      });
      if (grave.moss) {
        ground.fillStyle = '#607343';
        ground.fillRect(left + 3, y + 28, 4, 2);
        ground.fillRect(left + 5, y + 30, 6, 1);
      }
    }

    // Small crypt: shallow stone roof, framed doorway and three visible steps.
    const cx = ox + 6 * tile,
      cy = oy + tile;
    for (let step = 0; step < 3; step++) {
      ground.fillStyle = ['#687574', '#84908a', '#a2aaa0'][step];
      ground.fillRect(cx + 16 + step * 2, cy + 64 - step * 5, 48 - step * 4, 5);
      ground.fillStyle = '#293e42';
      ground.fillRect(cx + 16 + step * 2, cy + 68 - step * 5, 48 - step * 4, 1);
    }
    add('cemetery-crypt', cx + 40, cy + 62, (c) => {
      shadow(c, cx + 40, cy + 62, 90, 16);
      for (let y = 1; y < 4; y++)
        for (let x = 0; x < 5; x++)
          draw(c, 'dungeon', 0, 16, 16, 16, cx + x * tile, cy + y * tile);
      for (let x = 0; x < 5; x++)
        draw(c, 'dungeon', 0, 0, 16, 16, cx + x * tile, cy);
      c.fillStyle = '#9aa39a';
      c.fillRect(cx - 2, cy + 3, 84, 2);
      c.fillStyle = '#33484b';
      c.fillRect(cx - 2, cy + 5, 84, 4);
      draw(c, 'dungeon', 0, 112, 32, 48, cx + 24, cy + 12);
      c.fillStyle = '#506a4b';
      c.fillRect(cx + 3, cy + 58, 11, 2);
      c.fillRect(cx + 6, cy + 55, 6, 3);
      c.fillRect(cx + 66, cy + 57, 10, 3);
    });
    // Open stone arch above a clear, three-tile entrance.
    const gx = ox + 8 * tile,
      gy = oy + 16 * tile;
    add('cemetery-open-gate', gx + 8, gy + 16, (c) =>
      c.drawImage(gate, gx - 8, gy - 32),
    );
    for (const col of [6, 10]) {
      const x = ox + col * tile,
        y = oy + 16 * tile;
      add('cemetery-candle', x + 8, y, (c) => {
        draw(c, 'dungeonProps', 16, 64, 16, 16, x, y - 31);
      });
    }
    for (const [col, row] of [
      [1, 3],
      [15, 5],
      [1, 12],
      [15, 14],
      [4, 14],
    ]) {
      const x = ox + col * tile,
        y = oy + row * tile;
      add('cemetery-dry-shrub', x + 8, y + 12, (c) =>
        draw(c, 'vegetation', 160, 272, 16, 16, x, y),
      );
    }
    for (const [col, row] of [
      [1, 5],
      [12, 8],
    ]) {
      const x = ox + col * tile,
        y = oy + row * tile;
      add('cemetery-offering', x + 8, y + 12, (c) =>
        draw(c, 'vegetation', 192, 160, 16, 32, x, y - 16),
      );
    }
    for (const [tx, ty] of [
      [60, 10],
      [78.5, 13],
      [76.5, 24.5],
    ]) {
      add('cemetery-dead-tree', tx * tile, ty * tile, (c) => {
        shadow(c, tx * tile, ty * tile, 32, 9);
        draw(c, 'oak', 96, 0, 48, 96, tx * tile - 24, ty * tile - 96);
      });
    }
    add('cemetery-skeleton', ox + 13.5 * tile, oy + 14.5 * tile, (c) =>
      draw(c, 'skeleton', 0, 0, 32, 32, ox + 12.5 * tile, oy + 12.9 * tile),
    );
    return layout;
  }
  return { layout, build };
})();
