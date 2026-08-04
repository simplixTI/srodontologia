import type { CustomerStatus } from '@/lib/validations/dentists';

const base =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.28em]';

export function statusColor(status: CustomerStatus): string {
  switch (status) {
    case 'lead':
      return `${base} border-white/15 bg-white/[0.03] text-white/60`;
    case 'contacted':
      return `${base} border-sky-400/30 bg-sky-400/10 text-sky-200`;
    case 'presentation_scheduled':
    case 'presentation_completed':
      return `${base} border-indigo-400/30 bg-indigo-400/10 text-indigo-200`;
    case 'first_case':
      return `${base} border-teal-400/30 bg-teal-400/10 text-teal-200`;
    case 'active_customer':
      return `${base} border-emerald-400/30 bg-emerald-400/10 text-emerald-200`;
    case 'premium_customer':
      return `${base} border-gold/40 bg-gold/10 text-gold-100`;
    case 'inactive_customer':
      return `${base} border-white/10 bg-white/[0.02] text-white/40`;
    case 'lost':
      return `${base} border-rose-400/30 bg-rose-400/10 text-rose-200`;
  }
}
