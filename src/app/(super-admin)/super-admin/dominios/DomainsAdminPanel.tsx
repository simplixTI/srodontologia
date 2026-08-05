'use client';

import { useMemo, useState, useTransition } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  createDomainAction,
  verifyDomainAction,
  deleteDomainAction
} from '@/features/domains/actions';
import type { DomainRow } from '@/features/domains/queries';

type Tenant = { id: string; name: string; slug: string | null };

export function DomainsAdminPanel({
  initial,
  tenants
}: {
  initial: DomainRow[];
  tenants: Tenant[];
}) {
  const [domains, setDomains] = useState<DomainRow[]>(initial);
  const [hostname, setHostname] = useState('');
  const [tenantId, setTenantId] = useState<string>(tenants[0]?.id ?? '');
  const [newToken, setNewToken] = useState<{ hostname: string; token: string } | null>(null);
  const [pending, start] = useTransition();

  const tenantsById = useMemo(() => {
    const m = new Map<string, Tenant>();
    for (const t of tenants) m.set(t.id, t);
    return m;
  }, [tenants]);

  const add = () => {
    if (!hostname.trim()) {
      toast.error('Informe um hostname.');
      return;
    }
    if (!tenantId) {
      toast.error('Selecione um tenant.');
      return;
    }
    start(async () => {
      const res = await createDomainAction(tenantId, hostname);
      if (!res.ok || !res.token || !res.id) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      setNewToken({ hostname, token: res.token });
      setDomains((d) => [
        {
          id: res.id!,
          organization_id: tenantId,
          hostname: hostname.toLowerCase(),
          status: 'pending',
          verification_token: res.token!,
          verified_at: null,
          ssl_ready_at: null,
          created_at: new Date().toISOString()
        },
        ...d
      ]);
      setHostname('');
    });
  };

  const verify = (id: string) => {
    start(async () => {
      const res = await verifyDomainAction(id);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      toast.success('Verificação enfileirada.');
      setDomains((d) =>
        d.map((x) => (x.id === id ? { ...x, status: 'verified', verified_at: new Date().toISOString() } : x))
      );
    });
  };

  const remove = (id: string) => {
    if (!confirm('Remover este domínio?')) return;
    start(async () => {
      const res = await deleteDomainAction(id);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha.');
        return;
      }
      setDomains((d) => d.filter((x) => x.id !== id));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row">
        <select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-gold/50 focus:outline-none md:w-72"
        >
          {tenants.length === 0 && <option value="">Nenhum tenant</option>}
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}{t.slug ? ` (${t.slug})` : ''}
            </option>
          ))}
        </select>
        <input
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          placeholder="parceiro.srodontologia.com.br"
          className="h-10 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="inline-flex items-center justify-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70 disabled:opacity-50"
        >
          <Plus className="h-3 w-3" strokeWidth={1.5} />
          Adicionar
        </button>
      </div>

      {newToken && (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4">
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-gold-100">Próximo passo (DNS)</div>
          <p className="mt-2 text-sm text-white">
            Adicione o registro TXT abaixo no provedor DNS de <code>{newToken.hostname}</code>:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-black/50 p-3 font-mono text-xs text-gold-100">
{`Type: TXT
Name: _sr-verify.${newToken.hostname}
Value: ${newToken.token}`}
          </pre>
          <p className="mt-2 text-xs text-white/60">
            Após propagação (5-30 min), clique em <strong>Verificar</strong>. SSL será
            emitido automaticamente pela plataforma.
          </p>
          <button
            type="button"
            onClick={() => setNewToken(null)}
            className="mt-3 text-[0.55rem] uppercase tracking-[0.28em] text-white/60 underline"
          >
            Fechar
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {domains.length === 0 && (
          <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/40">
            Nenhum domínio configurado.
          </li>
        )}
        {domains.map((d) => {
          const tenant = tenantsById.get(d.organization_id);
          return (
            <li key={d.id} className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-white">{d.hostname}</div>
                  <div className="mt-1 text-[0.55rem] uppercase tracking-[0.28em] text-white/40">
                    {tenant ? tenant.name : d.organization_id} · {d.status}
                    {d.verified_at && ` · verificado em ${new Date(d.verified_at).toLocaleDateString('pt-BR')}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => verify(d.id)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[0.55rem] uppercase tracking-[0.28em] text-emerald-200 hover:border-emerald-400/70 disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" strokeWidth={1.5} />
                      Verificar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    disabled={pending}
                    className="rounded-full border border-red-400/30 p-1.5 text-red-200 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
