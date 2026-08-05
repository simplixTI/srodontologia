import { test, expect } from '@playwright/test';

/**
 * Route guards — verifies middleware sends anonymous users to /login for
 * every protected prefix. Cross-role redirects require seeded users and
 * are covered in `docs/e2e-testing.md` as manual/pending.
 */
const PROTECTED_PATHS = [
  '/dashboard',
  '/casos',
  '/leads',
  '/dentistas',
  '/clinicas',
  '/checklists',
  '/audit',
  '/portal',
  '/portal/casos',
  '/super-admin',
  '/super-admin/tenants',
  '/billing',
  '/onboarding',
  '/branding',
  '/dominios',
  '/equipe',
  '/lgpd',
  '/perfil/seguranca'
];

test.describe('route guards', () => {
  for (const path of PROTECTED_PATHS) {
    test(`anonymous ${path} → /login`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => undefined);
      expect(page.url()).toContain('/login');
    });
  }

  test('public paths do not require auth', async ({ page }) => {
    for (const p of ['/', '/login', '/forgot-password', '/signup']) {
      const res = await page.goto(p);
      expect(res?.status()).toBeLessThan(500);
      expect(page.url()).not.toContain('/login?next=');
    }
  });
});
