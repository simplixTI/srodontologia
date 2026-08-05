import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ClipboardCheck, MessageSquare, Rocket } from 'lucide-react';
import {
  getVersion,
  getVersionActivity,
  listChecklistItems,
  listComments
} from '@/features/planning/queries';
import { PLANNING_STATUS_COLORS, PLANNING_STATUS_LABELS } from '@/features/planning/types';
import { VersionActions } from './VersionActions';
import { ChecklistPanel } from './ChecklistPanel';
import { CommentsPanel } from './CommentsPanel';

export const metadata: Metadata = { title: 'Versão · Planejamento' };
export const dynamic = 'force-dynamic';

export default async function VersionPage({ params }: { params: { versionId: string } }) {
  const [version, activity, checklist, comments] = await Promise.all([
    getVersion(params.versionId),
    getVersionActivity(params.versionId),
    listChecklistItems(params.versionId),
    listComments(params.versionId)
  ]);
  if (!version) notFound();

  const total = checklist.length;
  const done = checklist.filter((c) => c.is_done).length;
  const requiredPending = checklist.filter((c) => c.is_required && !c.is_done).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <Link
        href="/planejamento"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-gold-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Voltar
      </Link>

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">
              Planejamento · Versão {version.version_number}
            </span>
            <span className="h-px w-24 bg-gradient-to-r from-gold/40 to-transparent" />
          </div>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Versão {version.version_number}
          </h1>
          <div className="mt-1 text-sm text-white/60">
            <Link href={`/casos/${version.case_id}`} className="hover:text-gold-100">
              Ver caso vinculado
            </Link>
          </div>
        </div>
        <span
          className={
            'rounded-full border px-3 py-1 text-[0.6rem] uppercase tracking-[0.22em] ' +
            PLANNING_STATUS_COLORS[version.status]
          }
        >
          {PLANNING_STATUS_LABELS[version.status]}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Checklist"
          value={total > 0 ? `${done}/${total}` : '—'}
          icon={<ClipboardCheck className="h-3 w-3" strokeWidth={1.5} />}
        />
        <StatTile
          label="Comentários"
          value={String(activity?.comment_count ?? comments.length)}
          icon={<MessageSquare className="h-3 w-3" strokeWidth={1.5} />}
        />
        <StatTile
          label="Aprovação"
          value={version.approved_at ? new Date(version.approved_at).toLocaleDateString('pt-BR') : '—'}
          icon={<CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />}
        />
        <StatTile
          label="Produção"
          value={
            version.promoted_to_production_at
              ? new Date(version.promoted_to_production_at).toLocaleDateString('pt-BR')
              : '—'
          }
          icon={<Rocket className="h-3 w-3" strokeWidth={1.5} />}
        />
      </div>

      <VersionActions
        version={version}
        requiredPending={requiredPending}
        alreadyPromoted={Boolean(version.promoted_to_production_at)}
      />

      {version.technical_description && (
        <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
          <h2 className="mb-2 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">
            Descrição técnica
          </h2>
          <p className="whitespace-pre-wrap text-sm text-white/80">
            {version.technical_description}
          </p>
        </section>
      )}

      <ChecklistPanel
        versionId={version.id}
        initialItems={checklist}
        canEdit={version.status !== 'obsolete'}
      />

      <CommentsPanel versionId={version.id} initialComments={comments} />
    </div>
  );
}

function StatTile({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.28em] text-white/50">
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate font-display text-xl text-white">{value}</div>
    </div>
  );
}
