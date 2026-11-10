import { expect, test } from '@playwright/test';

test('accepts Eldrin tutorial with server confirmation and restores it after returning', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('database-status')).toContainText('Disponível');
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page
    .getByLabel('Nome do personagem')
    .fill('Missão ' + Date.now().toString().slice(-8));
  await page.getByRole('button', { name: /Criar personagem/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await expect(page.getByTestId('connection-status')).toContainText(
    'Conectado',
  );
  await page.keyboard.down('w');
  await expect(page.getByTestId('context-action')).toContainText('Conversar');
  await page.keyboard.up('w');
  await page.keyboard.press('e');
  const dialogue = page.getByRole('dialog', {
    name: 'Conversa com Ancião Eldrin',
  });
  await expect(dialogue).toBeVisible();
  await dialogue.getByRole('button', { name: /Tenho coragem/ }).click();
  await expect(
    dialogue.getByRole('button', { name: /Em Andamento/ }),
  ).toBeVisible();
  await expect(
    dialogue.getByText(/basta ter o machado na mochila/),
  ).toBeVisible();
  await expect(
    dialogue.getByRole('button', { name: /Concluir Missão/ }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('heading', { name: 'Primeiros Passos em Brumavale' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Primeiros Passos em Brumavale' }),
  ).toBeVisible();
  await expect(page.getByText('Missão concluída com sucesso!')).toHaveCount(0);
});
