window.WorldArtRenderer = async (plan, sourceURLs) => {
  const images = {};
  await Promise.all(
    Object.entries(sourceURLs).map(async ([id, url]) => {
      const im = new Image();
      im.src = url;
      await im.decode();
      images[id] = im;
    }),
  );
  const tile = 16,
    size = plan.size,
    nativeSize = tile * size,
    scale = plan.tileSize / tile;
  const ground = document.createElement('canvas');
  ground.width = ground.height = nativeSize;
  const g = ground.getContext('2d');
  g.imageSmoothingEnabled = false;
  const frames = new Map(),
    props = [],
    buildingFrames = {};
  const draw = (c, id, sx, sy, w, h, x, y, dw = w, dh = h) =>
    c.drawImage(images[id], sx, sy, w, h, Math.round(x), Math.round(y), dw, dh);
  const hash = (x, y) =>
    (Math.imul(x + 127, 16777619) ^ Math.imul(y + 91, 374761393)) >>> 0;
  const inside = (x, y, r) =>
    x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  const inCemetery = (x, y) =>
    x >= plan.cemetery.x - 2 &&
    x <= plan.cemetery.x + 19 &&
    y >= plan.cemetery.y - 2 &&
    y <= plan.cemetery.y + 23;
  const blocked = (x, y) => plan.tiles[y]?.[x] === 4;
  function cut(id, crop) {
    const c = document.createElement('canvas');
    c.width = crop[2];
    c.height = crop[3];
    c.getContext('2d').drawImage(images[id], ...crop, 0, 0, c.width, c.height);
    return c;
  }
  function trim(input) {
    const c = input.getContext('2d'),
      data = c.getImageData(0, 0, input.width, input.height).data;
    let x0 = input.width,
      y0 = input.height,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < input.height; y++)
      for (let x = 0; x < input.width; x++)
        if (data[(y * input.width + x) * 4 + 3]) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
    if (x1 < 0) throw new Error('Empty sprite in generated atlas');
    const out = document.createElement('canvas');
    out.width = x1 - x0 + 1;
    out.height = y1 - y0 + 1;
    out
      .getContext('2d')
      .drawImage(
        input,
        x0,
        y0,
        out.width,
        out.height,
        0,
        0,
        out.width,
        out.height,
      );
    return { canvas: out, dx: x0, dy: y0 };
  }
  function frame(id, canvas, keepSize = false) {
    if (!frames.has(id))
      frames.set(id, keepSize ? { canvas, dx: 0, dy: 0 } : trim(canvas));
    return frames.get(id);
  }
  function place(id, frameId, canvas, left, top, depth) {
    const f = frame(frameId, canvas);
    props.push({
      id,
      frame: frameId,
      x: (left + f.dx) * scale,
      y: (top + f.dy) * scale,
      depth: depth * scale,
    });
  }
  function simple(id, key, crop, x, y, depth = y + crop[3]) {
    place(id, key, cut(key.split(':')[0], crop), x, y, depth);
  }
  const bridgeAt = (x, y) => plan.bridges.some((b) => inside(x, y, b));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const kind = plan.tiles[y][x],
        n = hash(x, y);
      if (kind === 3)
        draw(
          g,
          'water',
          16 + (n % 3) * 16,
          176 + ((n >>> 4) % 3) * 16,
          16,
          16,
          x * tile,
          y * tile,
        );
      else {
        draw(g, 'floors', 16 + (n % 3) * 16, 160, 16, 16, x * tile, y * tile);
        if (kind === 1) {
          const village = x >= 22 && x <= 45 && y >= 24 && y <= 42;
          if (bridgeAt(x, y))
            draw(g, 'dungeon', 256, 16, 16, 16, x * tile, y * tile);
          else if (village)
            draw(
              g,
              'floors',
              256 + (n % 3) * 16,
              16 + ((n >>> 4) % 3) * 16,
              16,
              16,
              x * tile,
              y * tile,
            );
          else
            draw(
              g,
              'floors',
              176 + (n % 3) * 16,
              160,
              16,
              16,
              x * tile,
              y * tile,
            );
        } else if (kind === 2)
          draw(
            g,
            'floors',
            176 + (n % 3) * 16,
            160,
            16,
            16,
            x * tile,
            y * tile,
          );
      }
    }
  // Source shore tiles have opaque water around a grass island; choose their
  // edge orientation from the same grid used by authoritative movement.
  const water = (x, y) => plan.tiles[y]?.[x] === 3;
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++) {
      if (water(x, y) || bridgeAt(x, y)) continue;
      const n = water(x, y - 1),
        s = water(x, y + 1),
        w = water(x - 1, y),
        e = water(x + 1, y);
      if (n || s || w || e)
        draw(
          g,
          'water',
          w ? 0 : e ? 64 : 32,
          n ? 0 : s ? 64 : 32,
          16,
          16,
          x * tile,
          y * tile,
        );
    }
  for (const plot of plan.farmPlots) {
    const x = plot.tileX * tile,
      y = plot.tileY * tile;
    g.fillStyle = '#795232';
    g.fillRect(x + 1, y + 1, 14, 14);
    g.fillStyle = '#a37b43';
    g.fillRect(x + 1, y + 1, 14, 1);
    for (let row = 4; row < 15; row += 4) {
      g.fillStyle = '#4f3926';
      g.fillRect(x + 2, y + row, 12, 1);
    }
  }
  const roofModels = ['timber', 'riverside', 'greenhouse', 'lodge', 'smith'];
  const houseImages = {};
  for (const model of roofModels)
    houseImages[model] = window.VillageHouses.create(
      images,
      model,
      model === 'greenhouse' ? 80 : 96,
    );
  for (const b of plan.landmarks) {
    const h = houseImages[b.model],
      cx = (b.x + b.w / 2) * tile,
      footY = (b.y + b.h) * tile;
    place(
      `building:${b.name}`,
      `house:${b.model}`,
      h.canvas,
      cx - h.anchorX,
      footY - h.anchorY,
      footY,
    );
    buildingFrames[b.name] = `house:${b.model}`;
  }
  const treeFrames = {
    oak: cut('oak', [0, 0, 48, 96]),
    pine: cut('pine', [0, 80, 48, 80]),
    autumn: cut('oak', [0, 96, 48, 96]),
  };
  const stone = cut('rocks', [98, 16, 32, 48]);
  for (const [x, y] of plan.rocks)
    place(
      `rock:${x}:${y}`,
      'rock:large',
      stone,
      x * tile - 8,
      y * tile - 30,
      y * tile + 16,
    );
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (
        !blocked(x, y) ||
        inCemetery(x, y) ||
        plan.landmarks.some((b) => inside(x, y, b)) ||
        plan.villageProps.some((p) => inside(x, y, p)) ||
        plan.rocks.some((r) => r[0] === x && r[1] === y)
      )
        continue;
      if (
        (x === 0 || y === 0 || x === size - 1 || y === size - 1) &&
        (x + y) % 2
      )
        continue;
      const kind = x > 65 ? 'pine' : hash(x, y) % 5 === 0 ? 'autumn' : 'oak',
        im = treeFrames[kind];
      place(
        `tree:${x}:${y}`,
        `tree:${kind}`,
        im,
        x * tile + 8 - im.width / 2,
        y * tile + 12 - im.height,
        y * tile + 12,
      );
    }
  for (let y = 2; y < size - 2; y += 3)
    for (let x = 2; x < size - 2; x += 3) {
      if (
        plan.tiles[y][x] !== 0 ||
        inside(x, y, plan.quarry) ||
        inCemetery(x, y) ||
        hash(x, y) % 5 > 1
      )
        continue;
      const crop = hash(x, y) % 2 ? [16, 384, 16, 16] : [96, 176, 16, 16];
      simple(
        `grass:${x}:${y}`,
        `vegetation:${crop[1]}`,
        crop,
        x * tile,
        y * tile,
        y * tile + 12,
      );
    }
  // Marketplace and planting props have matching solid footprints in world.ts.
  for (const p of plan.villageProps) {
    const x = (p.x + p.w / 2) * tile,
      foot = (p.y + p.h) * tile;
    if (p.kind === 'stall') {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 40;
      const q = c.getContext('2d');
      draw(q, 'buildingProps', 80, 160, 64, 32, 0, 8);
      draw(q, 'farm', 80, 48, 16, 16, 12, 6);
      draw(q, 'farm', 112, 112, 16, 16, 35, 6);
      place(p.id, 'stall', c, x - 32, foot - 28, foot);
    } else {
      const crop = p.kind === 'crate' ? [288, 0, 32, 32] : [144, 0, 32, 32];
      place(p.id, `farm:${p.kind}`, cut('farm', crop), x - 16, foot - 30, foot);
    }
  }
  // Beds and a white low fence echo the greenhouse/riverside references.
  const fence = cut('buildingProps', [24, 176, 16, 16]),
    fc = fence.getContext('2d'),
    fd = fc.getImageData(0, 0, 16, 16);
  for (let i = 0; i < fd.data.length; i += 4)
    if (fd.data[i + 3]) {
      const l =
        fd.data[i] * 0.3 + fd.data[i + 1] * 0.59 + fd.data[i + 2] * 0.11;
      fd.data[i] = 95 + l * 0.75;
      fd.data[i + 1] = 104 + l * 0.72;
      fd.data[i + 2] = 87 + l * 0.66;
    }
  fc.putImageData(fd, 0, 0);
  frame('fence:white', fence);
  for (const b of plan.bridges) {
    for (let x = b.x; x < b.x + b.w; x++) {
      place(
        `bridge-back:${x}:${b.y}`,
        'fence:wood',
        cut('buildingProps', [24, 176, 16, 16]),
        x * tile,
        b.y * tile - 8,
        b.y * tile,
      );
      place(
        `bridge-front:${x}:${b.y}`,
        'fence:wood',
        cut('buildingProps', [24, 176, 16, 16]),
        x * tile,
        (b.y + b.h) * tile - 8,
        (b.y + b.h) * tile,
      );
    }
  }
  // Reuse the approved cemetery composition, translated into the expanded world.
  if (
    JSON.stringify(plan.cemetery.rows) !==
    JSON.stringify(window.CemeteryStudy.layout.rows)
  )
    throw new Error('Cemetery art/collision matrices differ');
  const deltaX =
    (plan.cemetery.x - window.CemeteryStudy.layout.origin.x) * tile;
  const deltaY =
    (plan.cemetery.y - window.CemeteryStudy.layout.origin.y) * tile;
  const cemeteryProps = [];
  g.save();
  g.translate(deltaX, deltaY);
  window.CemeteryStudy.build({
    images,
    ground: g,
    objects: cemeteryProps,
    draw,
    shadow: (c, x, y, w = 32, h = 9) => {
      c.fillStyle = '#10251c40';
      c.fillRect(x - w / 2, y - h / 2, w, h);
    },
  });
  g.restore();
  for (const [i, o] of cemeteryProps.entries()) {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const q = c.getContext('2d');
    q.imageSmoothingEnabled = false;
    q.translate(80 - o.x, 136 - o.y);
    o.paint(q);
    // Pillars replace the corresponding fence segment; those callbacks are empty.
    const pixels = q.getImageData(0, 0, c.width, c.height).data;
    let visible = false;
    for (let a = 3; a < pixels.length; a += 4)
      if (pixels[a]) {
        visible = true;
        break;
      }
    if (!visible) continue;
    place(
      `cemetery:${i}`,
      `cemetery:${i}`,
      c,
      o.x - 80 + deltaX,
      o.y - 136 + deltaY,
      o.y + deltaY,
    );
  }
  for (const kind of ['orc', 'skeleton'])
    for (let i = 0; i < 4; i++)
      frame(`${kind}-idle-${i}`, cut(kind, [i * 32, 0, 32, 32]), true);
  // Atlas uses whole-pixel scaling, two-pixel padding and a single texture.
  let ax = 2,
    ay = 2,
    rowH = 0;
  const packed = [];
  for (const [key, f] of frames) {
    const w = f.canvas.width * scale,
      h = f.canvas.height * scale;
    if (ax + w + 2 > 2048) {
      ax = 2;
      ay += rowH + 4;
      rowH = 0;
    }
    packed.push({ key, f, x: ax, y: ay, w, h });
    ax += w + 4;
    rowH = Math.max(rowH, h);
  }
  const atlas = document.createElement('canvas');
  atlas.width = 2048;
  atlas.height = 2 ** Math.ceil(Math.log2(ay + rowH + 2));
  const ac = atlas.getContext('2d');
  ac.imageSmoothingEnabled = false;
  const atlasFrames = {};
  for (const p of packed) {
    ac.drawImage(p.f.canvas, p.x, p.y, p.w, p.h);
    atlasFrames[p.key] = {
      frame: { x: p.x, y: p.y, w: p.w, h: p.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: p.w, h: p.h },
      sourceSize: { w: p.w, h: p.h },
    };
  }
  const world = document.createElement('canvas');
  world.width = world.height = nativeSize * scale;
  const wc = world.getContext('2d');
  wc.imageSmoothingEnabled = false;
  wc.drawImage(ground, 0, 0, world.width, world.height);
  const overview = document.createElement('canvas');
  overview.width = overview.height = world.width;
  const oc = overview.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(world, 0, 0);
  props.sort((a, b) => a.depth - b.depth);
  for (const p of props) {
    const f = atlasFrames[p.frame].frame;
    oc.drawImage(atlas, f.x, f.y, f.w, f.h, p.x, p.y, f.w, f.h);
  }
  for (const m of plan.monsters) {
    if (m.kind === 'slime') {
      oc.fillStyle = '#92c854';
      oc.fillRect(m.spawnX - 14, m.spawnY - 21, 28, 22);
      oc.fillStyle = '#21372a';
      oc.fillRect(m.spawnX - 6, m.spawnY - 17, 3, 4);
      oc.fillRect(m.spawnX + 4, m.spawnY - 17, 3, 4);
    } else {
      const f = atlasFrames[`${m.kind}-idle-0`].frame;
      oc.drawImage(
        atlas,
        f.x,
        f.y,
        f.w,
        f.h,
        m.spawnX - f.w / 2,
        m.spawnY - f.h + 8,
        f.w,
        f.h,
      );
    }
  }
  const gallery = document.createElement('canvas');
  gallery.width = 1504;
  gallery.height = 480;
  const gc = gallery.getContext('2d');
  gc.imageSmoothingEnabled = false;
  gc.fillStyle = '#1b2b24';
  gc.fillRect(0, 0, 1504, 480);
  const galleryModels = [
    ['timber', 'Casa de madeira e alvenaria'],
    ['riverside', 'Casa ribeirinha'],
    ['greenhouse', 'Estufa envidraçada'],
    ['lodge', 'Cabana de troncos'],
  ];
  galleryModels.forEach(([model, label], i) => {
    gc.drawImage(houseImages[model].canvas, 20 + i * 372, 42, 320, 352);
    gc.fillStyle = '#e7d9ad';
    gc.font = '19px Georgia';
    gc.fillText(label, 30 + i * 372, 438);
  });
  return {
    groundURL: world.toDataURL('image/png'),
    atlasURL: atlas.toDataURL('image/png'),
    overviewURL: overview.toDataURL('image/png'),
    galleryURL: gallery.toDataURL('image/png'),
    atlas: {
      frames: atlasFrames,
      meta: {
        image: 'brumavale-props.png',
        size: { w: atlas.width, h: atlas.height },
        scale: '1',
      },
    },
    artwork: {
      revision: plan.revision,
      width: world.width,
      height: world.height,
      props,
      buildingFrames,
    },
    counts: {
      props: props.length,
      frames: packed.length,
      buildings: plan.landmarks.length,
      monsters: plan.monsters.length,
    },
  };
};
