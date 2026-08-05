import { test, expect } from '@playwright/test';

test.describe('financeiro v2 smoke', () => {
  test('/financeiro redirects anonymous to /login', async ({ page }) => {
    await page.goto('/financeiro');
    expect(page.url()).toContain('/login');
  });

  test('/financeiro/pagar redirects anonymous to /login', async ({ page }) => {
    await page.goto('/financeiro/pagar');
    expect(page.url()).toContain('/login');
  });

  test('/financeiro/comissoes redirects anonymous to /login', async ({ page }) => {
    await page.goto('/financeiro/comissoes');
    expect(page.url()).toContain('/login');
  });

  test('/financeiro/categorias redirects anonymous to /login', async ({ page }) => {
    await page.goto('/financeiro/categorias');
    expect(page.url()).toContain('/login');
  });

  test('/financeiro/dre redirects anonymous to /login', async ({ page }) => {
    await page.goto('/financeiro/dre');
    expect(page.url()).toContain('/login');
  });
});
