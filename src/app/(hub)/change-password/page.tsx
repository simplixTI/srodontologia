import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ChangePasswordForm } from './ChangePasswordForm';

export const metadata: Metadata = {
  title: 'Alterar senha · SR HUB',
  robots: { index: false, follow: false }
};

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? '';

  let forced = false;
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('must_change_password')
      .eq('id', data.user.id)
      .maybeSingle<{ must_change_password: boolean }>();
    forced = !!profile?.must_change_password;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-6 py-14 md:px-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            {forced ? 'Primeiro acesso' : 'Segurança'}
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-4xl leading-tight text-white">
          Alterar <span className="gold-text italic">senha.</span>
        </h1>
        <p className="text-sm text-white/60">
          {forced
            ? 'Por segurança, defina uma nova senha antes de acessar o SR HUB.'
            : 'Atualize sua senha periodicamente. Escolha uma senha forte e única.'}
        </p>
      </header>

      <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-8">
        <div className="mb-6 text-[0.55rem] uppercase tracking-[0.35em] text-white/40">
          {email}
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
