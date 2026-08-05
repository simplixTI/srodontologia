import { redirect } from 'next/navigation';

/**
 * Observabilidade técnica (filas, eventos, uso de IA global) foi movida
 * para a área da plataforma: /super-admin/status, /super-admin/jobs e
 * /super-admin/logs. O ADMIN do escritório enxerga apenas indicadores
 * operacionais dentro de /dashboard e /relatorios.
 *
 * Guard duplo: middleware.ts já inclui /observabilidade em
 * PLATFORM_PREFIXES; esta página garante redirect caso alguém alcance
 * a rota por link legado ou bypass de middleware.
 */
export default function ObservabilidadeMovedPage() {
  redirect('/dashboard');
}
