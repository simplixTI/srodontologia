'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  toggleAutomationRuleAction,
  deleteAutomationRuleAction,
  saveAutomationRuleAction
} from '@/features/automations/actions';
import type { AutomationRuleRow } from '@/features/automations/queries';
import { DOMAIN_EVENT_TYPES } from '@/lib/events/types';

export function AutomationList({ initial }: { initial: AutomationRuleRow[] }) {
  const [rules, setRules] = useState<AutomationRuleRow[]>(initial);
  const [creating, setCreating] = useState(false);
  const [pending, start] = useTransition();

  const toggle = (id: string, enabled: boolean) => {
    start(async () => {
      const res = await toggleAutomationRuleAction(id, enabled);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao alternar.');
        return;
      }
      setRules((r) => r.map((x) => (x.id === id ? { ...x, enabled } : x)));
    });
  };

  const remove = (id: string) => {
    if (!confirm('Remover esta regra? Não pode ser desfeito.')) return;
    start(async () => {
      const res = await deleteAutomationRuleAction(id);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      setRules((r) => r.filter((x) => x.id !== id));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 hover:bg-gold/20"
        >
          <Plus className="h-3 w-3" strokeWidth={1.5} />
          Nova regra
        </button>
      </div>

      {creating && (
        <RuleForm
          onCancel={() => setCreating(false)}
          onSaved={(row) => {
            setRules((r) => [row, ...r]);
            setCreating(false);
          }}
        />
      )}

      <ul className="flex flex-col gap-3">
        {rules.length === 0 && (
          <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/50">
            Nenhuma regra configurada.
          </li>
        )}
        {rules.map((rule) => (
          <li
            key={rule.id}
            className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">{rule.trigger_event}</div>
                <div className="mt-1 text-sm text-white">{rule.name}</div>
                {rule.description && <div className="mt-1 text-xs text-white/50">{rule.description}</div>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {(rule.actions as { type: string }[]).map((a, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.28em] text-white/70"
                    >
                      {a.type}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                  Prioridade {rule.priority} · Rodou {rule.runs_count}x
                  {rule.last_run_at && ` · última: ${new Date(rule.last_run_at).toLocaleString('pt-BR')}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/70">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => toggle(rule.id, e.target.checked)}
                    disabled={pending}
                  />
                  Ativa
                </label>
                <button
                  type="button"
                  onClick={() => remove(rule.id)}
                  disabled={pending}
                  className="rounded-full border border-red-400/30 p-1.5 text-red-200 hover:bg-red-400/10"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RuleForm({
  onCancel,
  onSaved
}: {
  onCancel: () => void;
  onSaved: (row: AutomationRuleRow) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<(typeof DOMAIN_EVENT_TYPES)[number]>('quote.approved');
  const [actionType, setActionType] = useState('notify_admins');
  const [priority, setPriority] = useState(5);
  const [pending, start] = useTransition();

  const submit = () => {
    start(async () => {
      const res = await saveAutomationRuleAction(null, {
        name,
        description,
        trigger_event: trigger,
        conditions: [],
        actions: [{ type: actionType }],
        enabled: true,
        priority
      });
      if (!res.ok || !res.id) {
        toast.error(res.error ?? 'Falha ao criar regra.');
        return;
      }
      toast.success('Regra criada.');
      onSaved({
        id: res.id,
        name,
        description,
        trigger_event: trigger,
        conditions: [],
        actions: [{ type: actionType }],
        enabled: true,
        priority,
        runs_count: 0,
        last_run_at: null,
        created_at: new Date().toISOString()
      });
    });
  };

  return (
    <div className="rounded-2xl border border-gold/25 bg-gold/[0.03] p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nome">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Notificar admin ao aprovar orçamento"
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <Field label="Evento gatilho">
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value as typeof trigger)}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          >
            {DOMAIN_EVENT_TYPES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Descrição">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <Field label="Ação">
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          >
            <option value="notify_admins">notify_admins</option>
            <option value="notify_case_owner">notify_case_owner</option>
            <option value="enqueue_summary">enqueue_summary (resumo IA)</option>
            <option value="log_only">log_only</option>
          </select>
        </Field>
        <Field label="Prioridade">
          <input
            type="number"
            min={1}
            max={10}
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value) || 5)}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/15 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-white/70 hover:border-white/30 hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || name.trim().length < 2}
          className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 hover:bg-gold/20 disabled:opacity-50"
        >
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.55rem] uppercase tracking-[0.25em] text-white/50">{label}</span>
      {children}
    </label>
  );
}
