'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const pillars = [
  {
    title: 'Redução de ajustes clínicos',
    body: 'Casos entregues com precisão de adaptação e previsibilidade do planejamento digital.'
  },
  {
    title: 'Maior segurança para o dentista',
    body: 'Planejamento reverso e discussão técnica antes da execução — sem improviso.'
  },
  {
    title: 'Maior conforto para o paciente',
    body: 'Menos cadeiras, menos provas, resultados estéticos e funcionais previsíveis.'
  },
  {
    title: 'Comunicação técnica constante',
    body: 'Um interlocutor dedicado ao seu caso do briefing à entrega definitiva.'
  }
];

export function Differential() {
  return (
    <section className="relative overflow-hidden py-32 md:py-40">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_50%_50%,rgba(201,162,75,0.06),transparent_70%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_1fr] lg:gap-24">
          <div>
            <div className="flex items-center gap-4">
              <span className="font-display text-sm text-gold-300">[ 04 ]</span>
              <span className="h-px w-8 bg-gold/50" />
              <span className="eyebrow">Nosso diferencial</span>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 font-display text-4xl leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl"
            >
              Ao invés de <span className="gold-text">fabricar próteses</span>,
              entregamos previsibilidade.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="mt-8 max-w-lg text-lg leading-relaxed text-white/60"
            >
              Seu parceiro em Odontologia Digital. Um Planning Center e
              Laboratório de Prótese Digital desenvolvido para atender todas
              as especialidades odontológicas, transformando cada caso em um
              projeto técnico com previsibilidade, precisão e excelência.
            </motion.p>

            {/* Signature block */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.4 }}
              className="mt-12 flex items-center gap-6"
            >
              <div className="h-14 w-14 rounded-full border border-gold/30 bg-gold/5 p-1">
                <div className="flex h-full w-full items-center justify-center rounded-full border border-gold/20 font-display text-lg text-gold-100">
                  TS
                </div>
              </div>
              <div>
                <div className="text-sm text-white/90">Dra. Thainara Salgueiro</div>
                <div className="text-[0.6rem] uppercase tracking-[0.3em] text-white/50">
                  Responsável Técnica · CRO-MG 40.844
                </div>
              </div>
            </motion.div>
          </div>

          {/* Pillars list */}
          <div className="relative">
            {/* Decorative vertical rail */}
            <div className="absolute left-4 top-2 h-full w-px bg-gradient-to-b from-gold/60 via-gold/20 to-transparent md:left-6" />

            <div className="flex flex-col gap-8">
              {pillars.map((p, i) => (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className="relative pl-14 md:pl-20"
                >
                  {/* Node */}
                  <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 bg-black md:h-12 md:w-12">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-gradient text-black md:h-7 md:w-7">
                      <Check className="h-3 w-3 md:h-4 md:w-4" strokeWidth={2.5} />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <h3 className="font-display text-xl text-white md:text-2xl">
                      {p.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {p.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
