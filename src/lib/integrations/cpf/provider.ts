import 'server-only';
import { createHash } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loadIntegration, readIntegrationSecret } from '../config';

export type CpfLookupResult = {
  status: 'ok' | 'not_found' | 'invalid' | 'error';
  fullName?: string | null;
  birthDate?: string | null;    // ISO YYYY-MM-DD
  gender?: 'M' | 'F' | 'X' | null;
  motherName?: string | null;
  provider: string;
  cached?: boolean;
};

/**
 * Provider-agnostic CPF lookup with 30-day cache in Postgres.
 * The raw CPF is NEVER stored — cache key is sha256(cpf).
 *
 * Validates format + check digits before hitting any external API.
 * Returns { status:'invalid' } if the CPF fails checksum.
 */
export async function lookupCpf(
  organizationId: string,
  rawCpf: string
): Promise<CpfLookupResult> {
  const cpf = onlyDigits(rawCpf);
  if (!isValidCpf(cpf)) return { status: 'invalid', provider: 'validator' };

  const key = hashCpf(cpf);
  const cached = await readCache(key);
  if (cached) return { ...cached, cached: true };

  const integration = await loadIntegration(organizationId, 'cpf_provider');
  if (!integration || !integration.enabled) {
    // No provider configured — return not_found so caller can prompt for manual entry
    return { status: 'not_found', provider: 'mock' };
  }
  const secret = readIntegrationSecret(integration);
  const result = await callExternal(integration.provider, secret, cpf, integration.config);
  await writeCache(key, result);
  return result;
}

function onlyDigits(v: string): string {
  return (v ?? '').replace(/\D/g, '');
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split('').map(Number);
  for (const factor of [10, 11]) {
    const acc = digits.slice(0, factor - 1).reduce((s, d, i) => s + d * (factor - i), 0);
    const check = ((acc * 10) % 11) % 10;
    if (check !== digits[factor - 1]) return false;
  }
  return true;
}

function hashCpf(cpf: string): string {
  return createHash('sha256').update(cpf).digest('hex');
}

async function readCache(key: string): Promise<CpfLookupResult | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('cpf_lookup_cache')
    .select('full_name, birth_date, gender, mother_name, status, provider, expires_at')
    .eq('cpf_hash', key)
    .maybeSingle();
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return {
    status: data.status as CpfLookupResult['status'],
    fullName: data.full_name,
    birthDate: data.birth_date,
    gender: (data.gender as CpfLookupResult['gender']) ?? null,
    motherName: data.mother_name,
    provider: data.provider
  };
}

async function writeCache(key: string, result: CpfLookupResult): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from('cpf_lookup_cache').upsert({
    cpf_hash: key,
    full_name: result.fullName ?? null,
    birth_date: result.birthDate ?? null,
    gender: result.gender ?? null,
    mother_name: result.motherName ?? null,
    status: result.status,
    provider: result.provider
  });
}

async function callExternal(
  provider: string,
  secret: string | null,
  cpf: string,
  cfg: Record<string, unknown>
): Promise<CpfLookupResult> {
  try {
    if (!secret) throw new Error('CPF provider missing secret');
    const baseUrl = (cfg?.base_url as string) ?? '';
    if (!baseUrl) throw new Error('CPF provider missing base_url in config');

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/consulta/cpf/${cpf}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(6000)
    });
    if (res.status === 404) return { status: 'not_found', provider };
    if (!res.ok) return { status: 'error', provider };
    const data = (await res.json()) as {
      nome?: string;
      dataNascimento?: string;
      sexo?: string;
      nomeMae?: string;
    };
    return {
      status: 'ok',
      fullName: data.nome ?? null,
      birthDate: data.dataNascimento ?? null,
      gender: normalizeGender(data.sexo),
      motherName: data.nomeMae ?? null,
      provider
    };
  } catch {
    return { status: 'error', provider };
  }
}

function normalizeGender(s?: string): 'M' | 'F' | 'X' | null {
  if (!s) return null;
  const u = s.toUpperCase();
  if (u === 'M' || u === 'MASCULINO') return 'M';
  if (u === 'F' || u === 'FEMININO') return 'F';
  return 'X';
}
