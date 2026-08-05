import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Tests the Vercel Domains adapter without ever hitting the real API.
 * We mock global.fetch and verify: (a) unconfigured path short-circuits,
 * (b) 409 on addDomain falls through to getDomain, (c) checkSSLStatus
 * infers issued/pending from the domain record.
 */
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

let calls: Array<{ url: string; method: string }> = [];

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    calls.push({ url, method: (init?.method ?? 'GET').toUpperCase() });
    return handler(url, init);
  }) as typeof fetch;
}

function makeJson(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init
  });
}

beforeEach(() => {
  calls = [];
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
});

describe('vercel-provider · unconfigured mode', () => {
  it('addDomain returns ok:false with code=unconfigured when no token', async () => {
    delete process.env.VERCEL_API_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;
    const mod = await import('../src/lib/domains/vercel-provider');
    const r = await mod.addDomain('lab.example.com');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('unconfigured');
    expect(calls).toHaveLength(0);
  });

  it('isVercelConfigured reflects env state', async () => {
    delete process.env.VERCEL_API_TOKEN;
    const mod = await import('../src/lib/domains/vercel-provider');
    expect(mod.isVercelConfigured()).toBe(false);
    process.env.VERCEL_API_TOKEN = 'tok';
    process.env.VERCEL_PROJECT_ID = 'prj_123';
    expect(mod.isVercelConfigured()).toBe(true);
  });
});

describe('vercel-provider · addDomain', () => {
  beforeEach(() => {
    process.env.VERCEL_API_TOKEN = 'tok_test';
    process.env.VERCEL_PROJECT_ID = 'prj_test';
  });

  it('POSTs to /v10/projects/:id/domains with hostname', async () => {
    mockFetch(async () =>
      makeJson({ name: 'lab.example.com', apexName: 'example.com', projectId: 'prj_test', verified: false })
    );
    const mod = await import('../src/lib/domains/vercel-provider');
    const r = await mod.addDomain('lab.example.com');
    expect(r.ok).toBe(true);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toContain('/v10/projects/prj_test/domains');
  });

  it('on 409 (already attached) reads current state via getDomain', async () => {
    let n = 0;
    mockFetch(async () => {
      n++;
      if (n === 1) return makeJson({ error: { message: 'exists', code: 'http_409' } }, { status: 409 });
      return makeJson({ name: 'lab.example.com', apexName: 'example.com', projectId: 'prj_test', verified: true });
    });
    const mod = await import('../src/lib/domains/vercel-provider');
    const r = await mod.addDomain('lab.example.com');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.verified).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toContain('/v9/projects/prj_test/domains/lab.example.com');
  });

  it('appends teamId when VERCEL_TEAM_ID is set', async () => {
    process.env.VERCEL_TEAM_ID = 'team_abc';
    mockFetch(async () => makeJson({ name: 'x.com', apexName: 'x.com', projectId: 'prj_test', verified: false }));
    const mod = await import('../src/lib/domains/vercel-provider');
    await mod.addDomain('x.com');
    expect(calls[0].url).toContain('teamId=team_abc');
  });
});

describe('vercel-provider · checkSSLStatus', () => {
  beforeEach(() => {
    process.env.VERCEL_API_TOKEN = 'tok_test';
    process.env.VERCEL_PROJECT_ID = 'prj_test';
  });

  it('issued when verified=true and no verification challenge', async () => {
    mockFetch(async () => makeJson({ name: 'x.com', apexName: 'x.com', projectId: 'prj_test', verified: true }));
    const mod = await import('../src/lib/domains/vercel-provider');
    const r = await mod.checkSSLStatus('x.com');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ pending: false, issued: true });
  });

  it('pending when verified=false', async () => {
    mockFetch(async () => makeJson({ name: 'x.com', apexName: 'x.com', projectId: 'prj_test', verified: false }));
    const mod = await import('../src/lib/domains/vercel-provider');
    const r = await mod.checkSSLStatus('x.com');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ pending: true, issued: false });
  });

  it('pending when verification challenge is open', async () => {
    mockFetch(async () =>
      makeJson({
        name: 'x.com',
        apexName: 'x.com',
        projectId: 'prj_test',
        verified: true,
        verification: [{ type: 'TXT', domain: '_vercel.x.com', value: 'abc', reason: 'pending' }]
      })
    );
    const mod = await import('../src/lib/domains/vercel-provider');
    const r = await mod.checkSSLStatus('x.com');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.pending).toBe(true);
  });
});
