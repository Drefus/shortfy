import { expect, test, type Page } from '@playwright/test';

/** Apelido único por teste: o servidor é compartilhado entre testes paralelos. */
function aliasUnico(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Destino local servido pelo próprio app em modo de teste (127.0.0.1 ≠ host do encurtador). */
function urlDeDestino(baseURL: string | undefined): string {
  return `http://127.0.0.1:${new URL(baseURL ?? '').port}/__test/destino`;
}

async function encurtar(page: Page, campos: { url: string; alias?: string }): Promise<void> {
  await page.goto('/');
  await page.getByLabel('URL de destino').fill(campos.url);
  if (campos.alias) {
    await page.getByLabel(/Apelido/).fill(campos.alias);
  }
  await page.getByRole('button', { name: 'Encurtar' }).click();
}

test.describe('encurtar links', () => {
  test('deve exibir o link curto ao encurtar uma URL válida', async ({ page, baseURL }) => {
    await encurtar(page, { url: 'github.com/microsoft/playwright' });

    const resultado = page.getByTestId('result');
    await expect(resultado).toBeVisible();
    await expect(resultado).toContainText('https://github.com/microsoft/playwright');
    await expect(page.getByTestId('short-url')).toHaveText(
      new RegExp(`^${baseURL}/[0-9A-Za-z]{7}$`),
    );
  });

  test('deve mostrar mensagem de erro ao tentar encurtar uma URL inválida', async ({ page }) => {
    await encurtar(page, { url: 'ftp://arquivos.exemplo.com' });

    await expect(page.getByTestId('error-url')).toHaveText(
      'A URL deve usar o protocolo http ou https.',
    );
    await expect(page.getByTestId('result')).toHaveCount(0);
  });

  test('deve mostrar erro de conflito ao reutilizar um apelido', async ({ page, baseURL }) => {
    const alias = aliasUnico('repetido');
    await encurtar(page, { url: urlDeDestino(baseURL), alias });
    await expect(page.getByTestId('short-url')).toHaveText(`${baseURL}/${alias}`);

    await encurtar(page, { url: 'https://example.com', alias });

    await expect(page.getByTestId('error-alias')).toHaveText(`O alias "${alias}" já está em uso.`);
  });

  test('deve copiar o link curto para a área de transferência', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const alias = aliasUnico('copiar');
    await encurtar(page, { url: urlDeDestino(baseURL), alias });

    await page.getByRole('button', { name: 'Copiar' }).click();

    await expect(page.getByRole('button', { name: 'Copiado!' })).toBeVisible();
    expect(await page.evaluate('navigator.clipboard.readText()')).toBe(`${baseURL}/${alias}`);
  });

  test('deve voltar ao estado inicial ao fechar o resultado', async ({ page }) => {
    await encurtar(page, { url: 'https://example.com' });
    await expect(page.getByTestId('result')).toBeVisible();

    await page.getByRole('link', { name: 'Fechar e criar outro link' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('result')).toHaveCount(0);
    await expect(page.getByLabel('URL de destino')).toHaveValue('');
  });
});

test.describe('links recentes', () => {
  test('deve listar os links apenas no navegador que os criou', async ({
    page,
    browser,
    baseURL,
  }) => {
    const alias = aliasUnico('meu');
    await encurtar(page, { url: urlDeDestino(baseURL), alias });
    await page.goto('/');
    await expect(page.getByTestId('recent-links')).toContainText(`${baseURL}/${alias}`);

    const outroNavegador = await browser.newContext();
    const outraPagina = await outroNavegador.newPage();
    await outraPagina.goto('/');

    await expect(outraPagina.getByText(`${baseURL}/${alias}`)).toHaveCount(0);
    await outroNavegador.close();
  });
});

test.describe('acessar links', () => {
  test('deve redirecionar o link curto para a URL original', async ({ page, baseURL }) => {
    const destino = urlDeDestino(baseURL);
    await encurtar(page, { url: destino, alias: aliasUnico('ir') });

    await page.getByTestId('short-url').click();

    await expect(page).toHaveURL(destino);
    await expect(page.getByRole('heading', { name: 'Página de destino' })).toBeVisible();
  });

  test('deve mostrar total 2 nas estatísticas após dois acessos', async ({ page, baseURL }) => {
    const alias = aliasUnico('stats');
    await encurtar(page, { url: urlDeDestino(baseURL), alias });

    await page.goto(`/${alias}`);
    await page.goto(`/${alias}`);
    await page.goto(`/stats/${alias}`);

    await expect(page.getByRole('heading', { name: `Estatísticas de /${alias}` })).toBeVisible();
    await expect(page.getByTestId('total-clicks')).toHaveText('2');
  });

  test('deve exibir a página 404 para um código inexistente', async ({ page }) => {
    const response = await page.goto(`/${aliasUnico('naoexiste')}`);

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Link não encontrado' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Criar um novo link' })).toBeVisible();
  });
});
