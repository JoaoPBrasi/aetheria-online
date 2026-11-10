import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url),
  directory = new URL('art/sprites/character/', root);
const states = {
  Idle: 'idle',
  Walk: 'walk',
  Collect: 'collect',
  Slice: 'chop',
  Crush: 'mine',
  Watering: 'water',
  Hit: 'hit',
};
const sources = [];
for (const [file, state] of Object.entries(states))
  for (const direction of ['Down', 'Up', 'Side']) {
    const data = await readFile(
      new URL(`${file}_${direction}-Sheet.png`, directory),
    );
    sources.push({
      name: `${state}-${direction.toLowerCase()}`,
      direction: direction.toLowerCase(),
      url: 'data:image/png;base64,' + data.toString('base64'),
    });
  }
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH || process.platform === 'win32'
    ? {
        executablePath:
          process.env.CHROMIUM_PATH ||
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      }
    : {}),
});
try {
  const page = await browser.newPage();
  await page.addScriptTag({
    path: fileURLToPath(new URL('character-art/render.js', import.meta.url)),
  });
  const result = await page.evaluate(
    (sources) => window.buildCharacterArt(sources),
    sources,
  );
  await writeFile(
    new URL('apps/client/public/sprites/player-atlas.png', root),
    Buffer.from(result.url.split(',')[1], 'base64'),
  );
  await writeFile(
    new URL('apps/client/public/maps/player-atlas.json', root),
    JSON.stringify(result.atlas),
  );
  console.log(
    JSON.stringify({
      frames: result.frames,
      texture: result.atlas.meta.size,
      sourceSheets: sources.length,
    }),
  );
} finally {
  await browser.close();
}
