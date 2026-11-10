import { expect, test } from '@playwright/test';

test('previews the actual sprite in every direction and keeps locomotion animated', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByTestId('database-status')).toContainText('Disponível');
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  const portrait = page.getByTestId('character-portrait');
  await expect(portrait).toHaveAttribute('data-ready', 'true');
  const pixels = () =>
    portrait.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  const initial = await pixels();
  await page.getByLabel('Cor da roupa', { exact: true }).fill('#578ba7');
  await expect.poll(pixels).not.toBe(initial);
  await page.getByLabel('Cor do cabelo', { exact: true }).fill('#bf9253');
  await page.getByLabel('Cor da pele', { exact: true }).fill('#754834');
  for (const style of ['none', 'short', 'long', 'bun']) {
    await page.getByLabel('Estilo de cabelo').selectOption(style);
    await expect(portrait).toHaveAttribute('data-ready', 'true');
    for (const [button, direction] of [
      ['frente', 'down'],
      ['esquerda', 'left'],
      ['costas', 'up'],
      ['direita', 'right'],
    ]) {
      await page
        .getByRole('button', { name: `Ver de ${button}`, exact: true })
        .click();
      await expect(portrait).toHaveAttribute('data-direction', direction!);
      await expect(portrait).toHaveAttribute('data-ready', 'true');
    }
  }
  await page
    .getByRole('button', { name: 'Ver de frente', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Testar caminhada', exact: true })
    .click();
  await expect(portrait).toHaveAttribute('data-motion', 'walk');
  await expect(portrait).toHaveAttribute('data-frame', '0'); // reduced motion keeps the preview still
  await page.screenshot({ path: 'work/sprite-creator.png', fullPage: true });
  await page.setViewportSize({ width: 560, height: 820 });
  await expect(portrait).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'work/sprite-creator-compact.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page
    .getByRole('button', { name: 'Parar caminhada', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Testar caminhada', exact: true })
    .click();
  const previewFrame = await portrait.getAttribute('data-frame');
  await expect(portrait).not.toHaveAttribute('data-frame', previewFrame!);
  await page
    .getByLabel('Nome do personagem')
    .fill('Sprite ' + Date.now().toString().slice(-8));
  await page.getByRole('button', { name: /Criar personagem/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await expect(page.getByTestId('connection-status')).toContainText(
    'Conectado',
  );
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-player-pose', /^idle:down:/);
  for (const [key, direction] of [
    ['d', 'right'],
    ['s', 'down'],
    ['a', 'left'],
    ['w', 'up'],
  ]) {
    await page.keyboard.down(key!);
    try {
      await expect(canvas).toHaveAttribute(
        'data-player-pose',
        new RegExp(`^walk:${direction}:`),
      );
      const frame = await canvas.getAttribute('data-player-pose');
      await expect(canvas).not.toHaveAttribute('data-player-pose', frame!);
    } finally {
      await page.keyboard.up(key!);
    }
    await expect(canvas).toHaveAttribute(
      'data-player-pose',
      new RegExp(`^idle:${direction}:`),
    );
  }
  await page.screenshot({
    path: 'work/player-sprite-world.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
});
