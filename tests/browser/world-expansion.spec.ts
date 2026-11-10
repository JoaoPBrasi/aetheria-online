import { expect, test } from '@playwright/test';

test('explores the expanded map across the river and restores the saved region', async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByTestId('database-status')).toContainText('Disponível');
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page
    .getByLabel('Nome do personagem')
    .fill('Explorar ' + Date.now().toString().slice(-8));
  await page.getByRole('button', { name: /Criar personagem/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await expect(page.getByTestId('connection-status')).toContainText(
    'Conectado',
  );
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-world-width',
    '3072',
  );
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-world-height',
    '3072',
  );
  await page.screenshot({ path: 'work/village-expanded.png', fullPage: true });
  const coordinates = async () => {
    const match = (await page.getByTestId('world-position').innerText()).match(
      /(\d+), (\d+)/,
    )!;
    return { x: Number(match[1]), y: Number(match[2]) };
  };
  await page.keyboard.down('d');
  try {
    await expect
      .poll(async () => (await coordinates()).x, {
        timeout: 16000,
        intervals: [50],
      })
      .toBeGreaterThan(2480);
  } finally {
    await page.keyboard.up('d');
  }
  await page.keyboard.down('s');
  try {
    await expect
      .poll(async () => (await coordinates()).y, {
        timeout: 6000,
        intervals: [50],
      })
      .toBeGreaterThan(1360);
  } finally {
    await page.keyboard.up('s');
  }
  await expect(page.getByTestId('world-region')).toHaveText(
    'Acampamento dos Orcs',
  );
  await page.screenshot({ path: 'work/orc-field.png', fullPage: true });
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await expect(page.getByTestId('connection-status')).toContainText(
    'Conectado',
  );
  await expect(page.getByTestId('world-region')).toHaveText(
    'Acampamento dos Orcs',
  );
  expect((await coordinates()).x).toBeGreaterThan(2048);
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
});
