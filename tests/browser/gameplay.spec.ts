import { test, expect } from '@playwright/test';
test('collects with a carried tool and manages inventory inside the game', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page
    .getByLabel('Nome do personagem')
    .fill('Fluido ' + Date.now().toString().slice(-8));
  await page.getByRole('button', { name: /Criar personagem/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await expect(page.getByTestId('context-action')).toBeEnabled({
    timeout: 10000,
  });
  await page.keyboard.press('e');
  await expect(page.getByRole('status')).toContainText('+3 Madeira');
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-player-pose',
    /^chop:/,
  );
  await page.screenshot({ path: 'work/immersive-hud.png', fullPage: true });
  await page.keyboard.press('b');
  const dialog = page.getByRole('dialog', { name: 'Mochila', exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('equipped-tool')).toContainText('Nenhuma');
  const wood = page.getByRole('button', { name: /Slot \d+: Madeira, 3$/ });
  await wood.click();
  await page.getByLabel('Slot de destino', { exact: true }).fill('10');
  await page.getByLabel('Quantidade a mover').fill('1');
  await page.getByRole('button', { name: 'Mover / dividir' }).click();
  await expect(
    page.getByRole('button', { name: 'Slot 10: Madeira, 1', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press('l');
  await expect(
    page.getByRole('dialog', { name: 'Ofícios', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Machado inicial', { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await page.keyboard.press('b');
  await expect(
    page.getByRole('button', { name: 'Slot 10: Madeira, 1', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'work/immersive-inventory.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
});

test('clicks a nearby resource with correct canvas coordinates after resizing', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('database-status')).toContainText('Disponível');
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page
    .getByLabel('Nome do personagem')
    .fill('Clique ' + Date.now().toString().slice(-8));
  await page.getByRole('button', { name: /Criar personagem/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect
    .poll(() =>
      page.locator('canvas').evaluate((c) => (c as HTMLCanvasElement).width),
    )
    .toBe(1024);
  await expect(page.getByTestId('context-action')).toBeEnabled({
    timeout: 10000,
  });
  await page
    .locator('canvas')
    .click({ position: { x: 512 + 40, y: 384 + 40 } });
  await expect(page.getByRole('status')).toContainText('+3 Madeira');
  await page.keyboard.press('b');
  await expect(
    page.getByRole('dialog', { name: 'Mochila', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'work/immersive-1024.png', fullPage: true });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
});
