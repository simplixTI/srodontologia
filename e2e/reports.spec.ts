import { test, expect } from '@playwright/test';

test.describe('relatórios smoke', () => {
  test('/relatorios redirects anonymous to /login', async ({ page }) => {
    await page.goto('/relatorios');
    expect(page.url()).toContain('/login');
  });

  test('/relatorios/cases_by_status redirects anonymous to /login', async ({ page }) => {
    await page.goto('/relatorios/cases_by_status');
    expect(page.url()).toContain('/login');
  });
});
