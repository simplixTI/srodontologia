import type { Metadata } from 'next';
import { listMySessions } from '@/features/sessions/queries';
import { SessionsPanel } from './SessionsPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sessões · SR HUB' };

export default async function SessoesPage() {
  const sessions = await listMySessions();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Conta · Segurança</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Sessões ativas</h1>
        <p className="mt-2 text-sm text-white/60">
          Camada complementar de visibilidade. A revogação encerra o registro nesta plataforma; a sessão
          original também será encerrada no próximo refresh de token (Supabase Auth).
        </p>
      </header>
      <SessionsPanel initial={sessions} />
    </div>
  );
}
