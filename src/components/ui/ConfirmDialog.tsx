'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './Dialog';

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
};

type Ctx = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ctx | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ title: '' });
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm: Ctx = useCallback((options) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = (value: boolean) => {
    setOpen(false);
    resolverRef.current?.(value);
    resolverRef.current = null;
  };

  const isDanger = opts.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose(false))}>
        <DialogContent>
          <DialogHeader>
            <div
              className={
                'mb-3 grid h-11 w-11 place-items-center rounded-full border ' +
                (isDanger
                  ? 'border-rose-400/30 bg-rose-400/10'
                  : 'border-gold/25 bg-gold/10')
              }
            >
              <AlertTriangle
                className={isDanger ? 'h-4 w-4 text-rose-200' : 'h-4 w-4 text-gold-100'}
                strokeWidth={1.5}
              />
            </div>
            <DialogTitle>{opts.title}</DialogTitle>
            {opts.description && <DialogDescription>{opts.description}</DialogDescription>}
          </DialogHeader>

          <DialogFooter>
            <button
              onClick={() => handleClose(false)}
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-5 text-[0.65rem] uppercase tracking-[0.28em] text-white/70 transition hover:border-gold/40 hover:text-white"
            >
              {opts.cancelLabel ?? 'Cancelar'}
            </button>
            <button
              onClick={() => handleClose(true)}
              className={
                isDanger
                  ? 'inline-flex h-10 items-center justify-center rounded-full border border-rose-400/40 bg-rose-400/10 px-5 text-[0.65rem] uppercase tracking-[0.28em] text-rose-200 transition hover:bg-rose-400/20'
                  : 'btn-gold inline-flex h-10 items-center justify-center rounded-full px-5 text-[0.65rem] uppercase tracking-[0.24em]'
              }
            >
              {opts.confirmLabel ?? 'Confirmar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}
