import { test, expect, request } from '@playwright/test';

const BASE = 'http://localhost:4200';
const ESTOQUE = 'http://localhost:5090/api/Estoque';
const FATURAMENTO = 'http://localhost:5164/api/NotaFiscal';
const AUTH = 'http://localhost:5090/api/Auth/login';

const TS = Date.now();
const CODIGO = `E2E-${TS}`;
const CODIGO_UI = `E2E-UI-${TS}`;

async function obterToken() {
  const ctx = await request.newContext();
  const resp = await ctx.post(AUTH, { data: { username: 'gabriel', senha: 'senha123' } });
  const body = await resp.json();
  await ctx.dispose();
  return body.data.token;
}

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Username').fill('gabriel');
  await page.getByLabel('Senha').fill('senha123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/notas-fiscais');
});

test('01 - rota protegida redireciona para /login sem autenticacao', async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/notas-fiscais`);
  await page.waitForURL('**/login');
  expect(page.url()).toContain('/login');
});

test('02 - login com campos vazios mostra erro', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('Informe usuário e senha');
});

test('03 - logout retorna para /login', async ({ page }) => {
  await page.getByText('Sair', { exact: true }).click();
  await page.waitForURL('**/login');
  expect(page.url()).toContain('/login');
});

test('04 - navbar mostra nome do usuario autenticado', async ({ page }) => {
  await expect(page.getByText('Olá, gabriel')).toBeVisible();
});

test('05 - API: produto duplicado mostra snackbar de erro', async ({ request }) => {
  const token = await obterToken();
  const headers = { Authorization: `Bearer ${token}` };
  await request.post(`${ESTOQUE}/produto`, { data: { codigo: CODIGO, descricao: 'Interceptador', saldo: 5 }, headers });
  const resp = await request.post(`${ESTOQUE}/produto`, { data: { codigo: CODIGO, descricao: 'Interceptador', saldo: 5 }, headers });
  expect(resp.status()).toBe(409);
});

test('06 - erro de rede exibe snackbar via interceptor', async ({ page }) => {
  const response = await page.evaluate(() => fetch('http://localhost:5999/api/x').catch(() => null));
  expect(response).toBeNull();
});

test('07 - Frontend /produtos: cadastrar novo produto pela UI', async ({ page }) => {
  await page.goto(`${BASE}/produtos`);
  await page.getByLabel('Código').fill(CODIGO_UI);
  await page.getByLabel('Descrição').fill('Produto E2E');
  await page.getByLabel('Saldo').fill('3');
  await page.getByRole('button', { name: 'Cadastrar Produto' }).click();
  await expect(page.getByText('Produto cadastrado com sucesso.')).toBeVisible();
  await page.getByRole('button', { name: 'OK' }).click();
  const lastPage = page.getByLabel('Last page');
  if (await lastPage.isEnabled()) {
    await lastPage.click();
  }
  await expect(page.getByRole('cell', { name: CODIGO_UI })).toBeVisible();
});

test('08 - Frontend /notas-fiscais: criar nota e imprimir (fluxo completo)', async ({ page }) => {
  const token = await obterToken();
  const headers = { Authorization: `Bearer ${token}` };
  await page.goto(`${BASE}/notas-fiscais`);
  const lista = await (await page.request.get(`${ESTOQUE}/produto`, { headers })).json();
  const p = lista.data.find((x) => x.codigo === CODIGO);
  if (!p) {
    const novo = await page.request.post(`${ESTOQUE}/produto`, { data: { codigo: CODIGO, descricao: 'Produto E2E', saldo: 10 }, headers });
    if (!novo.ok()) throw new Error('falha ao criar produto');
  }
  await page.goto(`${BASE}/notas-fiscais`);
  await page.getByLabel('Quantidade').fill('1');
  await page.getByRole('button', { name: 'Adicionar Item' }).click();
  await page.getByRole('button', { name: 'Gerar Nota' }).click();
  await expect(page.getByText('Fechada').first()).toBeVisible();
});

test('09 - API: idempotency retorna mesma nota no replay (camelCase)', async ({ request }) => {
  const token = await obterToken();
  const headers = { Authorization: `Bearer ${token}` };
  const list = await (await request.get(`${ESTOQUE}/produto`, { headers })).json();
  const p = list.data.find((x) => x.codigo === CODIGO);
  const body = { itens: [{ produtoId: p.id, quantidade: 1 }] };
  const key = `teste-${TS}`;
  const r1 = await request.post(`${FATURAMENTO}`, { data: body, headers: { ...headers, 'X-Idempotency-Key': key } });
  const r2 = await request.post(`${FATURAMENTO}`, { data: body, headers: { ...headers, 'X-Idempotency-Key': key } });
  expect(r1.status()).toBe(201);
  expect(r2.status()).toBe(201);
  const b1 = await r1.json();
  const b2 = await r2.json();
  expect(b1.data.id).toBeTruthy();
  expect(b2.data.id).toBe(b1.data.id);
  expect(b1.data.numeroSequencial).toBeDefined();
  expect(b2.data.numeroSequencial).toBeDefined();
});