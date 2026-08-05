import { test, expect } from '@playwright/test';

test.describe('planejamento module smoke', () => {
  test('/planejamento redirects anonymous to /login', async ({ page }) => {
    await page.goto('/planejamento');
    expect(page.url()).toContain('/login');
  });

  test('/planejamento/templates redirects anonymous to /login', async ({ page }) => {
    await page.goto('/planejamento/templates');
    expect(page.url()).toContain('/login');
  });

  test('/planejamento/templates/novo redirects anonymous to /login', async ({ page }) => {
    await page.goto('/planejamento/templates/novo');
    expect(page.url()).toContain('/login');
  });
});
