'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TechnicianSkill } from '@/features/technicians/types';
import { addSkillAction, removeSkillAction } from '@/features/technicians/actions';
import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  type SkillLevel
} from '@/lib/validations/production';

type Props = { technicianId: string; initialSkills: TechnicianSkill[] };

export function SkillsPanel({ technicianId, initialSkills }: Props) {
  const [skills, setSkills] = useState<TechnicianSkill[]>(initialSkills);
  const [skill, setSkill] = useState('');
  const [level, setLevel] = useState<SkillLevel>('intermediate');
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!skill.trim()) return;
    startTransition(async () => {
      try {
        await addSkillAction(technicianId, skill.trim(), level);
        setSkills((s) => [
          {
            id: `tmp-${Date.now()}`,
            technician_id: technicianId,
            skill: skill.trim(),
            level,
            created_at: new Date().toISOString()
          },
          ...s
        ]);
        setSkill('');
        toast.success('Habilidade adicionada');
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      try {
        await removeSkillAction(id, technicianId);
        setSkills((s) => s.filter((x) => x.id !== id));
      } catch (e) {
        toast.error('Falha', { description: (e as Error).message });
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-5">
      <h2 className="mb-3 text-[0.6rem] uppercase tracking-[0.32em] text-gold-100">Habilidades</h2>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-1 flex-col gap-1 text-xs text-white/60">
          Nome
          <input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="ex: CAD/CAM Zircônia"
            className="input-dark h-9 rounded-xl px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1 text-xs text-white/60">
          Nível
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as SkillLevel)}
            className="input-dark h-9 rounded-xl px-3 text-sm"
          >
            {SKILL_LEVELS.map((l) => (
              <option key={l} value={l}>
                {SKILL_LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending || !skill.trim()}
          className="btn-gold inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.65rem] uppercase tracking-[0.22em]"
        >
          <Plus className="h-3 w-3" strokeWidth={2} /> Adicionar
        </button>
      </div>

      {skills.length === 0 ? (
        <div className="text-sm text-white/40">Nenhuma habilidade cadastrada.</div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <li
              key={s.id}
              className="inline-flex items-center gap-2 rounded-full border border-gold/10 bg-black/40 px-3 py-1 text-xs text-white/80"
            >
              {s.skill}
              <span className="text-[0.55rem] text-white/40">· {SKILL_LEVEL_LABELS[s.level]}</span>
              <button
                type="button"
                onClick={() => handleRemove(s.id)}
                className="text-white/40 hover:text-red-300"
                aria-label="Remover"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
