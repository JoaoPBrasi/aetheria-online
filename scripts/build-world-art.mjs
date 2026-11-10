import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const plan = JSON.parse(
  await readFile(
    new URL('apps/client/public/maps/world-art-plan.json', root),
    'utf8',
  ),
);
const source = new URL('art/sprites/', root);
const manifest = JSON.parse(
  await readFile(new URL('manifest.json', source), 'utf8'),
);
const urls = {};
for (const [id, item] of Object.entries(manifest.sprites))
  urls[id] =
    'data:image/png;base64,' +
    (await readFile(new URL(item.file, source))).toString('base64');
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
  await page.goto('about:blank');
  for (const script of ['cemetery.js', 'houses.js', 'render.js'])
    await page.addScriptTag({
      path: fileURLToPath(new URL('world-art/' + script, import.meta.url)),
    });
  const result = await page.evaluate(
    ({ plan, urls }) => window.WorldArtRenderer(plan, urls),
    { plan, urls },
  );
  const sprites = new URL('apps/client/public/sprites/', root),
    maps = new URL('apps/client/public/maps/', root);
  await mkdir(new URL('work/', root), { recursive: true });
  const savePNG = (url, data) =>
    writeFile(url, Buffer.from(data.split(',')[1], 'base64'));
  await savePNG(new URL('brumavale-ground.png', sprites), result.groundURL);
  await savePNG(new URL('brumavale-props.png', sprites), result.atlasURL);
  await writeFile(
    new URL('brumavale-props.json', maps),
    JSON.stringify(result.atlas),
  );
  await writeFile(
    new URL('brumavale-art.json', maps),
    JSON.stringify(result.artwork),
  );
  await savePNG(
    new URL('work/brumavale-expanded.png', root),
    result.overviewURL,
  );
  await savePNG(new URL('work/house-models.png', root), result.galleryURL);
  console.log(
    JSON.stringify({
      width: result.artwork.width,
      height: result.artwork.height,
      ...result.counts,
    }),
  );
} finally {
  await browser.close();
}
