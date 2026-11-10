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
  await page.keyboard.press('j');
  const journal = page.getByRole('dialog', {
    name: 'Diário de missões',
    exact: true,
  });
  await expect(journal).toBeVisible();
  await expect(
    journal.getByRole('tab', { name: 'Em andamento 1' }),
  ).toHaveAttribute('aria-selected', 'true');
  const tracking = journal.getByRole('checkbox', {
    name: 'Acompanhar Primeiros Passos em Brumavale',
    exact: true,
  });
  await expect(tracking).toBeChecked();
  await tracking.click();
  await expect(tracking).not.toBeChecked();
  await expect(
    page.getByRole('region', { name: 'Missões acompanhadas' }),
  ).toHaveCount(0);
  const before = await page.getByTestId('world-position').innerText();
  await page.keyboard.down('d');
  await expect
    .poll(() => page.getByTestId('world-position').innerText())
    .not.toBe(before);
  await page.keyboard.up('d');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await expect(page.getByTestId('connection-status')).toContainText(
    'Conectado',
  );
  await page
    .getByRole('button', { name: 'Abrir diário de missões', exact: true })
    .click();
  await expect(journal).toBeVisible();
  await expect(tracking).not.toBeChecked();
  await tracking.click();
  await expect(tracking).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('region', { name: 'Missões acompanhadas' }),
  ).toBeVisible();
  await expect(page.getByText('Missão concluída com sucesso!')).toHaveCount(0);
});

test('archives confirmed completed quest snapshots and keeps the journal usable at smaller sizes', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('database-status')).toContainText('Disponível');
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page
    .getByLabel('Nome do personagem')
    .fill('Diário ' + Date.now().toString().slice(-8));
  await page.getByRole('button', { name: /Criar personagem/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await expect(page.getByTestId('connection-status')).toContainText(
    'Conectado',
  );
  await page.keyboard.press('j');
  const journal = page.getByRole('dialog', {
    name: 'Diário de missões',
    exact: true,
  });
  await expect(
    journal.getByText('Nenhuma missão em andamento', { exact: true }),
  ).toBeVisible();
  await journal.getByRole('tab', { name: 'Concluídas 0' }).click();
  await expect(journal.getByText('Sua história está começando')).toBeVisible();
  await page.keyboard.press('Escape');

  // UI fixture: reproduce the authoritative snapshots; server turn-in semantics
  // are covered separately against PostgreSQL in quests.integration.test.ts.
  const ready = {
    questId: 'tutorial_first_steps',
    status: 'ready_to_turn_in',
    progress: { gather_wood: 5, craft_planks: 2, defeat_slimes: 2 },
  };
  const snapshot = async (quest: typeof ready & { completedAt?: number }) =>
    page.evaluate(async (state) => {
        const modulePath = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => url.includes('/src/game/managers/game-bridge.ts'));
        if (!modulePath) throw new Error('Game bridge module was not loaded');
      const { gameBridge } = await import(modulePath);
      gameBridge.update({ quests: [state] });
    }, quest);
  await snapshot(ready);
  const tracker = page.getByRole('region', { name: 'Missões acompanhadas' });
  await expect(tracker).toContainText(
    'Fale com o Ancião Eldrin para entregar.',
  );
  await page.keyboard.press('j');
  await expect(
    journal.getByRole('tab', { name: 'Em andamento 1' }),
  ).toBeVisible();
  await expect(
    journal.getByText('Pronta para entregar', { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: 'work/quest-journal-active.png',
    fullPage: true,
  });
  await journal
    .getByLabel('Buscar missão', { exact: true })
    .fill('inexistente');
  await expect(journal.getByText('Nenhuma missão encontrada')).toBeVisible();
  await journal.getByLabel('Buscar missão', { exact: true }).fill('');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: /Deixar de acompanhar Primeiros/ })
    .click();
  await expect(tracker).toHaveCount(0);
  await page.keyboard.press('j');
  await journal.getByRole('checkbox', { name: /Acompanhar Primeiros/ }).click();
  await expect(tracker).toBeVisible();

  await snapshot({ ...ready, status: 'completed', completedAt: 1794330000000 });
  await expect(tracker).toHaveCount(0);
  await expect(
    journal.getByRole('tab', { name: 'Em andamento 0' }),
  ).toBeVisible();
  await journal.getByRole('tab', { name: 'Concluídas 1' }).click();
  await expect(
    journal.getByRole('list', { name: 'Missões concluídas' }),
  ).toContainText('Primeiros Passos em Brumavale');
  await expect(journal.getByText('Recompensas recebidas')).toBeVisible();
  await expect(journal.getByText(/Entregue em/)).toBeVisible();
  await expect(journal.getByRole('checkbox')).toHaveCount(0);
  await page.screenshot({
    path: 'work/quest-journal-completed.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(journal).toBeInViewport();
  await page.screenshot({
    path: 'work/quest-journal-1024.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 560, height: 820 });
  await expect(
    journal.getByRole('tab', { name: 'Concluídas 1' }),
  ).toBeInViewport();
  expect(
    await journal.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'work/quest-journal-compact.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await expect(journal).toHaveCount(0);
  await expect(tracker).toHaveCount(0);
  await expect(page.getByText('Missão concluída com sucesso!')).toHaveCount(0);
});
