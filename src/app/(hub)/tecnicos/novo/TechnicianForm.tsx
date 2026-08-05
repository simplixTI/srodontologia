'use client';

import { useFormState } from 'react-dom';
import { createTechnicianAction, type ActionState } from '@/features/technicians/actions';
import { TECH_STATUSES, TECH_STATUS_LABELS } from '@/lib/validations/production';

type Profile = { id: string; full_name: string; email: string; role: string };

const initial: ActionState = { ok: false };

export function TechnicianForm({ profiles }: { profiles: Profile[] }) {
  const [state, formAction] = useFormState(createTechnicianAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Usuário" required>
        <select name="profile_id" required className="input-dark h-10 w-full rounded-xl px-3 text-sm">
          <option value="">Selecione</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} · {p.email} · {p.role}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Especialidade">
          <input
            name="specialty"
            placeholder="ex: Ceramista"
            className="input-dark h-10 w-full rounded-xl px-3 text-sm"
          />
        </Field>
        <Field label="Time / Célula">
          <input
            name="team"
            placeholder="ex: Prótese A"
            className="input-dark h-10 w-full rounded-xl px-3 text-sm"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Status">
          <select name="status" defaultValue="active" className="input-dark h-10 w-full rounded-xl px-3 text-sm">
            {TECH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TECH_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Carga semanal (h)">
          <input
            name="weekly_hours"
            type="number"
            min={1}
            max={80}
            defaultValue={40}
            className="input-dark h-10 w-full rounded-xl px-3 text-sm"
          />
        </Field>
        <Field label="Custo hora (R$)">
          <input
            name="hourly_cost"
            type="number"
            step="0.01"
            min={0}
            className="input-dark h-10 w-full rounded-xl px-3 text-sm"
          />
        </Field>
      </div>

      <Field label="Anotações">
        <textarea
          name="notes"
          rows={4}
          className="input-dark w-full rounded-xl px-3 py-2 text-sm"
        />
      </Field>

      {state.error && (
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          className="btn-gold h-11 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]"
        >
          Cadastrar
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-white/60">
      {label}
      {required && <span className="text-red-300"> *</span>}
      {children}
    </label>
  );
}
