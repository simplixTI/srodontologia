'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, ShieldCheck, Save, Loader2, Clock, Paperclip } from 'lucide-react';
import type { CaseWithRelations, CaseChecklistItem, StatusHistoryEntry } from '@/features/cases/queries';
import { autosaveCaseAction, toggleChecklistItemAction } from '@/features/cases/actions';
import { PUBLIC_STATUS_LABELS, CASE_PRIORITIES, CASE_PRIORITY_LABELS } from '@/lib/validations/cases';
import { FilesTab } from './FilesTab';
import type { CaseFile } from '@/features/files/queries';

type Tab = 'details' | 'checklist' | 'files' | 'timeline';

export function CaseTabs({
  caseRow,
  checklist,
  timeline,
  files,
  filesPerItem,
  dentists,
  clinics,
  caseTypes
}: {
  caseRow: CaseWithRelations;
  checklist: CaseChecklistItem[];
  timeline: StatusHistoryEntry[];
  files: CaseFile[];
  filesPerItem: Map<string, number>;
  dentists: { id: string; full_name: string }[];
  clinics: { id: string; trade_name: string }[];
  caseTypes: { id: string; name: string }[];
}) {
  const [tab, setTab] = useState<Tab>('details');
  const readOnly = caseRow.internal_status !== 'draft';

  return (
    <section>
      <nav className="flex gap-1 overflow-x-auto border-b border-gold/10">
        <TabButton active={tab === 'details'} onClick={() => setTab('details')}>
          Detalhes
        </TabButton>
        <TabButton active={tab === 'checklist'} onClick={() => setTab('checklist')}>
          Checklist <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[0.5rem]">{checklist.length}</span>
        </TabButton>
        <TabButton active={tab === 'files'} onClick={() => setTab('files')}>
          <Paperclip className="mr-1 inline h-3 w-3" strokeWidth={1.5} />
          Arquivos <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[0.5rem]">{files.length}</span>
        </TabButton>
        <TabButton active={tab === 'timeline'} onClick={() => setTab('timeline')}>
          Timeline
        </TabButton>
      </nav>

      <div className="mt-6">
        {tab === 'details' && (
          <DetailsPanel
            caseRow={caseRow}
            dentists={dentists}
            clinics={clinics}
            caseTypes={caseTypes}
          />
        )}
        {tab === 'checklist' && (
          <ChecklistPanel
            caseId={caseRow.id}
            items={checklist}
            filesPerItem={filesPerItem}
            readOnly={readOnly}
          />
        )}
        {tab === 'files' && (
          <FilesTab
            caseId={caseRow.id}
            initialFiles={files}
            checklistItems={checklist}
            readOnly={readOnly}
          />
        )}
        {tab === 'timeline' && <TimelinePanel entries={timeline} />}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'relative px-4 py-3 text-[0.65rem] uppercase tracking-[0.28em] transition ' +
        (active
          ? 'text-white'
          : 'text-white/50 hover:text-white/80')
      }
    >
      {children}
      {active && <span className="absolute -bottom-px left-0 right-0 h-px bg-gold-gradient" />}
    </button>
  );
}

// ─── Details panel with autosave ─────────────────────────────
function DetailsPanel({
  caseRow,
  dentists,
  clinics,
  caseTypes
}: {
  caseRow: CaseWithRelations;
  dentists: { id: string; full_name: string }[];
  clinics: { id: string; trade_name: string }[];
  caseTypes: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const readOnly = caseRow.internal_status !== 'draft';

  const scheduleSave = (patch: Record<string, unknown>) => {
    setSaveState('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await autosaveCaseAction(caseRow.id, patch);
        if (result.ok) {
          setSaveState('saved');
          setErrMsg(null);
          setTimeout(() => setSaveState('idle'), 1500);
        } else {
          setSaveState('error');
          setErrMsg(result.error ?? 'Erro ao salvar.');
        }
      });
    }, 700);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const SaveIndicator = () => (
    <span className="inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.28em]">
      {saveState === 'saving' && (
        <><Loader2 className="h-3 w-3 animate-spin text-gold-100" strokeWidth={1.5} /><span className="text-gold-100">Salvando...</span></>
      )}
      {saveState === 'saved' && (
        <><Save className="h-3 w-3 text-emerald-300" strokeWidth={1.5} /><span className="text-emerald-200">Salvo</span></>
      )}
      {saveState === 'error' && (
        <span className="text-rose-200">Erro: {errMsg}</span>
      )}
      {saveState === 'idle' && !readOnly && (
        <span className="text-white/30">Autosave ativo</span>
      )}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-white">Dados do caso</h3>
        <SaveIndicator />
      </div>

      {readOnly && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Caso já enviado — edição bloqueada. Status atual: {PUBLIC_STATUS_LABELS[caseRow.public_status] ?? caseRow.public_status}.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Fld label="Título">
          <TextInput
            defaultValue={caseRow.title}
            disabled={readOnly}
            onChange={(v) => scheduleSave({ title: v })}
          />
        </Fld>
        <Fld label="Prioridade">
          <Select
            defaultValue={caseRow.priority}
            disabled={readOnly}
            options={CASE_PRIORITIES.map((p) => ({ value: p, label: CASE_PRIORITY_LABELS[p] }))}
            onChange={(v) => scheduleSave({ priority: v })}
          />
        </Fld>
        <Fld label="Dentista">
          <Select
            defaultValue={caseRow.dentist_id ?? ''}
            disabled={readOnly}
            options={dentists.map((d) => ({ value: d.id, label: d.full_name }))}
            onChange={(v) => scheduleSave({ dentist_id: v })}
          />
        </Fld>
        <Fld label="Clínica">
          <Select
            defaultValue={caseRow.clinic_id ?? ''}
            disabled={readOnly}
            options={[{ value: '', label: '— sem clínica —' }, ...clinics.map((c) => ({ value: c.id, label: c.trade_name }))]}
            onChange={(v) => scheduleSave({ clinic_id: v || null })}
          />
        </Fld>
        <Fld label="Tipo de caso" hint="Trocar re-instancia o checklist.">
          <Select
            defaultValue={caseRow.case_type_id ?? ''}
            disabled={readOnly}
            options={[{ value: '', label: '— selecionar —' }, ...caseTypes.map((t) => ({ value: t.id, label: t.name }))]}
            onChange={(v) => scheduleSave({ case_type_id: v || null })}
          />
        </Fld>
        <Fld label="Prazo desejado">
          <TextInput
            type="date"
            defaultValue={caseRow.requested_delivery_date ?? ''}
            disabled={readOnly}
            onChange={(v) => scheduleSave({ requested_delivery_date: v })}
          />
        </Fld>
        <Fld label="Material">
          <TextInput
            defaultValue={caseRow.material ?? ''}
            disabled={readOnly}
            placeholder="Zircônia, dissilicato de lítio…"
            onChange={(v) => scheduleSave({ material: v || null })}
          />
        </Fld>
        <Fld label="Cor / escala">
          <TextInput
            defaultValue={caseRow.shade ?? ''}
            disabled={readOnly}
            placeholder="A2, A3.5, BL1…"
            onChange={(v) => scheduleSave({ shade: v || null })}
          />
        </Fld>
      </div>

      <Fld label="Descrição clínica">
        <TextArea
          defaultValue={caseRow.clinical_description ?? ''}
          disabled={readOnly}
          rows={4}
          placeholder="Contexto clínico, tipo de reabilitação, expectativas…"
          onChange={(v) => scheduleSave({ clinical_description: v || null })}
        />
      </Fld>

      <Fld label="Regiões / elementos" hint="Separe por vírgula (ex.: 11, 12, 21)">
        <TextInput
          defaultValue={(caseRow.teeth_regions ?? []).join(', ')}
          disabled={readOnly}
          onChange={(v) => {
            const arr = v
              .split(/[,\s]+/)
              .map((s) => s.trim())
              .filter(Boolean);
            scheduleSave({ teeth_regions: arr.length ? arr : null });
          }}
        />
      </Fld>

      <Fld label="Notas do dentista (visível para dentista)">
        <TextArea
          defaultValue={caseRow.dentist_notes ?? ''}
          disabled={readOnly}
          rows={2}
          onChange={(v) => scheduleSave({ dentist_notes: v || null })}
        />
      </Fld>

      <Fld label="Notas internas (nunca vazam para o dentista)">
        <TextArea
          defaultValue={caseRow.internal_notes ?? ''}
          disabled={readOnly}
          rows={2}
          onChange={(v) => scheduleSave({ internal_notes: v || null })}
        />
      </Fld>
    </div>
  );
}

// ─── Checklist panel ─────────────────────────────────────────
function ChecklistPanel({
  caseId,
  items,
  filesPerItem,
  readOnly
}: {
  caseId: string;
  items: CaseChecklistItem[];
  filesPerItem: Map<string, number>;
  readOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [localItems, setLocalItems] = useState(items);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
        Nenhum item de checklist. Escolha um <strong>Tipo de caso</strong> na aba
        Detalhes para instanciar o checklist configurado.
      </div>
    );
  }

  const toggle = (item: CaseChecklistItem) => {
    if (readOnly || pending) return;
    const next = !item.completed;
    setLocalItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, completed: next, status: next ? 'completed' : 'pending' } : it))
    );
    startTransition(async () => {
      try {
        await toggleChecklistItemAction(item.id, caseId, next);
      } catch (e) {
        setLocalItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, completed: !next, status: !next ? 'completed' : 'pending' } : it))
        );
        alert('Erro: ' + (e as Error).message);
      }
    });
  };

  const completed = localItems.filter((i) => i.completed).length;
  const requiredCount = localItems.filter((i) => i.required_snapshot).length;
  const requiredCompleted = localItems.filter((i) => i.required_snapshot && i.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-white">Checklist do caso</h3>
          <p className="mt-1 text-xs text-white/50">
            {completed} de {localItems.length} itens · {requiredCompleted} de {requiredCount} obrigatórios
          </p>
        </div>
        <div className="text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
          {readOnly ? 'Somente leitura' : 'Clique para marcar/desmarcar'}
        </div>
      </div>

      <ul className="space-y-2">
        {localItems.map((item) => (
          <li
            key={item.id}
            onClick={() => toggle(item)}
            className={
              'flex items-start gap-3 rounded-2xl border p-4 transition ' +
              (item.completed
                ? 'border-emerald-400/25 bg-emerald-400/[0.03]'
                : item.required_snapshot
                ? 'border-rose-400/20 bg-rose-400/[0.03] hover:border-rose-400/40'
                : 'border-gold/10 bg-white/[0.02] hover:border-gold/30') +
              (readOnly ? ' cursor-default' : ' cursor-pointer')
            }
          >
            <div className="mt-0.5">
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-300" strokeWidth={1.5} />
              ) : (
                <Circle className="h-5 w-5 text-white/30" strokeWidth={1.5} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium text-white">{item.title_snapshot}</span>
                {item.required_snapshot && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.28em] text-gold-100">
                    <ShieldCheck className="h-2.5 w-2.5" strokeWidth={1.5} />
                    obrigatório
                  </span>
                )}
              </div>
              {item.description_snapshot && (
                <p className="mt-1 text-xs text-white/50">{item.description_snapshot}</p>
              )}
              {item.accepted_file_types_snapshot?.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.55rem] uppercase tracking-[0.25em] text-white/35">
                  <span>formatos: {item.accepted_file_types_snapshot.join(', ')} · min {item.minimum_files_snapshot}</span>
                  {(filesPerItem.get(item.id) ?? 0) > 0 && (
                    <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-gold-100">
                      {filesPerItem.get(item.id)} arquivo{filesPerItem.get(item.id)! > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Timeline panel ──────────────────────────────────────────
function TimelinePanel({ entries }: { entries: StatusHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-gold/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
        Sem histórico ainda.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex items-start gap-3 rounded-2xl border border-gold/10 bg-white/[0.02] p-4"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-gold/20 bg-black/40">
            <Clock className="h-3.5 w-3.5 text-gold-100" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white">
              {e.previous_public_status
                ? `${PUBLIC_STATUS_LABELS[e.previous_public_status as keyof typeof PUBLIC_STATUS_LABELS] ?? e.previous_public_status} → ${PUBLIC_STATUS_LABELS[e.new_public_status as keyof typeof PUBLIC_STATUS_LABELS] ?? e.new_public_status}`
                : `Criação: ${PUBLIC_STATUS_LABELS[e.new_public_status as keyof typeof PUBLIC_STATUS_LABELS] ?? e.new_public_status}`}
            </div>
            {e.public_note && (
              <p className="mt-1 text-xs text-white/50">{e.public_note}</p>
            )}
            <div className="mt-2 text-[0.55rem] uppercase tracking-[0.25em] text-white/40">
              {e.changer?.full_name ?? 'Sistema'} · {new Date(e.created_at).toLocaleString('pt-BR')}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Small controls ──────────────────────────────────────────
function Fld({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[0.6rem] uppercase tracking-[0.28em] text-white/60">{label}</label>
      {children}
      {hint && <p className="text-[0.6rem] text-white/35">{hint}</p>}
    </div>
  );
}

function TextInput({
  defaultValue,
  disabled,
  placeholder,
  type = 'text',
  onChange
}: {
  defaultValue: string;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white placeholder-white/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25 disabled:opacity-60"
    />
  );
}

function TextArea({
  defaultValue,
  disabled,
  placeholder,
  rows = 3,
  onChange
}: {
  defaultValue: string;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      defaultValue={defaultValue}
      disabled={disabled}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-gold/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25 disabled:opacity-60"
    />
  );
}

function Select({
  defaultValue,
  disabled,
  options,
  onChange
}: {
  defaultValue: string;
  disabled?: boolean;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-xl border border-gold/15 bg-black/40 px-4 text-sm text-white focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25 disabled:opacity-60"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-black">
          {o.label}
        </option>
      ))}
    </select>
  );
}
