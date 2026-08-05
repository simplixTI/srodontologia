import { test, expect } from '@playwright/test';

test.describe('agenda + DAM smoke', () => {
  test('/agenda redirects anonymous to /login', async ({ page }) => {
    await page.goto('/agenda');
    expect(page.url()).toContain('/login');
  });

  test('/agenda/novo redirects anonymous to /login', async ({ page }) => {
    await page.goto('/agenda/novo');
    expect(page.url()).toContain('/login');
  });

  test('/arquivos redirects anonymous to /login', async ({ page }) => {
    await page.goto('/arquivos');
    expect(page.url()).toContain('/login');
  });

  test('/arquivos/tags redirects anonymous to /login', async ({ page }) => {
    await page.goto('/arquivos/tags');
    expect(page.url()).toContain('/login');
  });

  test('/arquivos/colecoes redirects anonymous to /login', async ({ page }) => {
    await page.goto('/arquivos/colecoes');
    expect(page.url()).toContain('/login');
  });

  test('/arquivos/favoritos redirects anonymous to /login', async ({ page }) => {
    await page.goto('/arquivos/favoritos');
    expect(page.url()).toContain('/login');
  });
});
