import { test, expect, type Page } from '@playwright/test';

async function coordinates(page: Page) {
  await expect(page.getByTestId('connection-status')).toContainText(
    'Conectado',
  );
  await expect(page.getByTestId('world-position')).toContainText(/\d+, \d+/);
  const text = await page.getByTestId('world-position').innerText();
  const match = text.match(/(\d+), (\d+)/);
  if (!match) throw new Error(`Posição indisponível: ${text}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

async function walk(page: Page, axis: 'x' | 'y', target: number) {
  const initial = (await coordinates(page))[axis];
  if (Math.abs(initial - target) <= 10) return;
  const forward = initial < target;
  const key = axis === 'x' ? (forward ? 'd' : 'a') : forward ? 's' : 'w';
  await page.keyboard.down(key);
  try {
    await expect
      .poll(
        async () => {
          const current = (await coordinates(page))[axis];
          return forward ? current >= target - 14 : current <= target + 14;
        },
        { timeout: 12_000, intervals: [50] },
      )
      .toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
  await expect(page.getByTestId('world-position')).toContainText('Parado');
}

async function enterGrove(page: Page, x = 592, y = 720) {
  await walk(page, 'x', x);
  await walk(page, 'y', y);
  await expect(page.getByTestId('context-action')).toContainText(
    'Cortar Carvalho',
  );
}

test('guides a new solo player, telegraphs a dodgeable attack and confirms the first slime kill', async ({
  page,
}) => {
  test.setTimeout(75_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page
    .getByLabel('Nome do personagem')
    .fill('Solo ' + Date.now().toString().slice(-8));
  await page.getByRole('button', { name: /Criar personagem/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  const guide = page.getByTestId('solo-guide');
  await expect(guide).toContainText('Fale com o Ancião Eldrin');
  await expect(page.getByTestId('context-action')).toContainText('Conversar');
  await page.keyboard.press('e');
  await page.getByRole('button', { name: /Tenho coragem/ }).click();
  await expect(
    page.getByRole('button', { name: /Em Andamento/ }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(guide).toContainText('estrada a leste');
  await page.keyboard.press('b');
  const bag = page.getByRole('dialog', { name: 'Mochila', exact: true });
  await expect(
    bag.getByRole('button', { name: /Espada de treino, 1$/ }),
  ).toBeVisible();
  await page.keyboard.press('Escape');

  await walk(page, 'x', 1680);
  await expect(guide).toContainText('Desça pelo acampamento');
  await walk(page, 'y', 1512);
  await walk(page, 'x', 1568);
  await walk(page, 'y', 1632);
  await expect(guide).toContainText('Recue do círculo');
  const warning = page.getByTestId('enemy-windup');
  const combat = page.getByTestId('combat-feedback');
  await expect(warning).toBeVisible();
  await page.keyboard.down('w');
  await page.waitForTimeout(330);
  await page.keyboard.up('w');
  await expect(warning).toHaveCount(0);
  await page.waitForTimeout(430);
  await expect(combat).toHaveCount(0);

  const action = page.getByTestId('context-action');
  await page.keyboard.down('s');
  try {
    await expect(action).toContainText('Atacar Slime');
  } finally {
    await page.keyboard.up('s');
  }
  await action.click();
  await expect(combat).toContainText('30 de dano causado');
  await expect(page.locator('canvas[data-world-width]')).toHaveAttribute(
    'data-player-pose',
    /^attack:/,
  );
  await page.screenshot({ path: 'work/solo-combate.png' });
  await page.waitForTimeout(440);
  await action.click();
  await expect(combat).toContainText('Alvo derrotado');
  await expect(page.getByRole('status')).toContainText('+2 Gosma de slime');
  await expect(
    page.getByRole('region', { name: 'Missões acompanhadas' }),
  ).toContainText('1/2');
  const health = page.getByTestId('player-health');
  if ((await health.innerText()).startsWith('100 /')) {
    await walk(page, 'y', 1672);
    await expect(health).not.toContainText('100 / 100', { timeout: 6000 });
  }
  await walk(page, 'y', 1512);
  await walk(page, 'x', 1680);
  await walk(page, 'y', 1380);
  await expect(combat).toContainText('Fogueira', { timeout: 6000 });
  await expect(health).toContainText('100 / 100', { timeout: 6000 });
  expect(errors).toEqual([]);
});

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
  await enterGrove(page);
  await expect(page.getByTestId('context-action')).toBeEnabled({
    timeout: 10000,
  });
  await page.keyboard.press('e');
  await expect(page.getByRole('status')).toContainText('+3 Madeira');
  await expect(page.locator('canvas[data-world-width]')).toHaveAttribute(
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
      page
        .locator('canvas[data-world-width]')
        .evaluate((c) => (c as HTMLCanvasElement).width),
    )
    .toBe(1024);
  await enterGrove(page, 464);
  const point = await coordinates(page);
  await page.locator('canvas[data-world-width]').click({
    position: { x: 512 + 464 - point.x, y: 384 + 720 - point.y - 30 },
  });
  await expect(page.getByRole('status')).toContainText('+3 Madeira');
  await page.keyboard.press('b');
  await expect(
    page.getByRole('dialog', { name: 'Mochila', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'work/immersive-1024.png', fullPage: true });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
});

test('crosses the plaza, mines the quarry, forges iron equipment and recuts a restored tree', async ({
  page,
}) => {
  test.setTimeout(210_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page
    .getByLabel('Nome do personagem')
    .fill('Ferreiro ' + Date.now().toString().slice(-8));
  await page.getByRole('button', { name: /Criar personagem/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  const action = page.getByTestId('context-action');
  const gather = async (label: string, item: string) => {
    await expect(action).toContainText(label);
    await page.keyboard.press('e');
    await expect(page.getByRole('status')).toContainText(`+3 ${item}`);
  };

  await walk(page, 'y', 1112);
  expect((await coordinates(page)).y).toBeGreaterThan(1085);
  await expect(action).toHaveCount(0);
  await walk(page, 'y', 1040);
  await enterGrove(page, 592, 496);
  await gather('Cortar Carvalho', 'Madeira');
  await walk(page, 'x', 528);
  await walk(page, 'y', 592);
  await gather('Cortar Carvalho', 'Madeira');
  await walk(page, 'x', 400);
  await gather('Cortar Carvalho', 'Madeira');
  await walk(page, 'y', 1040);
  await walk(page, 'x', 1680);
  await walk(page, 'y', 1360);
  await expect(page.getByTestId('world-region')).toHaveText(
    'Acampamento do Bosque',
  );
  await page.screenshot({ path: 'work/acampamento-bosque.png' });
  await walk(page, 'y', 1040);
  await walk(page, 'x', 2224);
  await walk(page, 'y', 432);
  await expect(page.getByTestId('world-region')).toHaveText('Pedreira do Lago');
  await gather('Coletar Minério de ferro', 'Minério de ferro');
  await walk(page, 'x', 2288);
  await walk(page, 'y', 464);
  await gather('Coletar Minério de ferro', 'Minério de ferro');
  await page.screenshot({ path: 'work/pedreira.png' });

  await walk(page, 'x', 2224);
  await walk(page, 'y', 1040);
  await walk(page, 'x', 1184);
  await walk(page, 'y', 1168);
  await expect(action).toContainText('Usar Fornalha');
  // A câmera desacelera depois que o personagem para de andar.
  await page.waitForTimeout(350);
  const nearFurnace = await coordinates(page);
  await page.locator('canvas[data-world-width]').click({
    position: { x: 720 + 1192 - nearFurnace.x, y: 500 + 1162 - nearFurnace.y },
  });
  const selected = (label: string) =>
    page.getByRole('tab', { name: new RegExp(label) });
  await expect(selected('Fornalha')).toHaveAttribute('aria-selected', 'true');
  const recipe = (item: string) =>
    page
      .locator('.recipe-card')
      .filter({ has: page.getByText(item, { exact: true }) });
  const ingot = recipe('1 × Lingote de ferro');
  const charcoal = recipe('2 × Carvão vegetal');
  await expect(
    ingot.getByRole('button', { name: 'Faltam materiais' }),
  ).toBeDisabled();
  await expect(ingot).toContainText('Minério de ferro: 6 / 2');
  await expect(ingot).toContainText('Carvão vegetal: 0 / 1');
  const craft = async (
    card: ReturnType<typeof recipe>,
    item: string,
    quantity: number,
  ) => {
    await card.getByRole('button', { name: 'Fabricar', exact: true }).click();
    await expect(page.getByRole('status')).toContainText(
      `+${quantity} ${item}`,
    );
  };
  await craft(charcoal, 'Carvão vegetal', 2);
  await expect(ingot).toContainText('Carvão vegetal: 2 / 1');
  await craft(charcoal, 'Carvão vegetal', 2);
  await expect(ingot).toContainText('Carvão vegetal: 4 / 1');
  for (const left of [4, 2, 0]) {
    await craft(ingot, 'Lingote de ferro', 1);
    await expect(ingot).toContainText(`Minério de ferro: ${left} / 2`);
  }
  await page.screenshot({ path: 'work/fornalha.png' });
  await page.keyboard.press('Escape');
  await walk(page, 'x', 1144);
  await expect(action).toContainText('Usar Forja do Ferreiro');
  await page.keyboard.press('e');
  await expect(selected('Forja do Ferreiro')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const axe = recipe('1 × Machado de ferro');
  const sword = recipe('1 × Espada de ferro');
  await expect(axe).toContainText('Lingote de ferro: 3 / 1');
  await axe.getByRole('button', { name: 'Fabricar', exact: true }).click();
  await expect(sword).toContainText('Lingote de ferro: 2 / 2');
  await sword.getByRole('button', { name: 'Fabricar', exact: true }).click();
  await expect(
    axe.getByRole('button', { name: 'Faltam materiais' }),
  ).toBeDisabled();
  await expect(axe).toContainText('Madeira: 2 / 2');
  await page.screenshot({ path: 'work/forja.png' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('b');
  const bag = page.getByRole('dialog', { name: 'Mochila', exact: true });
  await expect(
    bag.getByRole('button', { name: /Machado de ferro, 1$/ }),
  ).toBeVisible();
  await expect(
    bag.getByRole('button', { name: /Espada de ferro, 1$/ }),
  ).toBeVisible();
  await expect(
    bag.getByRole('button', { name: /Carvão vegetal, 1$/ }),
  ).toBeVisible();
  await expect(bag.getByRole('button', { name: /Madeira, 2$/ })).toBeVisible();
  await bag.getByRole('button', { name: /Machado de ferro, 1$/ }).click();
  await bag.getByRole('button', { name: 'Equipar', exact: true }).click();
  await expect(bag.getByTestId('equipped-tool')).toContainText(
    'Machado de ferro',
  );
  await page.keyboard.press('Escape');

  await walk(page, 'y', 1040);
  await enterGrove(page, 656, 624);
  await gather('Cortar Carvalho', 'Madeira');
  await expect(action).toContainText('Muda');
  await page.screenshot({ path: 'work/bosque-muda.png' });
  await page.getByRole('button', { name: 'Sair da sala', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Começar jornada/ }).click();
  await page.getByRole('button', { name: /Entrar na vila/ }).click();
  await expect(action).toContainText(/Muda|Árvore jovem/);
  await expect(action).toBeDisabled();
  await expect(action).toContainText('Árvore jovem', { timeout: 65_000 });
  await page.screenshot({ path: 'work/bosque-jovem.png' });
  await expect(action).toContainText('Cortar Carvalho', { timeout: 65_000 });
  await action.click();
  await expect(page.getByRole('status')).toContainText('+3 Madeira');
  expect(errors).toEqual([]);
});
