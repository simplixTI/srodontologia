'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, LockKeyhole, Shield, Sparkles } from 'lucide-react';
import { LogoLockup } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

export default function AdminPage() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-black">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(600px_400px_at_50%_20%,rgba(201,162,75,0.14),transparent_70%)]" />
      </div>

      {/* Top bar */}
      <header className="border-b border-gold/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
          <LogoLockup />
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.32em] text-white/60 transition hover:text-gold-100"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-translate-x-0.5"
              strokeWidth={1.5}
            />
            Voltar ao site
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100svh-92px)] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center md:px-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/[0.06] px-4 py-1.5 backdrop-blur"
        >
          <Sparkles className="h-3 w-3 text-gold-300" strokeWidth={1.5} />
          <span className="text-[0.6rem] uppercase tracking-[0.35em] text-gold-100">
            Painel Administrativo
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 font-display text-5xl leading-[1.05] tracking-tight text-white md:text-7xl"
        >
          Em <span className="gold-text">construção.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.9 }}
          className="mt-8 max-w-xl text-white/60 md:text-lg"
        >
          Aqui viverá o CRM interno da SR Digital — gestão de casos,
          dentistas parceiros, fluxo de produção e comunicação técnica.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9 }}
          className="mt-12 grid w-full max-w-2xl gap-4 sm:grid-cols-3"
        >
          {[
            { icon: LockKeyhole, label: 'Login seguro' },
            { icon: Shield, label: 'Dados criptografados' },
            { icon: Sparkles, label: 'CRM integrado' }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-gold/10 bg-white/[0.02] px-4 py-6 backdrop-blur"
              >
                <Icon
                  className="mx-auto h-5 w-5 text-gold-100"
                  strokeWidth={1.4}
                />
                <div className="mt-3 text-[0.6rem] uppercase tracking-[0.3em] text-white/60">
                  {item.label}
                </div>
              </div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.9 }}
          className="mt-12"
        >
          <Button as="a" href="/" size="lg">
            Voltar ao site
          </Button>
        </motion.div>
      </section>
    </main>
  );
}
