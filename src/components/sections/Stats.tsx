'use client';

import { motion, useInView, useMotionValue, animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

type Stat = {
  value: number;
  suffix: string;
  label: string;
  hint: string;
};

const stats: Stat[] = [
  {
    value: 500,
    suffix: '+',
    label: 'Casos planejados',
    hint: 'Reabilitações digitais entregues'
  },
  {
    value: 120,
    suffix: '+',
    label: 'Dentistas parceiros',
    hint: 'Clínicas em todo o Brasil'
  },
  {
    value: 20,
    suffix: 'µm',
    label: 'Precisão digital',
    hint: 'Fresagem em 5 eixos'
  },
  {
    value: 10,
    suffix: 'y',
    label: 'Anos de experiência',
    hint: 'Em fluxos digitais'
  }
];

export function Stats() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid gap-8 md:grid-cols-4 md:gap-4">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);
  const mv = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, stat.value, {
      duration: 2.4,
      ease: [0.22, 1, 0.36, 1]
    });
    const unsub = mv.on('change', (v) => setDisplay(Math.round(v)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, stat.value, mv]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.1,
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="group relative flex flex-col items-start rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.03] to-transparent p-8 card-hover"
    >
      <span className="text-[0.55rem] uppercase tracking-[0.35em] text-white/40">
        0{index + 1}
      </span>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="stat-number font-display text-6xl leading-none text-white md:text-7xl">
          {display}
        </span>
        <span className="gold-text font-display text-3xl">{stat.suffix}</span>
      </div>

      <div className="gold-hairline mt-6 w-full" />

      <div className="mt-6">
        <div className="text-sm font-medium text-white">{stat.label}</div>
        <div className="mt-1 text-xs text-white/50">{stat.hint}</div>
      </div>
    </motion.div>
  );
}
