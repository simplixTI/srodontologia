'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createManifestAction } from '@/features/deliveries-v2/actions';

export function CreateManifestButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      try {
        const { id } = await createManifestAction({});
        router.push(`/entregas/romaneios/${id}`);
      } catch (e) {
        toast.error('Falha ao criar romaneio', { description: (e as Error).message });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={create}
      disabled={pending}
      className="btn-gold inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.72rem] uppercase tracking-[0.22em]"
    >
      <Plus className="h-4 w-4" strokeWidth={2} /> Novo romaneio
    </button>
  );
}
