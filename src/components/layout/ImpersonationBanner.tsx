import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { stopImpersonationAction } from '@/features/impersonation/actions';
import { readImpersonationCookie } from '@/lib/impersonation/cookie';

/**
 * Yellow banner shown at the top of any authenticated layout when the caller
 * is impersonating a tenant. Non-dismissible; ends session via server action.
 */
export async function ImpersonationBanner() {
  const cookie = readImpersonationCookie();
  if (!cookie) return null;

  const admin = createSupabaseAdminClient();
  const { data: session } = await admin
    .from('impersonation_sessions')
    .select('id, target_org_id, reason, started_at, ended_at, organization:organizations!target_org_id(name)')
    .eq('id', cookie.id)
    .maybeSingle();

  const s = session as unknown as {
    id: string;
    target_org_id: string;
    reason: string;
    started_at: string;
    ended_at: string | null;
    organization: { name: string } | null;
  } | null;

  if (!s || s.ended_at) return null;

  return (
    <div className="sticky top-0 z-50 border-b border-yellow-400/40 bg-yellow-500/20 px-4 py-2 text-xs text-yellow-100 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="min-w-0">
          <strong className="uppercase tracking-[0.28em]">IMPERSONANDO</strong>{' '}
          <span className="truncate">{s.organization?.name ?? s.target_org_id}</span>
          <span className="ml-2 text-yellow-200/70">· motivo: {s.reason}</span>
        </div>
        <form action={stopImpersonationAction}>
          <button
            type="submit"
            className="rounded-full border border-yellow-400/50 bg-yellow-500/20 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-yellow-50 hover:border-yellow-400/80"
          >
            Encerrar sessão
          </button>
        </form>
      </div>
    </div>
  );
}
