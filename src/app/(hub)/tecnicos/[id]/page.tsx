import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getTechnician, listSkillsByTechnician, listWorkload } from '@/features/technicians/queries';
import { listCards } from '@/features/production/queries';
import { TECH_STATUS_LABELS } from '@/lib/validations/production';
import { SkillsPanel } from './SkillsPanel';

export const metadata: Metadata = { title: 'Técnico · SR HUB' };
export const dynamic = 'force-dynamic';

export default async function TecnicoPage({ params }: { params: { id: string } }) {
  const [tech, skills, workload, allCards] = await Promise.all([
    getTechnician(params.id),
    listSkillsByTechnician(params.id),
    listWorkload(),
    listCards()
  ]);
  if (!tech) notFound();

  const wl = workload.find((w) => w.technician_id === tech.id);
  const queue = allCards.filter((c) => c.assignee_id === tech.profile_id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/tecnicos"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-white md:text-4xl">{tech.name}</h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-white/60">
            <span>{tech.email}</span>
            {tech.specialty && <span>· {tech.specialty}</span>}
            {tech.team && <span>· Time {tech.team}</span>}
          </div>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[0.6rem] uppercase tracking-[0.22em] text-white/70">
          {TECH_STATUS_LABELS[tech.status]}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Fila ativa" value={String(wl?.active_cards ?? 0)} />
        <StatTile label="Atrasados" value={String(wl?.overdue_cards ?? 0)} tone="red" />
        <StatTile label="Urgentes" value={String(wl?.urgent_cards ?? 0)} tone="amber" />
        <StatTile label="Retrabalho total" value={String(wl?.total_rework ?? 0)} />
      </div>

      <section>
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">
          Fila de produção
        </h2>
        {queue.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
            Sem cartões atribuídos.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {queue.map((c) => (
              <li key={c.id} className="rounded-xl border border-gold/10 bg-white/[0.02] p-4">
                <Link href={`/producao/${c.id}`} className="block text-sm text-white hover:text-gold-100">
                  {c.case_code ?? 'Caso'} — {c.case_title ?? 'Sem título'}
                </Link>
                <div className="mt-1 text-[0.65rem] text-white/50">
                  Prioridade: {c.priority} · Retrabalho: {c.rework_count}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SkillsPanel technicianId={tech.id} initialSkills={skills} />

      <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Detalhes</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm text-white/70 md:grid-cols-3">
          <div>
            <dt className="text-[0.6rem] uppercase tracking-[0.22em] text-white/40">Carga semanal</dt>
            <dd className="mt-1 text-white">{tech.weekly_hours}h</dd>
          </div>
          <div>
            <dt className="text-[0.6rem] uppercase tracking-[0.22em] text-white/40">Custo hora</dt>
            <dd className="mt-1 text-white">
              {tech.hourly_cost != null
                ? `R$ ${Number(tech.hourly_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6rem] uppercase tracking-[0.22em] text-white/40">Cadastrado em</dt>
            <dd className="mt-1 text-white">{new Date(tech.created_at).toLocaleDateString('pt-BR')}</dd>
          </div>
        </dl>
        {tech.notes && <p className="mt-4 whitespace-pre-line text-sm text-white/70">{tech.notes}</p>}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: 'red' | 'amber';
}) {
  const color = tone === 'red' ? 'text-red-200' : tone === 'amber' ? 'text-amber-200' : 'text-white';
  return (
    <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
      <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">{label}</div>
      <div className={`mt-2 font-display text-3xl ${color}`}>{value}</div>
    </div>
  );
}

