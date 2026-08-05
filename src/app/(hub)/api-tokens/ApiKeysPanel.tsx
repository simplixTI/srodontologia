'use client';

import { useState, useTransition } from 'react';
import { Copy, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createApiKeyAction, revokeApiKeyAction } from '@/features/api-keys/actions';
import type { ApiKeyRow } from '@/features/api-keys/queries';

const SCOPES = ['cases:read', 'cases:write', 'quotes:read', 'planning:read', 'files:read', '*'];

export function ApiKeysPanel({ initial }: { initial: ApiKeyRow[] }) {
  const [keys, setKeys] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState<{ token: string; prefix: string } | null>(null);
  const [pending, start] = useTransition();

  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['cases:read']);

  const create = () => {
    start(async () => {
      const res = await createApiKeyAction({ name, scopes: selectedScopes });
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      setNewlyCreated({ token: res.token, prefix: res.prefix });
      setKeys((k) => [
        {
          id: res.id,
          name,
          key_prefix: res.prefix,
          scopes: selectedScopes,
          last_used_at: null,
          expires_at: null,
          revoked_at: null,
          created_at: new Date().toISOString()
        },
        ...k
      ]);
      setName('');
      setSelectedScopes(['cases:read']);
      setCreating(false);
    });
  };

  const revoke = (id: string) => {
    if (!confirm('Revogar esta chave? A ação é permanente.')) return;
    start(async () => {
      const res = await revokeApiKeyAction(id);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      setKeys((k) =>
        k.map((x) => (x.id === id ? { ...x, revoked_at: new Date().toISOString() } : x))
      );
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {newlyCreated && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-emerald-200">
            Chave criada — guarde agora
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg bg-black/50 px-3 py-2 font-mono text-xs text-emerald-100">
              {newlyCreated.token}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(newlyCreated.token);
                toast.success('Copiado.');
              }}
              className="rounded-full border border-emerald-400/40 px-3 py-2 text-emerald-100 hover:bg-emerald-400/10"
            >
              <Copy className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
          <p className="mt-2 text-xs text-white/60">
            Este é o único momento em que a chave completa é exibida. Ao fechar, apenas o prefixo (
            <code>{newlyCreated.prefix}</code>) permanecerá visível.
          </p>
          <button
            type="button"
            onClick={() => setNewlyCreated(null)}
            className="mt-3 text-[0.55rem] uppercase tracking-[0.28em] text-white/60 underline underline-offset-4"
          >
            Já guardei, fechar
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 hover:bg-gold/20"
        >
          <Plus className="h-3 w-3" strokeWidth={1.5} />
          Nova chave
        </button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-gold/25 bg-gold/[0.03] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">Nome</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Integração ERP"
                className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
              />
            </label>
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.28em] text-white/50">Escopos</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SCOPES.map((s) => {
                  const on = selectedScopes.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setSelectedScopes((cur) =>
                          on ? cur.filter((x) => x !== s) : [...cur, s]
                        )
                      }
                      className={
                        on
                          ? 'rounded-full border border-gold/50 bg-gold/15 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-gold-100'
                          : 'rounded-full border border-white/15 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/60'
                      }
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-full border border-white/15 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-white/70"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={create}
              disabled={pending || name.trim().length < 2 || selectedScopes.length === 0}
              className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
            >
              {pending ? 'Gerando…' : 'Gerar chave'}
            </button>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {keys.length === 0 && (
          <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/50">
            Nenhuma chave criada ainda.
          </li>
        )}
        {keys.map((k) => (
          <li key={k.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm text-white">{k.name}</div>
                <div className="mt-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                  {k.key_prefix}…
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {k.scopes.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.28em] text-white/70"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                  Uso: {k.last_used_at ? new Date(k.last_used_at).toLocaleString('pt-BR') : 'nunca'}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {k.revoked_at ? (
                  <span className="rounded-full border border-red-400/30 bg-red-400/5 px-2 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-red-200">
                    Revogada
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => revoke(k.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-400/30 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-red-200 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    Revogar
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
