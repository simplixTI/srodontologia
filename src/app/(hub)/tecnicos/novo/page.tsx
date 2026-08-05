import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listAvailableProfiles } from '@/features/technicians/queries';
import { TechnicianForm } from './TechnicianForm';

export const metadata: Metadata = { title: 'Novo técnico · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function NovoTecnicoPage() {
  const profiles = await listAvailableProfiles();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/tecnicos"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>

      <header>
        <h1 className="font-display text-3xl text-white md:text-4xl">Cadastrar técnico</h1>
        <p className="mt-2 text-sm text-white/60">
          Selecione um usuário da organização e transforme-o em um técnico do time de produção.
        </p>
      </header>

      {profiles.length === 0 ? (
        <div className="rounded-3xl border border-gold/10 bg-white/[0.02] p-10 text-center text-white/60">
          Todos os usuários da organização já foram cadastrados como técnicos.
          Convide novos usuários em <Link href="/equipe" className="text-gold-100 underline">Equipe</Link>.
        </div>
      ) : (
        <TechnicianForm profiles={profiles} />
      )}
    </div>
  );
}
