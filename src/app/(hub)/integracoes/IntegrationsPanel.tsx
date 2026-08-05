'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { saveAiSettingsAction, saveIntegrationAction } from '@/features/integrations/actions';
import type { AiSettingsRow, IntegrationRow } from '@/features/integrations/queries';
import type { AiFeatureFlags } from '@/lib/ai/types';

const INTEGRATION_KINDS: {
  kind: IntegrationRow['kind'];
  label: string;
  providers: string[];
  secretHint: string;
}[] = [
  { kind: 'ocr_provider', label: 'OCR', providers: ['mock', 'google-vision', 'aws-textract', 'azure-di'], secretHint: 'OCR_API_KEY' },
  { kind: 'cpf_provider', label: 'CPF', providers: ['mock', 'cpfapi', 'apiserpro'], secretHint: 'CPF_API_KEY' },
  { kind: 'whatsapp', label: 'WhatsApp', providers: ['mock', 'z-api', 'twilio', 'wa-cloud'], secretHint: 'WHATSAPP_TOKEN' },
  { kind: 'email', label: 'E-mail', providers: ['mock', 'resend', 'sendgrid'], secretHint: 'EMAIL_API_KEY' }
];

export function IntegrationsPanel({
  ai,
  integrations
}: {
  ai: AiSettingsRow;
  integrations: IntegrationRow[];
}) {
  const map = new Map(integrations.map((i) => [i.kind, i]));
  return (
    <div className="flex flex-col gap-6">
      <AiSettingsForm initial={ai} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm text-white">Providers externos</h2>
        {INTEGRATION_KINDS.map((k) => (
          <IntegrationForm key={k.kind} kind={k} current={map.get(k.kind) ?? null} />
        ))}
      </section>
    </div>
  );
}

function AiSettingsForm({ initial }: { initial: AiSettingsRow }) {
  const [state, setState] = useState(initial);
  const [pending, start] = useTransition();

  const save = () => {
    start(async () => {
      const res = await saveAiSettingsAction(state);
      if (!res.ok) toast.error(res.error ?? 'Falha ao salvar.');
      else toast.success('Configuração de IA salva.');
    });
  };

  return (
    <section className="rounded-2xl border border-gold/15 bg-white/[0.02] p-5">
      <div className="mb-4 text-sm text-white">Assistente de IA</div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Provider">
          <select
            value={state.provider}
            onChange={(e) => setState({ ...state, provider: e.target.value })}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          >
            <option value="mock">mock (offline)</option>
            <option value="openai">openai</option>
            <option value="anthropic">anthropic</option>
            <option value="google">google</option>
            <option value="openrouter">openrouter</option>
          </select>
        </Field>
        <Field label="Modelo">
          <input
            value={state.model}
            onChange={(e) => setState({ ...state, model: e.target.value })}
            placeholder="ex.: gpt-4o-mini | claude-haiku-4-5"
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <Field label="Temperatura">
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={state.temperature}
            onChange={(e) => setState({ ...state, temperature: parseFloat(e.target.value) || 0 })}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <Field label="Tokens máximos">
          <input
            type="number"
            min={64}
            max={8192}
            value={state.max_tokens}
            onChange={(e) => setState({ ...state, max_tokens: parseInt(e.target.value) || 1024 })}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <Field label="Orçamento mensal (tokens)">
          <input
            type="number"
            min={0}
            value={state.monthly_token_budget}
            onChange={(e) =>
              setState({ ...state, monthly_token_budget: parseInt(e.target.value) || 0 })
            }
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          />
        </Field>
      </div>

      <div className="mt-4">
        <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">Recursos ativos</div>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
          {(Object.keys(state.features) as (keyof AiFeatureFlags)[]).map((f) => (
            <label key={f} className="inline-flex items-center gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={state.features[f]}
                onChange={(e) =>
                  setState({
                    ...state,
                    features: { ...state.features, [f]: e.target.checked }
                  })
                }
              />
              {f}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 hover:bg-gold/20 disabled:opacity-50"
        >
          {pending ? 'Salvando…' : 'Salvar configuração'}
        </button>
      </div>
    </section>
  );
}

function IntegrationForm({
  kind,
  current
}: {
  kind: (typeof INTEGRATION_KINDS)[number];
  current: IntegrationRow | null;
}) {
  const [provider, setProvider] = useState(current?.provider ?? kind.providers[0]);
  const [enabled, setEnabled] = useState(current?.enabled ?? false);
  const [secretRef, setSecretRef] = useState(current?.secret_ref ?? '');
  const [config, setConfig] = useState(JSON.stringify(current?.config ?? {}, null, 2));
  const [pending, start] = useTransition();

  const save = () => {
    let parsedConfig: Record<string, unknown> = {};
    try {
      parsedConfig = JSON.parse(config || '{}');
    } catch {
      toast.error('Config inválido (JSON).');
      return;
    }
    start(async () => {
      const res = await saveIntegrationAction({
        kind: kind.kind,
        provider,
        enabled,
        secret_ref: secretRef || null,
        config: parsedConfig
      });
      if (!res.ok) toast.error(res.error ?? 'Falha ao salvar.');
      else toast.success('Integração salva.');
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-white">{kind.label}</div>
        <label className="inline-flex items-center gap-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/70">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Ativa
        </label>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Provider">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          >
            {kind.providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Env do segredo (${kind.secretHint})`}>
          <input
            value={secretRef}
            onChange={(e) => setSecretRef(e.target.value)}
            placeholder={kind.secretHint}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Config (JSON)">
            <textarea
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white focus:border-gold/50 focus:outline-none"
            />
          </Field>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={pending}
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
      <span className="text-[0.5rem] uppercase tracking-[0.28em] text-white/50">{label}</span>
      {children}
    </label>
  );
}
