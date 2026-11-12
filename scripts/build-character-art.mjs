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
async function sheets(mapping, suffix) {
  const sources = [];
  for (const [file, state] of Object.entries(mapping))
    for (const direction of ['Down', 'Up', 'Side']) {
      const data = await readFile(
        new URL(`${file}_${direction}-${suffix}.png`, directory),
      );
      sources.push({
        name: `${state}-${direction.toLowerCase()}`,
        direction: direction.toLowerCase(),
        url: 'data:image/png;base64,' + data.toString('base64'),
      });
    }
  return sources;
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
  for (const [name, sources, columns] of [
    ['player-atlas', await sheets(states, 'Sheet'), 32],
    [
      'player-combat-atlas',
      await sheets({ Pierce: 'iron_thrust', Slice: 'chop' }, 'Body'),
      16,
    ],
  ]) {
    const result = await page.evaluate(
      ({ sources, options }) => window.buildCharacterArt(sources, options),
      {
        sources,
        options: {
          columns,
          image: `${name}.png`,
          weapons: name === 'player-atlas',
        },
      },
    );
    await writeFile(
      new URL(`apps/client/public/sprites/${name}.png`, root),
      Buffer.from(result.url.split(',')[1], 'base64'),
    );
    await writeFile(
      new URL(`apps/client/public/maps/${name}.json`, root),
      JSON.stringify(result.atlas),
    );
    console.log(
      JSON.stringify({
        name,
        frames: result.frames,
        texture: result.atlas.meta.size,
      }),
    );
  }
} finally {
  await browser.close();
}
