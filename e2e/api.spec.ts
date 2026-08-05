import { test, expect } from '@playwright/test';

/**
 * Public API v1 contract — validates auth rejection + basic shape.
 * Positive path requires a real API key (created via /hub/integracoes/api)
 * and is covered by a separate test with fixture-provided keys.
 */
test.describe('api v1', () => {
  test('rejects missing bearer', async ({ request }) => {
    const res = await request.get('/api/v1/cases');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('rejects malformed token', async ({ request }) => {
    const res = await request.get('/api/v1/cases', {
      headers: { Authorization: 'Bearer not_a_real_token_format' }
    });
    expect(res.status()).toBe(401);
  });

  test('rejects unknown but well-formed token', async ({ request }) => {
    // Short token matches our internal `sk_[a-z]+_[A-Za-z0-9]+` regex but is
    // deliberately below any real API key format length to avoid secret scanners.
    const res = await request.get('/api/v1/cases', {
      headers: { Authorization: 'Bearer sk_test_fake' }
    });
    expect(res.status()).toBe(401);
  });

  test('openapi spec is served', async ({ request }) => {
    const res = await request.get('/api/v1/openapi');
    expect(res.status()).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.paths).toHaveProperty('/cases');
  });

  test('cron requires bearer', async ({ request }) => {
    const res = await request.get('/api/cron');
    expect(res.status()).toBe(401);
  });
});
