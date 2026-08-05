'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { FileText, MessageSquare, Package, ClipboardCheck, Sparkles, Info } from 'lucide-react';
import { QUOTE_STATUS_LABELS } from '@/features/quotes/types';
import { PLANNING_STATUS_LABELS } from '@/features/planning/types';
import { DELIVERY_STATUS_LABELS } from '@/features/deliveries/types';
import { PUBLIC_STATUS_LABELS } from '@/lib/validations/cases';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  approveQuoteAction,
  requestQuoteChangesAction,
  approvePlanningAction,
  requestPlanningChangesAction,
  confirmDeliveryAction,
  submitDentistCaseAction,
  sendDentistMessageAction,
  uploadDentistCaseFileAction,
  getDentistSignedFileUrlAction
} from '@/features/portal/actions';
import type {
  PortalChecklistItem,
  PortalFile,
  PortalQuote,
  PortalQuoteItem,
  PortalPlanning,
  PortalDelivery,
  PortalMessage,
  PortalTimelineEntry
} from '@/features/portal/case-queries';

type TabId = 'overview' | 'files' | 'quotes' | 'planning' | 'chat' | 'delivery';

type Props = {
  caseId: string;
  internalStatus: string;
  publicStatus: keyof typeof PUBLIC_STATUS_LABELS;
  clinicalDescription: string | null;
  material: string | null;
  shade: string | null;
  checklist: PortalChecklistItem[];
  files: PortalFile[];
  quotes: PortalQuote[];
  quoteItems: Record<string, PortalQuoteItem[]>;
  planning: PortalPlanning[];
  deliveries: PortalDelivery[];
  messages: PortalMessage[];
  timeline: PortalTimelineEntry[];
  canSubmit: boolean;
};

const TABS: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: 'overview', label: 'Visão',       icon: Info },
  { id: 'files',    label: 'Arquivos',    icon: FileText },
  { id: 'quotes',   label: 'Orçamento',   icon: Sparkles },
  { id: 'planning', label: 'Planejamento', icon: ClipboardCheck },
  { id: 'chat',     label: 'Mensagens',   icon: MessageSquare },
  { id: 'delivery', label: 'Entrega',     icon: Package }
];

export function PortalCaseTabs(props: Props) {
  const [tab, setTab] = useState<TabId>('overview');
  const [pending, start] = useTransition();
  const confirm = useConfirm();

  const canUploadFiles =
    props.internalStatus === 'draft' || props.publicStatus === 'missing_information';

  const missingRequired = props.checklist.filter(
    (i) => i.required_snapshot && !i.completed
  ).length;

  return (
    <>
      {/* Tab bar */}
      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-gold/10 bg-white/[0.02] p-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          const count =
            t.id === 'files' ? props.files.length :
            t.id === 'quotes' ? props.quotes.length :
            t.id === 'planning' ? props.planning.length :
            t.id === 'chat' ? props.messages.length :
            t.id === 'delivery' ? props.deliveries.length :
            0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                active
                  ? 'flex shrink-0 items-center gap-2 rounded-xl bg-gold/10 px-3 py-2 text-xs text-gold-100'
                  : 'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/60 transition hover:bg-white/[0.04] hover:text-white'
              }
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t.label}
              {count > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[0.55rem] text-white/80">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      {tab === 'overview' && (
        <OverviewTab
          {...props}
          canSubmit={props.canSubmit}
          missingRequired={missingRequired}
          pending={pending}
          onSubmit={() => {
            start(async () => {
              const r = await submitDentistCaseAction(props.caseId);
              if (r.ok) toast.success('Caso enviado ao laboratório.');
              else toast.error(r.error ?? 'Erro ao enviar caso.');
            });
          }}
        />
      )}

      {tab === 'files' && (
        <FilesTab
          caseId={props.caseId}
          files={props.files}
          checklist={props.checklist}
          canUpload={canUploadFiles}
          onOpen={async (fileId) => {
            const url = await getDentistSignedFileUrlAction(fileId, 300);
            if (url) window.open(url, '_blank');
            else toast.error('Não foi possível abrir o arquivo.');
          }}
          onUploadDone={() => toast.success('Arquivo enviado.')}
        />
      )}

      {tab === 'quotes' && (
        <QuotesTab
          caseId={props.caseId}
          quotes={props.quotes}
          items={props.quoteItems}
          pending={pending}
          onApprove={async (q) => {
            const ok = await confirm({
              title: 'Aprovar orçamento',
              description:
                `Você está prestes a aprovar o orçamento ${q.quote_number} no valor de R$ ${money(q.total)}. Esta ação é registrada em auditoria.`,
              confirmLabel: 'Aprovar'
            });
            if (!ok) return;
            start(async () => {
              const r = await approveQuoteAction(q.id, props.caseId);
              if (r.ok) toast.success('Orçamento aprovado.');
              else toast.error(r.error ?? 'Erro ao aprovar.');
            });
          }}
          onRequestChanges={(q, comment) => {
            start(async () => {
              const r = await requestQuoteChangesAction(q.id, props.caseId, comment);
              if (r.ok) toast.success('Solicitação enviada ao laboratório.');
              else toast.error(r.error ?? 'Erro ao solicitar ajuste.');
            });
          }}
        />
      )}

      {tab === 'planning' && (
        <PlanningTab
          caseId={props.caseId}
          planning={props.planning}
          pending={pending}
          onApprove={async (p) => {
            const ok = await confirm({
              title: 'Aprovar planejamento',
              description:
                `Você está prestes a aprovar o planejamento v${p.version_number}. Esta ação é registrada em auditoria.`,
              confirmLabel: 'Aprovar'
            });
            if (!ok) return;
            start(async () => {
              const r = await approvePlanningAction(p.id, props.caseId);
              if (r.ok) toast.success('Planejamento aprovado.');
              else toast.error(r.error ?? 'Erro ao aprovar.');
            });
          }}
          onRequestChanges={(p, comment) => {
            start(async () => {
              const r = await requestPlanningChangesAction(p.id, props.caseId, comment);
              if (r.ok) toast.success('Solicitação enviada.');
              else toast.error(r.error ?? 'Erro ao solicitar ajuste.');
            });
          }}
        />
      )}

      {tab === 'chat' && (
        <ChatTab
          caseId={props.caseId}
          messages={props.messages}
          pending={pending}
          onSend={(text) => {
            const fd = new FormData();
            fd.set('message', text);
            start(async () => {
              const r = await sendDentistMessageAction(props.caseId, fd);
              if (r.ok) toast.success('Mensagem enviada.');
              else toast.error(r.error ?? 'Erro ao enviar mensagem.');
            });
          }}
        />
      )}

      {tab === 'delivery' && (
        <DeliveryTab
          caseId={props.caseId}
          deliveries={props.deliveries}
          pending={pending}
          onConfirm={async (d, notes) => {
            const ok = await confirm({
              title: 'Confirmar recebimento',
              description:
                'Confirmar que você recebeu esta entrega? A ação é registrada com data, hora e IP.',
              confirmLabel: 'Sim, recebi'
            });
            if (!ok) return;
            start(async () => {
              const r = await confirmDeliveryAction(d.id, props.caseId, notes);
              if (r.ok) toast.success('Recebimento confirmado. Obrigado!');
              else toast.error(r.error ?? 'Erro ao confirmar.');
            });
          }}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════

function OverviewTab({
  clinicalDescription,
  material,
  shade,
  timeline,
  checklist,
  canSubmit,
  missingRequired,
  pending,
  onSubmit
}: {
  clinicalDescription: string | null;
  material: string | null;
  shade: string | null;
  timeline: PortalTimelineEntry[];
  checklist: PortalChecklistItem[];
  canSubmit: boolean;
  missingRequired: number;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="text-[0.6rem] uppercase tracking-[0.28em] text-white/50">
          Descrição clínica
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
          {clinicalDescription || <span className="text-white/40">Sem descrição.</span>}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-[0.55rem] uppercase tracking-[0.25em] text-white/40">Material</dt>
            <dd className="mt-1 text-sm text-white">{material || '—'}</dd>
          </div>
          <div>
            <dt className="text-[0.55rem] uppercase tracking-[0.25em] text-white/40">Cor</dt>
            <dd className="mt-1 text-sm text-white">{shade || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="text-[0.6rem] uppercase tracking-[0.28em] text-white/50">
          Timeline
        </h3>
        {timeline.length === 0 ? (
          <p className="mt-2 text-sm text-white/40">Nenhum evento registrado.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2">
            {timeline.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-300" />
                <div className="text-xs">
                  <div className="text-white">
                    {t.new_public_status ? PUBLIC_STATUS_LABELS[t.new_public_status] : '—'}
                  </div>
                  {t.public_note && (
                    <div className="mt-0.5 text-white/60">{t.public_note}</div>
                  )}
                  <div className="mt-0.5 text-[0.55rem] uppercase tracking-[0.22em] text-white/40">
                    {new Date(t.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {canSubmit && (
        <section className="md:col-span-2 rounded-2xl border border-gold/25 bg-gold/[0.04] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-gold-100">Caso em rascunho</div>
              <div className="mt-1 text-xs text-white/60">
                {missingRequired > 0
                  ? `Complete os ${missingRequired} itens obrigatórios do checklist antes de enviar.`
                  : 'Tudo pronto — envie o caso ao laboratório quando quiser.'}
              </div>
              {missingRequired > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-xs text-white/60">
                  {checklist
                    .filter((i) => i.required_snapshot && !i.completed)
                    .slice(0, 5)
                    .map((i) => (
                      <li key={i.id}>• {i.title_snapshot}</li>
                    ))}
                </ul>
              )}
            </div>
            <button
              onClick={onSubmit}
              disabled={pending || missingRequired > 0}
              className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-gold-100 transition hover:border-gold/70 hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Enviando…' : 'Enviar caso'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FILES
// ═══════════════════════════════════════════════════════════

function FilesTab({
  caseId,
  files,
  checklist,
  canUpload,
  onOpen,
  onUploadDone
}: {
  caseId: string;
  files: PortalFile[];
  checklist: PortalChecklistItem[];
  canUpload: boolean;
  onOpen: (fileId: string) => Promise<void>;
  onUploadDone: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fs: FileList | null, checklistItemId?: string) {
    if (!fs || fs.length === 0) return;
    setUploading(true);
    for (const f of Array.from(fs)) {
      const fd = new FormData();
      fd.set('file', f);
      if (checklistItemId) fd.set('checklist_item_id', checklistItemId);
      const r = await uploadDentistCaseFileAction(caseId, fd);
      if (!r.ok) toast.error(r.error ?? 'Erro no upload.');
    }
    setUploading(false);
    onUploadDone();
  }

  return (
    <div className="flex flex-col gap-4">
      {canUpload && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold/25 bg-white/[0.02] p-6 text-center transition hover:border-gold/50 hover:bg-white/[0.04]">
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
          <span className="text-sm text-white">
            {uploading ? 'Enviando…' : 'Arraste arquivos aqui ou toque para selecionar'}
          </span>
          <span className="text-[0.65rem] text-white/50">
            JPG, PNG, PDF, STL, OBJ, DCM · até 50MB por arquivo
          </span>
        </label>
      )}

      {checklist.length > 0 && (
        <section>
          <h3 className="mb-3 text-[0.6rem] uppercase tracking-[0.28em] text-white/50">
            Checklist ({checklist.filter((i) => i.completed).length}/{checklist.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {checklist.map((i) => {
              const linked = files.filter((f) => f.checklist_item_id === i.id);
              return (
                <li
                  key={i.id}
                  className={
                    i.completed
                      ? 'rounded-xl border border-emerald-400/30 bg-emerald-400/[0.03] p-3'
                      : i.required_snapshot
                        ? 'rounded-xl border border-gold/25 bg-white/[0.02] p-3'
                        : 'rounded-xl border border-white/5 bg-white/[0.02] p-3'
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-white">
                        {i.title_snapshot}
                        {i.required_snapshot && (
                          <span className="ml-2 text-[0.55rem] uppercase tracking-widest text-gold-100">
                            obrigatório
                          </span>
                        )}
                      </div>
                      {i.description_snapshot && (
                        <div className="mt-0.5 text-xs text-white/50">
                          {i.description_snapshot}
                        </div>
                      )}
                    </div>
                    {canUpload && (
                      <label className="shrink-0 cursor-pointer rounded-full border border-gold/25 px-3 py-1 text-[0.55rem] uppercase tracking-[0.22em] text-gold-100 hover:border-gold/60">
                        <input
                          type="file"
                          multiple
                          className="sr-only"
                          onChange={(e) => handleFiles(e.target.files, i.id)}
                          disabled={uploading}
                        />
                        + Anexar
                      </label>
                    )}
                  </div>
                  {linked.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {linked.map((f) => (
                        <li key={f.id}>
                          <button
                            type="button"
                            onClick={() => onOpen(f.id)}
                            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[0.65rem] text-white/70 hover:border-gold/30 hover:text-white"
                          >
                            {f.original_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-[0.6rem] uppercase tracking-[0.28em] text-white/50">
          Todos os arquivos ({files.length})
        </h3>
        {files.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/40">
            Nenhum arquivo ainda.
          </p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {files.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onOpen(f.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left transition hover:border-gold/30 hover:bg-white/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">{f.original_name}</div>
                    <div className="text-[0.55rem] uppercase tracking-[0.22em] text-white/40">
                      {f.extension.toUpperCase()} · {formatBytes(f.file_size)}
                    </div>
                  </div>
                  <span className="text-[0.55rem] uppercase tracking-[0.22em] text-gold-100">
                    Abrir
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// QUOTES
// ═══════════════════════════════════════════════════════════

function QuotesTab({
  quotes,
  items,
  pending,
  onApprove,
  onRequestChanges
}: {
  caseId: string;
  quotes: PortalQuote[];
  items: Record<string, PortalQuoteItem[]>;
  pending: boolean;
  onApprove: (q: PortalQuote) => void;
  onRequestChanges: (q: PortalQuote, comment: string) => void;
}) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/50">
        Nenhum orçamento disponível ainda. Você será notificado quando o
        laboratório enviar.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {quotes.map((q) => {
        const its = items[q.id] ?? [];
        const canAct = q.status === 'sent';
        const canRequestChanges = q.status === 'sent';
        return (
          <QuoteCard
            key={q.id}
            q={q}
            items={its}
            canApprove={canAct}
            canRequestChanges={canRequestChanges}
            pending={pending}
            onApprove={() => onApprove(q)}
            onRequestChanges={(text) => onRequestChanges(q, text)}
          />
        );
      })}
    </div>
  );
}

function QuoteCard({
  q,
  items,
  canApprove,
  canRequestChanges,
  pending,
  onApprove,
  onRequestChanges
}: {
  q: PortalQuote;
  items: PortalQuoteItem[];
  canApprove: boolean;
  canRequestChanges: boolean;
  pending: boolean;
  onApprove: () => void;
  onRequestChanges: (comment: string) => void;
}) {
  const [changesOpen, setChangesOpen] = useState(false);
  const [comment, setComment] = useState('');

  return (
    <article className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
            {q.quote_number} · v{q.version_number}
          </div>
          <div className="mt-1 font-display text-2xl text-white">
            R$ {money(q.total)}
          </div>
        </div>
        <StatusChip status={q.status} labels={QUOTE_STATUS_LABELS} />
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <MetaFieldMini label="Prazo" value={q.estimated_days ? `${q.estimated_days} dias` : '—'} />
        <MetaFieldMini label="Validade" value={q.validity_date ? new Date(q.validity_date).toLocaleDateString('pt-BR') : '—'} />
        <MetaFieldMini label="Pagamento" value={q.payment_terms ?? '—'} />
        <MetaFieldMini label="Frete" value={`R$ ${money(q.shipping_cost)}`} />
      </dl>

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-white/5 rounded-xl border border-white/5">
          {items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm text-white">{it.description}</div>
                <div className="text-[0.6rem] uppercase tracking-[0.22em] text-white/40">
                  {it.quantity} × R$ {money(it.unit_price)}
                  {it.discount > 0 ? ` · desc R$ ${money(it.discount)}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-sm text-white">R$ {money(it.total)}</div>
            </li>
          ))}
        </ul>
      )}

      {q.public_notes && (
        <p className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-white/70">
          {q.public_notes}
        </p>
      )}

      {(canApprove || canRequestChanges) && (
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
          {canRequestChanges && (
            <button
              onClick={() => setChangesOpen((v) => !v)}
              disabled={pending}
              className="rounded-full border border-white/15 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-50"
            >
              Solicitar ajuste
            </button>
          )}
          {canApprove && (
            <button
              onClick={onApprove}
              disabled={pending}
              className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 transition hover:border-gold/70 hover:bg-gold/20 disabled:opacity-50"
            >
              Aprovar orçamento
            </button>
          )}
        </div>
      )}

      {changesOpen && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Descreva o ajuste desejado..."
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => { setChangesOpen(false); setComment(''); }}
              className="text-[0.6rem] uppercase tracking-[0.22em] text-white/50 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={() => { onRequestChanges(comment); setChangesOpen(false); setComment(''); }}
              disabled={pending || comment.trim().length < 3}
              className="rounded-full border border-gold/30 px-4 py-1.5 text-[0.6rem] uppercase tracking-[0.22em] text-gold-100 hover:border-gold/60 disabled:opacity-50"
            >
              Enviar solicitação
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ═══════════════════════════════════════════════════════════
// PLANNING
// ═══════════════════════════════════════════════════════════

function PlanningTab({
  planning,
  pending,
  onApprove,
  onRequestChanges
}: {
  caseId: string;
  planning: PortalPlanning[];
  pending: boolean;
  onApprove: (p: PortalPlanning) => void;
  onRequestChanges: (p: PortalPlanning, comment: string) => void;
}) {
  if (planning.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/50">
        Nenhum planejamento técnico disponível ainda.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {planning.map((p) => (
        <PlanningCard
          key={p.id}
          p={p}
          pending={pending}
          onApprove={() => onApprove(p)}
          onRequestChanges={(text) => onRequestChanges(p, text)}
        />
      ))}
    </div>
  );
}

function PlanningCard({
  p,
  pending,
  onApprove,
  onRequestChanges
}: {
  p: PortalPlanning;
  pending: boolean;
  onApprove: () => void;
  onRequestChanges: (comment: string) => void;
}) {
  const [changesOpen, setChangesOpen] = useState(false);
  const [comment, setComment] = useState('');
  const canAct = p.status === 'sent';

  return (
    <article className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
            Versão {p.version_number}
          </div>
          <div className="mt-1 text-sm text-white/60">
            {p.submitted_at
              ? `Enviado em ${new Date(p.submitted_at).toLocaleDateString('pt-BR')}`
              : 'Ainda não enviado'}
          </div>
        </div>
        <StatusChip status={p.status} labels={PLANNING_STATUS_LABELS} />
      </header>

      {p.technical_description && (
        <p className="mt-4 whitespace-pre-wrap rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-white/80">
          {p.technical_description}
        </p>
      )}

      {canAct && (
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
          <button
            onClick={() => setChangesOpen((v) => !v)}
            disabled={pending}
            className="rounded-full border border-white/15 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            Solicitar ajuste
          </button>
          <button
            onClick={onApprove}
            disabled={pending}
            className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 transition hover:border-gold/70 hover:bg-gold/20 disabled:opacity-50"
          >
            Aprovar planejamento
          </button>
        </div>
      )}

      {changesOpen && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Descreva o ajuste desejado..."
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => { setChangesOpen(false); setComment(''); }}
              className="text-[0.6rem] uppercase tracking-[0.22em] text-white/50 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={() => { onRequestChanges(comment); setChangesOpen(false); setComment(''); }}
              disabled={pending || comment.trim().length < 3}
              className="rounded-full border border-gold/30 px-4 py-1.5 text-[0.6rem] uppercase tracking-[0.22em] text-gold-100 hover:border-gold/60 disabled:opacity-50"
            >
              Enviar solicitação
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ═══════════════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════════════

function ChatTab({
  messages,
  pending,
  onSend
}: {
  caseId: string;
  messages: PortalMessage[];
  pending: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');

  function handleSend() {
    const t = text.trim();
    if (t.length === 0) return;
    onSend(t);
    setText('');
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-white/40">
            Sem mensagens ainda. Envie a primeira para conversar com a equipe.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="rounded-xl border border-white/5 bg-black/30 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-[0.6rem] uppercase tracking-[0.22em] text-white/50">
                  {m.sender?.full_name ?? 'Equipe SR'}
                </div>
                <div className="text-[0.55rem] text-white/40">
                  {new Date(m.created_at).toLocaleString('pt-BR')}
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">
                {m.message}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          placeholder="Digite sua mensagem... (Ctrl+Enter envia)"
          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={pending || text.trim().length === 0}
          className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-4 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 transition hover:border-gold/70 hover:bg-gold/20 disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DELIVERY
// ═══════════════════════════════════════════════════════════

function DeliveryTab({
  deliveries,
  pending,
  onConfirm
}: {
  caseId: string;
  deliveries: PortalDelivery[];
  pending: boolean;
  onConfirm: (d: PortalDelivery, notes?: string) => void;
}) {
  if (deliveries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/50">
        Nenhuma entrega registrada ainda.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {deliveries.map((d) => (
        <DeliveryCard
          key={d.id}
          d={d}
          pending={pending}
          onConfirm={(notes) => onConfirm(d, notes)}
        />
      ))}
    </div>
  );
}

function DeliveryCard({
  d,
  pending,
  onConfirm
}: {
  d: PortalDelivery;
  pending: boolean;
  onConfirm: (notes?: string) => void;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const canConfirm = d.status === 'dispatched' || d.status === 'in_transit';

  return (
    <article className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
            {d.carrier || d.method || 'Entrega'}
          </div>
          {d.tracking_code && (
            <div className="mt-1 font-display text-lg text-white">
              {d.tracking_code}
            </div>
          )}
          {d.driver_name && (
            <div className="mt-0.5 text-xs text-white/50">Motorista: {d.driver_name}</div>
          )}
        </div>
        <StatusChip status={d.status} labels={DELIVERY_STATUS_LABELS} />
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <MetaFieldMini
          label="Prev. entrega"
          value={d.estimated_delivery_at ? new Date(d.estimated_delivery_at).toLocaleDateString('pt-BR') : '—'}
        />
        <MetaFieldMini
          label="Despachado"
          value={d.shipped_at ? new Date(d.shipped_at).toLocaleDateString('pt-BR') : '—'}
        />
      </dl>

      {d.tracking_url && (
        <a
          href={d.tracking_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.22em] text-gold-100 hover:text-gold-50"
        >
          Rastrear ↗
        </a>
      )}

      {canConfirm && (
        <div className="mt-4">
          {notesOpen ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observações (opcional)..."
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => { setNotesOpen(false); setNotes(''); }}
                  className="text-[0.6rem] uppercase tracking-[0.22em] text-white/50 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { onConfirm(notes || undefined); setNotesOpen(false); }}
                  disabled={pending}
                  className="rounded-full border border-gold/30 px-4 py-1.5 text-[0.6rem] uppercase tracking-[0.22em] text-gold-100 hover:border-gold/60 disabled:opacity-50"
                >
                  Confirmar recebimento
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setNotesOpen(true)}
              disabled={pending}
              className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 transition hover:border-gold/70 hover:bg-gold/20 disabled:opacity-50"
            >
              Confirmar recebimento
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// ═══════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════

function StatusChip<T extends string>({
  status,
  labels
}: {
  status: T;
  labels: Record<T, string>;
}) {
  return (
    <span className="whitespace-nowrap rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.55rem] uppercase tracking-[0.22em] text-white/80">
      {labels[status]}
    </span>
  );
}

function MetaFieldMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.55rem] uppercase tracking-[0.22em] text-white/40">{label}</dt>
      <dd className="mt-0.5 text-sm text-white">{value}</dd>
    </div>
  );
}

function money(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
