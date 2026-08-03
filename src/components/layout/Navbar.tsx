'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageCircle } from 'lucide-react';
import { LogoLockup } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { cn, whatsappLink } from '@/lib/utils';

const links = [
  { label: 'Diferenciais', href: '#diferenciais' },
  { label: 'Processo', href: '#processo' },
  { label: 'Tecnologia', href: '#tecnologia' },
  { label: 'Casos', href: '#casos' },
  { label: 'Depoimentos', href: '#depoimentos' },
  { label: 'Contato', href: '#contato' }
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed top-0 z-50 w-full transition-all duration-500',
          scrolled
            ? 'border-b border-gold/10 bg-black/70 backdrop-blur-xl'
            : 'bg-transparent'
        )}
      >
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6 md:px-10">
          <a href="#top" className="group inline-flex items-center">
            <LogoLockup width={120} priority />
          </a>

          <nav className="hidden items-center gap-10 lg:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group relative text-[0.72rem] uppercase tracking-[0.28em] text-white/70 transition-colors hover:text-white"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-gold transition-all duration-500 group-hover:w-full" />
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/25 text-gold-100 transition hover:border-gold/70 hover:bg-gold/10 hover:text-gold-50"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
            </a>
          </div>

          <button
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/20 text-white transition hover:border-gold/60 hover:text-gold-100 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-2xl lg:hidden"
          >
            <div className="flex h-24 items-center justify-between px-6">
              <LogoLockup width={110} />
              <button
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2 px-6 pt-10">
              {links.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.6 }}
                  className="flex items-baseline justify-between border-b border-gold/10 py-6 font-display text-3xl text-white"
                >
                  <span>{link.label}</span>
                  <span className="text-[0.6rem] tracking-[0.35em] text-gold/60">
                    0{i + 1}
                  </span>
                </motion.a>
              ))}
              <div className="mt-10">
                <Button
                  as="a"
                  href={whatsappLink()}
                  target="_blank"
                  rel="noreferrer"
                  size="lg"
                  className="w-full"
                >
                  Falar no WhatsApp
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
