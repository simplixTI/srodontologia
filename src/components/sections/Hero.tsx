'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { whatsappLink } from '@/lib/utils';
import { ArrowDown, Sparkles } from 'lucide-react';

const capabilities = [
  'CAD/CAM',
  'Cirurgia Guiada',
  'Impressão 3D',
  'Escaneamento Intraoral',
  'Fresagem'
];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start']
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-[100svh] items-center overflow-hidden pt-28"
    >
      {/* Layered background */}
      <div className="absolute inset-0 -z-10">
        {/* Deep radial gold */}
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-20%,rgba(201,162,75,0.12),transparent_60%)]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-grid opacity-60" />
        {/* Vertical fade */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-black" />

        {/* Rotating gold ring */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 -z-10 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/5"
          animate={{ rotate: -360 }}
          transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
        />

        {/* Floating dot particles */}
        {!reduce &&
          Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-gold/50"
              style={{
                left: `${(i * 53) % 100}%`,
                top: `${(i * 37) % 100}%`
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.8, 0.2]
              }}
              transition={{
                duration: 4 + (i % 5),
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut'
              }}
            />
          ))}
      </div>

      <motion.div
        style={{ y, opacity }}
        className="relative mx-auto grid w-full max-w-7xl grid-cols-12 gap-6 px-6 md:px-10"
      >
        {/* Left side text */}
        <div className="col-span-12 lg:col-span-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="flex items-center gap-3"
          >
            <span className="inline-flex h-8 items-center gap-2 rounded-full border border-gold/25 bg-gold/5 px-4 backdrop-blur">
              <Sparkles className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
              <span className="text-[0.6rem] uppercase tracking-[0.35em] text-gold-100">
                Digital Implant Center
              </span>
            </span>
            <span className="hidden text-[0.6rem] uppercase tracking-[0.35em] text-white/40 md:inline">
              Belo Horizonte · MG
            </span>
          </motion.div>

          <h1 className="mt-8 font-display text-[3rem] font-light leading-[1] tracking-[-0.03em] text-white sm:text-[4rem] md:text-[5.5rem] lg:text-[6.75rem]">
            <SplitWord text="Precisão" delay={0.35} />
            <br />
            <SplitWord text="Digital" gold delay={0.55} />
            <br />
            <span className="font-display text-[1.6rem] tracking-[-0.02em] text-white/70 sm:text-[2rem] md:text-[2.4rem]">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 1 }}
                className="inline-block"
              >
                para reabilitações implantossuportadas.
              </motion.span>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.9 }}
            className="mt-10 max-w-xl text-base leading-relaxed text-white/60 md:text-lg"
          >
            Mais do que fabricar próteses,{' '}
            <span className="text-white">planejamos resultados</span>.
            Planejamento digital, CAD/CAM, impressão 3D e fresagem — tudo no
            mesmo fluxo, com suporte especializado para tornar seus casos mais
            previsíveis.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.9 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <Button
              as="a"
              href={whatsappLink(
                'Olá SR Digital, quero agendar uma apresentação para conhecer o fluxo digital.'
              )}
              target="_blank"
              rel="noreferrer"
              size="lg"
              variant="gold"
            >
              Agendar Apresentação
            </Button>
            <Button
              as="a"
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              size="lg"
              variant="ghost"
              icon={false}
            >
              Falar no WhatsApp
            </Button>
          </motion.div>

          {/* Capability marquee */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="mt-14 flex items-center gap-4"
          >
            <span className="eyebrow shrink-0">Fluxo 100% Digital</span>
            <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 1 }}
            className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.7rem] uppercase tracking-[0.28em] text-white/50"
          >
            {capabilities.map((c, i) => (
              <span key={c} className="inline-flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-gold/60" />
                {c}
                {i < capabilities.length - 1 && (
                  <span className="ml-6 hidden text-white/20 md:inline">·</span>
                )}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Right side vertical index */}
        <div className="col-span-12 hidden lg:col-span-4 lg:flex lg:justify-end">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1 }}
            className="glass-strong relative h-fit w-full max-w-xs overflow-hidden rounded-3xl p-6"
          >
            {/* Shine */}
            <div className="pointer-events-none absolute inset-0 bg-gold-shine bg-[length:200%_100%] opacity-40 animate-shimmer" />

            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-[0.55rem] uppercase tracking-[0.35em] text-white/60">
                  Sistema Ativo · 24/7
                </span>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-6">
                <MiniStat label="Casos planejados" value="500+" />
                <MiniStat label="Precisão" value="±20µm" />
                <MiniStat label="Dentistas" value="120+" />
                <MiniStat label="Anos" value="10" />
              </div>

              <div className="gold-hairline mt-8" />

              <div className="mt-6 flex items-start gap-3">
                <div className="mt-1 h-9 w-9 shrink-0 rounded-full border border-gold/30 bg-gold/5 p-2">
                  <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
                    <path
                      d="M12 2L14 8L20 8L15 12L17 18L12 14L7 18L9 12L4 8L10 8L12 2Z"
                      stroke="url(#g)"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#F0DEA9" />
                        <stop offset="100%" stopColor="#8E6B2A" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div>
                  <div className="text-[0.6rem] uppercase tracking-[0.32em] text-white/40">
                    Manifesto
                  </div>
                  <p className="mt-2 font-display text-lg leading-snug text-white/90">
                    Onde engenharia digital encontra excelência clínica.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex"
      >
        <span className="text-[0.55rem] uppercase tracking-[0.4em] text-white/40">
          Explore
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-gold-300"
        >
          <ArrowDown className="h-4 w-4" strokeWidth={1.5} />
        </motion.div>
      </motion.div>
    </section>
  );
}

function SplitWord({
  text,
  delay = 0,
  gold = false
}: {
  text: string;
  delay?: number;
  gold?: boolean;
}) {
  return (
    <span className={`inline-block overflow-hidden align-bottom`}>
      <motion.span
        initial={{ y: '110%' }}
        animate={{ y: '0%' }}
        transition={{ delay, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className={`inline-block ${gold ? 'gold-text' : ''}`}
      >
        {text}
      </motion.span>
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-3xl text-white">{value}</div>
      <div className="mt-1 text-[0.55rem] uppercase tracking-[0.3em] text-white/50">
        {label}
      </div>
    </div>
  );
}
