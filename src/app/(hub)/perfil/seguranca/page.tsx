import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TotpPanel } from './TotpPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Segurança · SR HUB' };

export default async function SegurancaPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: totp } = await supabase
    .from('user_totp_secrets')
    .select('verified_at, backup_codes')
    .eq('user_id', user.id)
    .maybeSingle<{ verified_at: string | null; backup_codes: string[] | null }>();

  const active = !!totp?.verified_at;
  const remainingCodes = totp?.backup_codes?.length ?? 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Conta</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Segurança</h1>
      </header>

      <section className="rounded-2xl border border-gold/15 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-white">Verificação em dois fatores (2FA)</div>
            <div className="mt-1 text-xs text-white/50">
              {active
                ? `Ativo · ${remainingCodes} código(s) de recuperação restante(s).`
                : 'Não configurado. Recomendado para admins.'}
            </div>
          </div>
          <span
            className={
              active
                ? 'rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-emerald-200'
                : 'rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/60'
            }
          >
            {active ? 'ativo' : 'inativo'}
          </span>
        </div>
        <div className="mt-4">
          <TotpPanel active={active} />
        </div>
      </section>
    </div>
  );
}
