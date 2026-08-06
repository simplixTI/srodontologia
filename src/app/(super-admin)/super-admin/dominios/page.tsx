import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPlatformUser } from '@/lib/permissions/platform';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Domínios · Standby' };

/**
 * Feature em standby por decisão de produto.
 *
 * Portal do dentista é servido em /portal no domínio principal do tenant
 * (ex.: srodontologiadigital.com.br/portal). Não há necessidade de
 * hostname dedicado hoje.
 *
 * A tabela tenant_domains, as server actions em src/features/domains/
 * e a lógica de resolução por hostname em src/lib/tenant/hostname.ts
 * continuam existindo — reativar é ligar o item do menu e restaurar
 * o painel de gestão. Nada foi deletado.
 */
export default async function DomainsStandbyPage() {
  const platform = await getPlatformUser();
  if (!platform) redirect('/login?next=/super-admin');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16 md:px-8">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Plataforma · Standby</div>
        <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Domínios personalizados</h1>
      </header>

      <div className="rounded-3xl border border-gold/15 bg-white/[0.02] p-6">
        <p className="text-sm text-white/80">
          Este recurso está em <strong className="text-gold-100">standby</strong>. O portal do
          dentista é servido em <code className="rounded bg-black/40 px-1">/portal</code> no
          domínio principal do escritório — não há necessidade de subdomínio dedicado.
        </p>
        <p className="mt-3 text-sm text-white/60">
          Toda a infraestrutura para reativar (tabela <code>tenant_domains</code>, verificação
          DNS TXT, emissão de SSL, roteamento por hostname) continua no repositório. Para
          voltar a expor a tela: reativar o item no menu do super-admin.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/super-admin"
            className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.28em] text-gold-100 hover:border-gold/70"
          >
            Voltar à visão geral
          </Link>
        </div>
      </div>
    </div>
  );
}
