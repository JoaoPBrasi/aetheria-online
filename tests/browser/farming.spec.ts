import { test, expect } from '@playwright/test';
test('farms contextually without equipping tools or navigating action menus', async ({
  page,
}) => {
  test.setTimeout(100000);
  await page.goto('/');
  await expect(page.getByTestId('database-status')).toContainText(
    'Disponível',
    { timeout: 15000 },
  );
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page
    .getByLabel('Nome do personagem')
    .fill('Horta ' + Date.now().toString().slice(-8));
  await page.getByRole('button', { name: /Criar personagem/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await page.keyboard.press('h');
  await page
    .getByRole('button', { name: /Parcela \d+\s*Livre/ })
    .first()
    .click();
  const text = await page.getByTestId('farm-status').innerText();
  const [, xs, ys] = text.match(/· (\d+), (\d+)/)!;
  const plot = text.match(/Parcela \d+/)![0];
  await page.keyboard.press('Escape');
  const coordinates = async () => {
    const t = await page.getByTestId('world-position').innerText();
    const m = t.match(/(\d+), (\d+)/)!;
    return { x: Number(m[1]), y: Number(m[2]) };
  };
  await page.keyboard.down('a');
  await expect
    .poll(async () => (await coordinates()).x, {
      timeout: 10000,
      intervals: [50],
    })
    .toBeLessThan(Number(xs) + 10);
  await page.keyboard.up('a');
  await page.keyboard.down('s');
  await expect
    .poll(async () => (await coordinates()).y, {
      timeout: 10000,
      intervals: [50],
    })
    .toBeGreaterThan(Number(ys) - 10);
  await page.keyboard.up('s');
  const action = page.getByTestId('context-action');
  await expect(action).toContainText('Preparar terra');
  await page.keyboard.press('e');
  await expect(action).toContainText('Plantar');
  await page.keyboard.press('e');
  await expect(action).toContainText('Regar');
  await page.keyboard.press('e');
  await expect(action).toContainText('Crescendo');
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await expect(action).toContainText('Crescendo');
  await page.screenshot({ path: 'work/farming-growing.png', fullPage: true });
  await expect(action).toContainText('Colher', { timeout: 65000 });
  await page.keyboard.press('e');
  await page.keyboard.press('b');
  await expect(
    page.getByRole('button', { name: /Slot \d+: Nabo, 3$/ }),
  ).toBeVisible();
  await expect(page.getByTestId('equipped-tool')).toContainText('Nenhuma');
  await page.keyboard.press('Escape');
  await page.keyboard.press('h');
  await page
    .getByRole('button', { name: new RegExp(plot + '\\s*Sua$') })
    .click();
  await page
    .getByRole('button', { name: 'Liberar parcela', exact: true })
    .click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
});
