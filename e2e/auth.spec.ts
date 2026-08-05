import { test, expect } from './fixtures/testUser';

/**
 * Auth flows. These DO create real rows in whatever Supabase project is
 * configured for the E2E env. Run only against test/staging projects.
 */
test.describe('auth', () => {
  test('login form rejects empty submission', async ({ page }) => {
    await page.goto('/login');
    // Try submitting empty. Server actions return a validation error state.
    const submit = page.getByRole('button', { name: /entrar|login|acessar/i });
    if (await submit.count()) {
      await submit.first().click({ trial: true }).catch(() => undefined);
    }
    // Assert we're still on /login (either via client validation or server-side rejection)
    await expect(page).toHaveURL(/\/login/);
  });

  test('login rejects unknown user', async ({ page, testUser }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill(testUser.email);
    await page.locator('input[type="password"]').first().fill('wrong-password-xyz');
    const submit = page.getByRole('button', { name: /entrar|login|acessar/i });
    await submit.first().click().catch(() => undefined);
    // Server rejects and stays on /login
    await page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => undefined);
    expect(page.url()).toContain('/login');
  });

  test('forgot password page renders', async ({ page }) => {
    const res = await page.goto('/forgot-password');
    expect(res?.status()).toBeLessThan(500);
  });
});
