/**
 * SLA helpers — case delivery timing.
 * Pure functions, safe for client and server.
 */

export type SlaStatus =
  | 'no_date'
  | 'delivered_ok'
  | 'delivered_late'
  | 'due_today'
  | 'at_risk'      // ≤ 2 days remaining
  | 'on_track'
  | 'overdue';

export type SlaInfo = {
  status: SlaStatus;
  daysDiff: number | null;    // >0 = days until due, <0 = days late, 0 = today
  label: string;
  tone: 'emerald' | 'teal' | 'amber' | 'rose' | 'neutral';
};

function daysBetween(a: Date, b: Date): number {
  const MS_DAY = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((utcA - utcB) / MS_DAY);
}

export function calcSla(input: {
  requestedDeliveryDate: string | null;
  estimatedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  internalStatus: string;
  now?: Date;
}): SlaInfo {
  const now = input.now ?? new Date();
  const target = input.estimatedDeliveryDate ?? input.requestedDeliveryDate;

  // Case already terminated
  if (input.actualDeliveryDate) {
    if (!target) {
      return { status: 'delivered_ok', daysDiff: null, label: 'Entregue', tone: 'emerald' };
    }
    const late = daysBetween(new Date(input.actualDeliveryDate), new Date(target));
    if (late > 0) {
      return {
        status: 'delivered_late',
        daysDiff: -late,
        label: `Entregue ${late}d atrasado`,
        tone: 'amber'
      };
    }
    return { status: 'delivered_ok', daysDiff: -late, label: 'Entregue no prazo', tone: 'emerald' };
  }

  if (['completed', 'cancelled', 'delivered'].includes(input.internalStatus)) {
    return { status: 'delivered_ok', daysDiff: null, label: 'Concluído', tone: 'emerald' };
  }

  if (!target) {
    return { status: 'no_date', daysDiff: null, label: 'Sem prazo definido', tone: 'neutral' };
  }

  const diff = daysBetween(new Date(target), now);
  if (diff < 0) {
    return {
      status: 'overdue',
      daysDiff: diff,
      label: `${Math.abs(diff)}d atrasado`,
      tone: 'rose'
    };
  }
  if (diff === 0) {
    return { status: 'due_today', daysDiff: 0, label: 'Vence hoje', tone: 'amber' };
  }
  if (diff <= 2) {
    return { status: 'at_risk', daysDiff: diff, label: `${diff}d restantes`, tone: 'amber' };
  }
  return { status: 'on_track', daysDiff: diff, label: `${diff}d restantes`, tone: 'teal' };
}

export function slaBadgeClass(tone: SlaInfo['tone']): string {
  const base =
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.55rem] uppercase tracking-[0.28em]';
  switch (tone) {
    case 'emerald': return `${base} border-emerald-400/30 bg-emerald-400/10 text-emerald-200`;
    case 'teal':    return `${base} border-teal-400/30 bg-teal-400/10 text-teal-200`;
    case 'amber':   return `${base} border-amber-400/30 bg-amber-400/10 text-amber-200`;
    case 'rose':    return `${base} border-rose-400/30 bg-rose-400/10 text-rose-200`;
    case 'neutral': return `${base} border-white/10 bg-white/[0.02] text-white/50`;
  }
}
