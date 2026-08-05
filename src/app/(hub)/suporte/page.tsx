import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SupportPanel } from './SupportPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Suporte · SR HUB' };

export default async function SuportePage() {
  const supabase = createSupabaseServerClient();
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, created_at, resolved_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Sistema</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Suporte</h1>
        <p className="mt-2 text-sm text-white/60">
          Abra um ticket. Nossa equipe responde em até 24h úteis (2h para clientes Business/Enterprise).
        </p>
      </header>
      <SupportPanel initial={(tickets ?? []) as never} />
    </div>
  );
}
