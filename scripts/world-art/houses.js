/* Atlas composition at 1×: no resampling of source pixels. */
window.VillageHouses = {
  create(images, model, bodyWidth = 96) {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 176;
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    const bodyX = 80 - bodyWidth / 2,
      baseY = 152;
    const sprite = (id, crop, x, y) =>
      c.drawImage(images[id], ...crop, x, y, crop[2], crop[3]);
    const glass = model === 'greenhouse',
      logs = model === 'lodge';
    const roofSource = model === 'riverside' || logs ? 128 : 0;
    const roof = document.createElement('canvas');
    roof.width = 128;
    roof.height = 96;
    const r = roof.getContext('2d');
    r.drawImage(images.roofs, roofSource, 0, 128, 96, 0, 0, 128, 96);
    const pixels = r.getImageData(0, 0, 128, 96);
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 128; x++) {
        const i = (y * 128 + x) * 4,
          slope = Math.abs(x - 64) / 2;
        if (y < 4 + slope || y > 65 + slope) {
          pixels.data[i + 3] = 0;
          continue;
        }
        if (logs && pixels.data[i + 3]) {
          const l =
            pixels.data[i] * 0.3 +
            pixels.data[i + 1] * 0.59 +
            pixels.data[i + 2] * 0.11;
          pixels.data[i] = Math.round(l * 0.4);
          pixels.data[i + 1] = Math.round(l * 0.41);
          pixels.data[i + 2] = Math.round(l * 0.44);
        }
      }
    r.putImageData(pixels, 0, 0);
    // Chimney is behind the roof, with its base hidden by the left roof plane.
    if (logs || model === 'smith' || model === 'timber')
      sprite('buildingProps', [0, 64, 32, 64], 28, 0);
    c.fillStyle = '#16261f40';
    c.fillRect(bodyX - 4, 148, bodyWidth + 8, 10);
    // Front gable and facade use the same timber family as the reference houses.
    c.save();
    c.beginPath();
    c.moveTo(80, 70);
    c.lineTo(bodyX - 7, 110);
    c.lineTo(bodyX + bodyWidth + 7, 110);
    c.closePath();
    c.clip();
    for (let y = 64; y < 112; y += 16)
      for (let x = bodyX - 16; x < bodyX + bodyWidth + 16; x += 16)
        sprite('walls', [208, 192, 16, 16], x, y);
    c.restore();
    const wallCrop = glass
      ? [192, 620, 16, 52]
      : logs
        ? [112, 192, 16, 48]
        : [400, 192, 16, 48];
    for (let x = bodyX; x < bodyX + bodyWidth; x += 16) {
      sprite('walls', wallCrop, x, glass ? 96 : 92);
      if (!glass) sprite('walls', [logs ? 112 : 400, 224, 16, 16], x, 136);
    }
    // Framing, skirting and corner posts remain on whole source pixels.
    c.fillStyle = '#342719';
    c.fillRect(bodyX, 90, 3, 63);
    c.fillRect(bodyX + bodyWidth - 3, 90, 3, 63);
    c.fillRect(bodyX, 149, bodyWidth, 4);
    c.fillStyle = '#8b6139';
    c.fillRect(bodyX + 3, 91, 2, 59);
    c.fillRect(bodyX + bodyWidth - 6, 91, 2, 59);
    c.fillStyle = '#3a2d20';
    c.fillRect(bodyX, 118, bodyWidth, 4);
    c.fillStyle = '#a47c4f';
    c.fillRect(bodyX, 118, bodyWidth, 1);
    if (glass) {
      sprite('roofs', [272, 80, 96, 112], 32, 0);
      // Transparent glass door and planting benches inside the front facade.
      sprite('buildingProps', [160, 16, 32, 48], 64, 104);
      sprite('farm', [144, 0, 32, 32], 38, 120);
      sprite('farm', [144, 64, 32, 32], 91, 120);
      steps(64);
    } else {
      c.drawImage(roof, 16, 12);
      if (logs) {
        sprite('buildingProps', [132, 96, 24, 32], bodyX + 6, 104);
        sprite('buildingProps', [132, 96, 24, 32], bodyX + 34, 104);
        sprite('buildingProps', [160, 16, 32, 48], bodyX + bodyWidth - 34, 104);
      } else {
        sprite(
          'buildingProps',
          model === 'riverside' ? [132, 96, 24, 32] : [100, 96, 24, 32],
          bodyX + 6,
          104,
        );
        sprite('buildingProps', [68, 96, 24, 32], bodyX + 34, 104);
        sprite('buildingProps', [32, 16, 32, 64], bodyX + bodyWidth - 34, 88);
      }
      steps(bodyX + bodyWidth - 34);
      if (model === 'riverside') {
        sprite('farm', [144, 0, 32, 32], bodyX + 3, 129);
        sprite('farm', [288, 0, 32, 32], bodyX + bodyWidth - 4, 135);
      }
    }
    function steps(x) {
      c.fillStyle = '#32251b';
      c.fillRect(x - 1, baseY - 2, 34, 12);
      for (let row = 0; row < 3; row++) {
        c.fillStyle = '#a07947';
        c.fillRect(x, baseY - 1 + row * 4, 32, 2);
        c.fillStyle = '#62462c';
        c.fillRect(x, baseY + 1 + row * 4, 32, 1);
      }
    }
    return { canvas, anchorX: 80, anchorY: baseY };
  },
};
