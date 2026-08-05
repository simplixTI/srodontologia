'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { saveBrandingAction } from '@/features/branding/actions';
import type { TenantBranding } from '@/lib/branding/resolver';

export function BrandingForm({ initial }: { initial: TenantBranding }) {
  const [state, setState] = useState(initial);
  const [pending, start] = useTransition();

  const save = () => {
    start(async () => {
      const res = await saveBrandingAction(state);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao salvar.');
        return;
      }
      toast.success('Identidade atualizada.');
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gold/15 bg-white/[0.02] p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nome da marca">
          <input
            value={state.brand_name}
            onChange={(e) => setState({ ...state, brand_name: e.target.value })}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <Field label="Nome do remetente de e-mail">
          <input
            value={state.email_from_name}
            onChange={(e) => setState({ ...state, email_from_name: e.target.value })}
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <Field label="Cor primária">
          <input
            type="color"
            value={state.primary_color}
            onChange={(e) => setState({ ...state, primary_color: e.target.value })}
            className="h-10 w-24 rounded-lg border border-white/10 bg-black/40 px-1"
          />
        </Field>
        <Field label="Cor de destaque">
          <input
            type="color"
            value={state.accent_color}
            onChange={(e) => setState({ ...state, accent_color: e.target.value })}
            className="h-10 w-24 rounded-lg border border-white/10 bg-black/40 px-1"
          />
        </Field>
        <Field label="URL do logo (PNG/SVG)">
          <input
            value={state.logo_url ?? ''}
            onChange={(e) => setState({ ...state, logo_url: e.target.value || null })}
            placeholder="https://…"
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <Field label="URL do favicon">
          <input
            value={state.favicon_url ?? ''}
            onChange={(e) => setState({ ...state, favicon_url: e.target.value || null })}
            placeholder="https://…"
            className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Saudação no portal">
            <textarea
              value={state.portal_greeting}
              onChange={(e) => setState({ ...state, portal_greeting: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-gold/50 focus:outline-none"
            />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 p-4">
        <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/40">Prévia</div>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-lg font-bold text-black"
            style={{ background: state.accent_color }}
          >
            SR
          </div>
          <div className="text-white">{state.brand_name}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
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
      <span className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">{label}</span>
      {children}
    </label>
  );
}
