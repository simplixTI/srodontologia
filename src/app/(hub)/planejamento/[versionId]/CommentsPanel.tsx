'use client';

import { useState, useTransition } from 'react';
import { Lock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { addCommentAction } from '@/features/planning/actions';
import type { PlanningComment } from '@/features/planning/types';

type Props = { versionId: string; initialComments: PlanningComment[] };

export function CommentsPanel({ versionId, initialComments }: Props) {
  const [comments, setComments] = useState<PlanningComment[]>(initialComments);
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(true);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!body.trim()) return;
    startTransition(async () => {
      try {
        await addCommentAction({
          planning_version_id: versionId,
          body: body.trim(),
          is_internal: isInternal
        });
        setComments((c) => [
          ...c,
          {
            id: `tmp-${Date.now()}`,
            organization_id: '',
            planning_version_id: versionId,
            author_id: null,
            is_internal: isInternal,
            body: body.trim(),
            created_at: new Date().toISOString(),
            author_name: 'Você'
          }
        ]);
        setBody('');
        toast.success('Comentário adicionado');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
      <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">
        Comentários ({comments.length})
      </h2>

      {comments.length === 0 ? (
        <div className="mb-4 text-sm text-white/40">Sem comentários ainda.</div>
      ) : (
        <ul className="mb-4 space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className={
                'rounded-xl border p-3 ' +
                (c.is_internal
                  ? 'border-amber-400/20 bg-amber-400/[0.03]'
                  : 'border-blue-400/20 bg-blue-400/[0.03]')
              }
            >
              <div className="flex items-center justify-between text-[0.6rem] text-white/50">
                <span className="inline-flex items-center gap-1">
                  {c.is_internal ? (
                    <>
                      <Lock className="h-3 w-3 text-amber-200" strokeWidth={1.5} /> Interno
                    </>
                  ) : (
                    <>
                      <Users className="h-3 w-3 text-blue-200" strokeWidth={1.5} /> Visível ao dentista
                    </>
                  )}
                  {c.author_name && <span className="ml-2 text-white/40">· {c.author_name}</span>}
                </span>
                <span>{new Date(c.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva um comentário..."
          rows={3}
          className="input-dark rounded-xl px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/40 accent-gold-300"
            />
            Apenas time interno
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !body.trim()}
            className="btn-gold h-9 rounded-full px-5 text-[0.65rem] uppercase tracking-[0.22em]"
          >
            Comentar
          </button>
        </div>
      </div>
    </section>
  );
}
