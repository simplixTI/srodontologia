import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewLeadForm } from './NewLeadForm';
import { listInternalStaff } from '@/features/dentists/queries';

export const metadata: Metadata = { title: 'Novo lead · SR HUB' };

export default async function NewLeadPage() {
  const staff = await listInternalStaff();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/leads"
        className="group inline-flex items-center gap-2 self-start text-[0.65rem] uppercase tracking-[0.32em] text-white/60 transition hover:text-gold-100"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        Voltar
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
            Novo lead
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </div>
        <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
          Cadastrar <span className="gold-text italic">lead.</span>
        </h1>
      </header>

      <div className="rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-8">
        <NewLeadForm staff={staff} />
      </div>
    </div>
  );
}
