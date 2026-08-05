import { test, expect } from '@playwright/test';

test.describe('QC + entregas v2 smoke', () => {
  test('/qualidade redirects anonymous to /login', async ({ page }) => {
    await page.goto('/qualidade');
    expect(page.url()).toContain('/login');
  });

  test('/qualidade/templates redirects anonymous to /login', async ({ page }) => {
    await page.goto('/qualidade/templates');
    expect(page.url()).toContain('/login');
  });

  test('/entregas/romaneios redirects anonymous to /login', async ({ page }) => {
    await page.goto('/entregas/romaneios');
    expect(page.url()).toContain('/login');
  });

  test('/entregas/motoristas redirects anonymous to /login', async ({ page }) => {
    await page.goto('/entregas/motoristas');
    expect(page.url()).toContain('/login');
  });

  test('/entregas/rotas redirects anonymous to /login', async ({ page }) => {
    await page.goto('/entregas/rotas');
    expect(page.url()).toContain('/login');
  });
});
