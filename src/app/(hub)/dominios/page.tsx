import { redirect } from 'next/navigation';

/**
 * A gestão de domínios foi movida para /super-admin/dominios.
 * O ADMIN do escritório vê apenas a URL ativa em "Configurações do
 * Escritório" (informativo, sem edição). Qualquer acesso direto a
 * /dominios é redirecionado.
 *
 * Guard duplo:
 *   • middleware.ts inclui /dominios em PLATFORM_PREFIXES (proibido
 *     para não-platform).
 *   • esta página redireciona defensivamente para /dashboard caso
 *     alguém consiga alcançá-la (rota mantida apenas para retro-
 *     compatibilidade e link legado).
 */
export default function DomainsMovedPage() {
  redirect('/dashboard');
}
