import type { Metadata } from 'next';
import { listApiKeys } from '@/features/api-keys/queries';
import { ApiKeysPanel } from './ApiKeysPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tokens de API · SR HUB' };

/**
 * Gestão de API keys do próprio escritório (não é integração global).
 * Fica no ADMIN porque os tokens dão acesso apenas aos dados do tenant.
 *
 * Rota antiga /integracoes/api foi movida porque /integracoes agora é
 * exclusivo do SUPER_ADMIN.
 */
export default async function ApiTokensPage() {
  const keys = await listApiKeys();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header>
        <div className="text-[0.55rem] uppercase tracking-[0.35em] text-gold-100">Escritório</div>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">Tokens de API</h1>
        <p className="mt-2 text-sm text-white/60">
          Gere tokens Bearer para integrar sistemas de terceiros com os dados do seu
          escritório. Os tokens são exibidos uma única vez — guarde imediatamente. Spec
          OpenAPI disponível em{' '}
          <code className="rounded bg-black/40 px-1">/api/v1/openapi</code>.
        </p>
      </header>
      <ApiKeysPanel initial={keys} />
    </div>
  );
}
