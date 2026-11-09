import { test, expect } from '@playwright/test';
test('two independent browsers create, join, leave and restore a persistent character', async ({
  browser,
}) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pa = await a.newPage();
  const pb = await b.newPage();
  const firstName = 'Iris ' + Date.now().toString().slice(-8);
  const secondName = 'Nilo ' + Date.now().toString().slice(-8);
  const errors: string[] = [];
  pa.on('pageerror', (e) => errors.push(e.message));
  pb.on('pageerror', (e) => errors.push(e.message));
  try {
    for (const [page, name] of [
      [pa, firstName],
      [pb, secondName],
    ] as const) {
      await page.goto('/');
      await expect(page.locator('canvas')).toBeVisible();
      await expect(page.getByTestId('database-status')).toContainText(
        'Disponível',
      );
      await page.getByRole('button', { name: /Começar jornada/ }).click();
      await page.getByLabel('Nome do personagem').fill(name);
      await page.getByRole('button', { name: /Criar personagem/ }).click();
      await expect(
        page.getByRole('heading', { name: `Bem-vindo, ${name}` }),
      ).toBeVisible();
      await page.getByRole('button', { name: /Entrar na vila/ }).click();
      await expect(page.getByTestId('connection-status')).toContainText(
        'Conectado',
      );
    }

    const coordinates = () => pa.getByTestId('world-position').innerText();
    const beforeMove = await coordinates();
    const observed = pb
      .getByTestId('nearby-players')
      .getByText(firstName, { exact: true });
    await expect(observed).toBeVisible();
    const remoteX = await observed.getAttribute('data-x');
    await pa.keyboard.down('d');
    await expect.poll(coordinates).not.toBe(beforeMove);
    await expect.poll(() => observed.getAttribute('data-x')).not.toBe(remoteX);
    await pa.keyboard.up('d');
    await expect(pa.getByTestId('world-position')).toContainText('Parado');
    await pa.screenshot({
      path: 'work/foundation-desktop.png',
      fullPage: true,
    });
    await pa.getByRole('button', { name: /Sair da sala/ }).click();
    await pa.waitForTimeout(250);
    const afterLeave = await coordinates();
    await pa.keyboard.down('d');
    await pa.waitForTimeout(350);
    await pa.keyboard.up('d');
    expect(await coordinates()).toBe(afterLeave);
    await expect(observed).toHaveCount(0);
    await pa.reload();
    await pa.getByRole('button', { name: /Começar jornada/ }).click();
    await expect(
      pa.getByRole('heading', { name: `Bem-vindo, ${firstName}` }),
    ).toBeVisible();
    await pa.setViewportSize({ width: 1024, height: 768 });
    await expect(pa.locator('canvas')).toBeVisible();
    expect(
      await pa.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await pa.screenshot({ path: 'work/foundation-1024.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});
