'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 800);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          onClick={() =>
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
          aria-label="Voltar ao topo"
          className="group fixed bottom-24 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-black/60 text-gold-100 backdrop-blur-md transition hover:border-gold/70 hover:bg-black/80 hover:text-white md:h-12 md:w-12"
        >
          <ArrowUp
            className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5"
            strokeWidth={1.5}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
