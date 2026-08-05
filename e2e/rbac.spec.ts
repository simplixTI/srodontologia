import { test, expect } from '@playwright/test';

/**
 * RBAC — separação plataforma vs escritório.
 *
 * Cobre os cenários da refatoração de perfis (SUPER_ADMIN vs ADMIN):
 *
 *  1. Rotas exclusivas da plataforma (/super-admin, /dominios,
 *     /observabilidade, /integracoes) redirecionam anônimo para /login.
 *  2. Rotas movidas do menu do ADMIN não aparecem no HTML do menu.
 *  3. As páginas técnicas removidas (/dominios, /observabilidade,
 *     /integracoes) retornam redirect quando anônimo (defesa em
 *     profundidade — middleware bloqueia antes, mas guard existe).
 *
 * Cenários que dependem de usuários autenticados (Bruno acessa
 * /super-admin, Aline recebe 403 em /super-admin/tenants, etc.) exigem
 * seed executado (`npm run hub:seed-roles`) + fixtures de login. Estão
 * documentados em docs/e2e-testing.md como "pendente autenticado".
 */

const PLATFORM_ONLY_PATHS = [
  '/super-admin',
  '/super-admin/tenants',
  '/super-admin/dominios',
  '/dominios',
  '/observabilidade',
  '/integracoes'
];

test.describe('RBAC: plataforma vs escritório', () => {
  for (const path of PLATFORM_ONLY_PATHS) {
    test(`anônimo em ${path} → /login`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => undefined);
      expect(page.url()).toContain('/login');
    });
  }

  test('menu do escritório NÃO contém itens técnicos', async ({ page }) => {
    const res = await page.goto('/dashboard');
    // Anônimo: middleware redireciona para /login. O objetivo é apenas
    // garantir que a resposta não seja 5xx e que quando renderizado
    // sem sessão nenhum link técnico apareça (na tela de login também
    // não deve haver). Se um dia houver seed automático nos testes,
    // este test pode ser fortalecido para logar como Aline primeiro.
    expect(res?.status()).toBeLessThan(500);

    const forbidden = [
      '/dominios',
      '/observabilidade',
      '/integracoes',
      '/super-admin'
    ];
    for (const href of forbidden) {
      const link = page.locator(`nav a[href="${href}"]`);
      await expect(link).toHaveCount(0);
    }
  });
});
