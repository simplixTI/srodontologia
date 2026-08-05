import { test, expect } from '@playwright/test';

/**
 * Smoke tests for Fase 10A — Produção + Técnicos.
 * Anonymous users should be redirected to /login by middleware.
 */
test.describe('production module smoke', () => {
  test('/producao redirects anonymous to /login', async ({ page }) => {
    await page.goto('/producao');
    expect(page.url()).toContain('/login');
  });

  test('/producao/configurar redirects anonymous to /login', async ({ page }) => {
    await page.goto('/producao/configurar');
    expect(page.url()).toContain('/login');
  });

  test('/tecnicos redirects anonymous to /login', async ({ page }) => {
    await page.goto('/tecnicos');
    expect(page.url()).toContain('/login');
  });

  test('/tecnicos/novo redirects anonymous to /login', async ({ page }) => {
    await page.goto('/tecnicos/novo');
    expect(page.url()).toContain('/login');
  });
});
