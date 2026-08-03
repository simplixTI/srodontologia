'use client';

import { motion } from 'framer-motion';

const phrases = [
  'Onde engenharia digital encontra excelência clínica.',
  'Mais do que fabricar próteses. Planejamos resultados.',
  'Cada caso começa com estratégia, termina com precisão.',
  'Seu parceiro em Implantodontia Digital.',
  'Tecnologia que transforma planejamento em previsibilidade.'
];

export function Manifesto() {
  const items = [...phrases, ...phrases];
  return (
    <section className="relative overflow-hidden border-y border-gold/10 py-12 md:py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(600px_150px_at_50%_50%,rgba(201,162,75,0.08),transparent_70%)]" />

      <div className="marquee relative overflow-hidden">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          {items.map((phrase, i) => (
            <span
              key={i}
              className="mx-8 flex items-center gap-8 font-display text-2xl text-white/70 md:text-4xl"
            >
              {phrase}
              <span className="inline-flex h-2 w-2 rotate-45 bg-gold-gradient" />
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
