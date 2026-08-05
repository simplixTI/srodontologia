import { test, expect } from '@playwright/test';

/**
 * Smoke tests — validate the app is minimally serving.
 * Runs after every staging deploy. Failing here blocks promotion.
 *
 * These tests never mutate data.
 */
test.describe('smoke', () => {
  test('liveness returns healthy JSON', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe('sr-digital');
  });

  test('readiness reports check results', async ({ request }) => {
    const res = await request.get('/api/health/ready');
    // May be 503 in dev without DB — accept both 200 and 503
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('checks');
    expect(body.checks).toHaveProperty('db');
  });

  test('public home renders', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(500);
  });

  test('login page renders with form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
  });

  test('signup page renders', async ({ page }) => {
    const res = await page.goto('/signup');
    // Signup may redirect authenticated users; accept redirect
    expect(res?.status()).toBeLessThan(500);
  });

  test('super admin is blocked for anonymous', async ({ page }) => {
    const res = await page.goto('/super-admin');
    // Middleware redirects to /login for anonymous
    expect(page.url()).toContain('/login');
    void res;
  });
});
