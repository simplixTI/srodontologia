import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

/**
 * Exploratory session. Walks a fresh tenant through the hub routes.
 *
 * Creates real rows in the configured Supabase project. Every artifact
 * is written under test-results/exploratory/ and a summary JSON with
 * the fake tenant identifiers is dropped for post-run cleanup.
 *
 * Single-test structure so browser context (cookies, auth) persists
 * across steps.
 */

const HUB_ROUTES = [
  '/dashboard',
  '/clinicas',
  '/dentistas',
  '/casos',
  '/leads',
  '/checklists',
  '/branding',
  '/equipe',
  '/lgpd',
  '/audit',
  '/observabilidade',
  '/configuracoes/importacoes',
  '/integracoes',
  '/suporte',
  '/dominios',
  '/perfil/seguranca',
  '/billing',
  '/onboarding'
] as const;

const OUT_DIR = path.join(process.cwd(), 'test-results', 'exploratory');

type RouteResult = {
  route: string;
  status: number;
  finalUrl: string;
  redirected: boolean;
  authenticated: boolean;
  errors: string[];
};

const IDENTITY_ID = randomBytes(4).toString('hex');
const IDENTITY = {
  email: `e2e+${IDENTITY_ID}@srdigital.local`,
  password: 'e2e-Strong-Pass-1!',
  fullName: `E2E Tester ${IDENTITY_ID}`,
  companyName: `Lab E2E ${IDENTITY_ID}`,
  slug: `lab-e2e-${IDENTITY_ID}`,
  document: `99${parseInt(IDENTITY_ID, 16).toString().padStart(12, '0').slice(0, 12)}`
};

test.describe('exploratory · fresh tenant journey', () => {
  test.setTimeout(300_000);

  test('signup → login → walk hub routes', async ({ page }) => {
    mkdirSync(OUT_DIR, { recursive: true });

    const summary = {
      identity: IDENTITY,
      startedAt: new Date().toISOString(),
      completedAt: '' as string,
      signupOk: false,
      loginOk: false,
      routeResults: [] as RouteResult[]
    };

    // ─── 1. signup ─────────────────────────────────────────────
    await test.step('signup form', async () => {
      await page.goto('/signup');
      await expect(page.locator('input[name="company_name"]')).toBeVisible();

      await page.fill('input[name="company_name"]', IDENTITY.companyName);
      await page.fill('input[name="slug"]', IDENTITY.slug);
      await page.fill('input[name="document"]', IDENTITY.document);
      await page.fill('input[name="full_name"]', IDENTITY.fullName);
      await page.fill('input[name="email"]', IDENTITY.email);
      await page.fill('input[name="password"]', IDENTITY.password);

      await page.screenshot({ path: path.join(OUT_DIR, '01-signup-filled.png'), fullPage: true });

      await Promise.all([
        page.waitForURL(/\/login/, { timeout: 30_000 }),
        page.getByRole('button', { name: /começar|criar|cadastrar/i }).first().click()
      ]);

      await page.screenshot({ path: path.join(OUT_DIR, '02-signup-success.png'), fullPage: true });
      expect(page.url()).toMatch(/\/login/);
      summary.signupOk = true;
    });

    // ─── 2. login ──────────────────────────────────────────────
    await test.step('login', async () => {
      await page.locator('input[type="email"]').first().fill(IDENTITY.email);
      await page.locator('input[type="password"]').first().fill(IDENTITY.password);

      await page.screenshot({ path: path.join(OUT_DIR, '03-login-filled.png'), fullPage: true });

      await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
      await page.waitForURL((url) => !/\/login/.test(url.pathname), { timeout: 30_000 });

      await page.screenshot({ path: path.join(OUT_DIR, '04-post-login.png'), fullPage: true });
      expect(page.url()).not.toMatch(/\/login/);
      summary.loginOk = true;
    });

    // ─── 3. walk each hub route in the SAME context ────────────
    for (const route of HUB_ROUTES) {
      await test.step(`visit ${route}`, async () => {
        const consoleErrors: string[] = [];
        const onPageError = (err: Error) => consoleErrors.push(`pageerror: ${err.message.slice(0, 200)}`);
        const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
          if (msg.type() === 'error') consoleErrors.push(`console: ${msg.text().slice(0, 200)}`);
        };
        page.on('pageerror', onPageError);
        page.on('console', onConsole);

        const res = await page.goto(route, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => null);
        const status = res?.status() ?? 0;
        const finalUrl = page.url();
        const finalPath = new URL(finalUrl).pathname;
        const authenticated = !/\/login/.test(finalPath);
        const redirected = finalPath !== route;

        const safeName = route.replace(/\W+/g, '_').replace(/^_|_$/g, '');
        await page.screenshot({ path: path.join(OUT_DIR, `route-${safeName}.png`), fullPage: true }).catch(() => undefined);

        summary.routeResults.push({ route, status, finalUrl, redirected, authenticated, errors: consoleErrors });

        page.off('pageerror', onPageError);
        page.off('console', onConsole);
      });
    }

    // ─── 4. write summary ──────────────────────────────────────
    summary.completedAt = new Date().toISOString();
    writeFileSync(path.join(OUT_DIR, 'created.json'), JSON.stringify(summary, null, 2));

    console.log('\n[exploratory] fake tenant summary:');
    console.log(`  email:    ${IDENTITY.email}`);
    console.log(`  slug:     ${IDENTITY.slug}`);
    console.log(`  document: ${IDENTITY.document}`);
    console.log(`  routes:   ${summary.routeResults.length}`);
    console.log('\n[exploratory] route health:');
    for (const r of summary.routeResults) {
      const flag = r.status >= 400 ? '✗' : !r.authenticated ? '⚠ AUTH' : r.errors.length ? '⚠ ERR' : '✓';
      console.log(`  ${flag}  ${String(r.status).padStart(3)}  ${r.route.padEnd(30)} → ${r.finalUrl}${r.errors.length ? ` (${r.errors.length} err)` : ''}`);
    }
  });
});
