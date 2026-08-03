'use client';

import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';

const testimonials = [
  {
    quote:
      'Hoje consigo instalar minhas próteses com muito mais previsibilidade. O nível de comunicação técnica é outro.',
    author: 'Dr. Renato M.',
    role: 'Implantodontista · Belo Horizonte',
    focus: 'ALL-ON-4'
  },
  {
    quote:
      'A qualidade e o suporte fazem toda a diferença. Casos que antes eram complexos se tornaram fluidos.',
    author: 'Dra. Ana P.',
    role: 'Cirurgiã-Dentista · Contagem',
    focus: 'Estética'
  },
  {
    quote:
      'É outro patamar de trabalho. Recebo o caso planejado, com relatório e sem retrabalhos.',
    author: 'Dr. Lucas F.',
    role: 'Implantodontista · Nova Lima',
    focus: 'Cirurgia Guiada'
  }
];

export function Testimonials() {
  return (
    <section
      id="depoimentos"
      className="relative overflow-hidden py-32 md:py-40"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-gold/[0.05] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-gold/[0.05] blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeader
          number="[ 06 ]"
          eyebrow="Depoimentos"
          align="center"
          title={
            <>
              A voz de quem <span className="gold-text">trabalha conosco.</span>
            </>
          }
          description="Dentistas que trocaram improviso por método. Terceirização por parceria técnica."
        />

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                delay: i * 0.12,
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1]
              }}
              className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-gold/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 backdrop-blur-md card-hover"
            >
              {/* Quote mark */}
              <Quote
                className="absolute right-6 top-6 h-16 w-16 text-gold/10 transition-colors duration-500 group-hover:text-gold/25"
                strokeWidth={1}
              />

              <div>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <span
                      key={s}
                      className="text-xs text-gold-300"
                      aria-hidden
                    >
                      ★
                    </span>
                  ))}
                </div>
                <blockquote className="relative mt-6 font-display text-2xl leading-snug text-white">
                  “{t.quote}”
                </blockquote>
              </div>

              <figcaption className="mt-10">
                <div className="gold-hairline mb-6" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {t.author}
                    </div>
                    <div className="mt-1 text-[0.6rem] uppercase tracking-[0.3em] text-white/50">
                      {t.role}
                    </div>
                  </div>
                  <span className="rounded-full border border-gold/25 px-3 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-gold-100">
                    {t.focus}
                  </span>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
