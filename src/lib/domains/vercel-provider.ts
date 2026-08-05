import 'server-only';
import { logger } from '@/lib/observability/logger';

/**
 * Vercel Domains API adapter.
 *
 * Wraps the subset of endpoints we need to attach a tenant's custom domain
 * to our Vercel project + inspect its DNS/SSL readiness.
 *
 * Every method returns `{ ok, ... } | { ok: false; error, code? }`. When
 * `VERCEL_API_TOKEN` is not set, methods short-circuit with `ok: false`
 * and `code: 'unconfigured'` — callers treat this as a pending external
 * configuration, not a bug.
 *
 * Secrets stay server-side: token, project id, team id never leave here.
 */
const API_BASE = 'https://api.vercel.com';
const TIMEOUT_MS = 10_000;

export type DomainRecord = {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: Array<{ type: string; domain: string; value: string; reason: string }>;
  createdAt?: number;
};

export type DomainConfiguration = {
  configuredBy: 'CNAME' | 'A' | 'http' | null;
  acceptedChallenges?: string[];
  misconfigured: boolean;
};

export type SslStatus = { pending: boolean; issued: boolean };

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

function config(): { token: string; projectId: string; teamId?: string } | null {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID };
}

function withTeam(url: string, teamId?: string): string {
  if (!teamId) return url;
  return url + (url.includes('?') ? '&' : '?') + `teamId=${encodeURIComponent(teamId)}`;
}

async function call<T>(
  path: string,
  init: RequestInit = {}
): Promise<Result<T>> {
  const c = config();
  if (!c) return { ok: false, error: 'VERCEL_API_TOKEN / VERCEL_PROJECT_ID not configured', code: 'unconfigured' };

  const url = withTeam(`${API_BASE}${path}`, c.teamId);
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${c.token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {})
      },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (res.status === 204) return { ok: true, data: undefined as T };
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const errBody = body?.error as { message?: string; code?: string } | undefined;
      return {
        ok: false,
        error: errBody?.message ?? `vercel_http_${res.status}`,
        code: errBody?.code ?? `http_${res.status}`
      };
    }
    return { ok: true, data: body as T };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network_error';
    logger.warn('vercel API call failed', { path, err: msg });
    return { ok: false, error: msg, code: 'network' };
  }
}

/** Attach a domain to our project. Idempotent — Vercel returns 409 if it already exists. */
export async function addDomain(hostname: string): Promise<Result<DomainRecord>> {
  const c = config();
  if (!c) return { ok: false, error: 'unconfigured', code: 'unconfigured' };
  const res = await call<DomainRecord>(`/v10/projects/${c.projectId}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: hostname })
  });
  if (!res.ok && res.code === 'http_409') {
    // Already attached — read current state and return it as ok
    return getDomain(hostname);
  }
  return res;
}

/** Get the current attachment record for a hostname. */
export async function getDomain(hostname: string): Promise<Result<DomainRecord>> {
  const c = config();
  if (!c) return { ok: false, error: 'unconfigured', code: 'unconfigured' };
  return call<DomainRecord>(`/v9/projects/${c.projectId}/domains/${encodeURIComponent(hostname)}`);
}

/** Ask Vercel to run its own verification (DNS TXT + provider readiness). */
export async function verifyDomain(hostname: string): Promise<Result<DomainRecord>> {
  const c = config();
  if (!c) return { ok: false, error: 'unconfigured', code: 'unconfigured' };
  return call<DomainRecord>(`/v9/projects/${c.projectId}/domains/${encodeURIComponent(hostname)}/verify`, {
    method: 'POST'
  });
}

/** Remove the domain from our project. Does not delete the tenant record. */
export async function removeDomain(hostname: string): Promise<Result<void>> {
  const c = config();
  if (!c) return { ok: false, error: 'unconfigured', code: 'unconfigured' };
  return call<void>(`/v9/projects/${c.projectId}/domains/${encodeURIComponent(hostname)}`, {
    method: 'DELETE'
  });
}

/** Get the DNS/CNAME configuration status Vercel sees. */
export async function getConfiguration(hostname: string): Promise<Result<DomainConfiguration>> {
  return call<DomainConfiguration>(`/v6/domains/${encodeURIComponent(hostname)}/config`);
}

/**
 * Coarse SSL readiness. Vercel doesn't expose a dedicated endpoint; we
 * infer from the domain record — `verified: true` + no verification challenge
 * pending means SSL cert has been issued.
 */
export async function checkSSLStatus(hostname: string): Promise<Result<SslStatus>> {
  const r = await getDomain(hostname);
  if (!r.ok) return r;
  const challengeOpen = Array.isArray(r.data.verification) && r.data.verification.length > 0;
  return { ok: true, data: { pending: !r.data.verified || challengeOpen, issued: r.data.verified && !challengeOpen } };
}

/** True when the provider is configured — used by callers to decide if a state transition is possible. */
export function isVercelConfigured(): boolean {
  return config() !== null;
}
