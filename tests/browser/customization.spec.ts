import { test, expect } from '@playwright/test';
test('types movement letters, customizes a character and walks with an open bag', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('database-status')).toContainText('Disponível');
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  const input = page.getByLabel('Nome do personagem');
  await input.pressSequentially('WASD Luna', { delay: 35 });
  await expect(input).toHaveValue('WASD Luna');
  await page.getByLabel('Cor da roupa', { exact: true }).fill('#578ba7');
  await page.getByLabel('Cor do cabelo', { exact: true }).fill('#bf9253');
  await page.getByLabel('Cor da pele', { exact: true }).fill('#754834');
  await page.getByLabel('Estilo de cabelo').selectOption('long');
  await page.screenshot({ path: 'work/character-creator.png', fullPage: true });
  await page.getByRole('button', { name: /Criar personagem/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await expect(page.getByTestId('connection-status')).toContainText(
    'Conectado',
  );
  await page.keyboard.press('b');
  await expect(
    page.getByRole('dialog', { name: 'Mochila', exact: true }),
  ).toBeVisible();
  const position = () => page.getByTestId('world-position').innerText();
  const before = await position();
  await page.keyboard.down('d');
  await expect.poll(position).not.toBe(before);
  await page.keyboard.up('d');
  await expect(page.getByTestId('world-position')).toContainText('Parado');
  await page.getByLabel('Quantidade a mover').focus();
  await page.waitForTimeout(800);
  const typingPos = await position();
  await page.keyboard.down('a');
  await page.waitForTimeout(300);
  await page.keyboard.up('a');
  expect(await position()).toBe(typingPos);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Bem-vindo, WASD Luna' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Personalizar personagem', exact: true })
    .click();
  await expect(page.getByLabel('Cor da roupa', { exact: true })).toHaveValue(
    '#578ba7',
  );
  await expect(page.getByLabel('Cor do cabelo', { exact: true })).toHaveValue(
    '#bf9253',
  );
  await expect(page.getByLabel('Cor da pele', { exact: true })).toHaveValue(
    '#754834',
  );
  await expect(page.getByLabel('Estilo de cabelo')).toHaveValue('long');
  await page.getByLabel('Cor da roupa', { exact: true }).fill('#7d699a');
  await page.getByRole('button', { name: /Salvar aparência/ }).click();
  await page
    .getByRole('button', { name: 'Personalizar personagem', exact: true })
    .click();
  await expect(page.getByLabel('Cor da roupa', { exact: true })).toHaveValue(
    '#7d699a',
  );
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
});
