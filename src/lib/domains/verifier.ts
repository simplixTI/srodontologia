import 'server-only';
import { promises as dns } from 'dns';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * DNS verifier for tenant custom domains.
 *
 * Checks a TXT record at `_sr-verify.<hostname>` for the token issued at
 * domain creation. SSL provisioning is outside this scope — done by the
 * hosting platform (Vercel Domains API, ACME).
 */
export async function verifyDomain(domainId: string): Promise<{
  status: 'verified' | 'failed';
  error?: string;
}> {
  const admin = createSupabaseAdminClient();
  const { data: domain } = await admin
    .from('tenant_domains')
    .select('id, hostname, verification_token, status')
    .eq('id', domainId)
    .maybeSingle<{
      id: string;
      hostname: string;
      verification_token: string;
      status: string;
    }>();
  if (!domain) throw new Error('domain not found');
  if (domain.status === 'active' || domain.status === 'verified') {
    return { status: 'verified' };
  }

  const lookupName = `_sr-verify.${domain.hostname}`;
  let records: string[][] = [];
  try {
    records = await dns.resolveTxt(lookupName);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'dns lookup failed';
    await admin.from('tenant_domains').update({
      status: 'awaiting_dns',
      last_check_at: new Date().toISOString(),
      check_error: errMsg
    }).eq('id', domainId);
    return { status: 'failed', error: errMsg };
  }

  const flat = records.flat().map((s) => s.trim());
  if (flat.includes(domain.verification_token)) {
    await admin.from('tenant_domains').update({
      status: 'verified',
      verified_at: new Date().toISOString(),
      last_check_at: new Date().toISOString(),
      check_error: null
    }).eq('id', domainId);
    return { status: 'verified' };
  }

  await admin.from('tenant_domains').update({
    status: 'verifying',
    last_check_at: new Date().toISOString(),
    check_error: 'token_not_found'
  }).eq('id', domainId);
  return { status: 'failed', error: 'token_not_found' };
}
