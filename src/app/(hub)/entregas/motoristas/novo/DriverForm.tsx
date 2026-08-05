'use client';

import { useFormState } from 'react-dom';
import { createDriverAction, type ActionState } from '@/features/deliveries-v2/actions';
import { DRIVER_STATUS_LABELS } from '@/features/deliveries-v2/types';

const initial: ActionState = { ok: false };

export function DriverForm() {
  const [state, formAction] = useFormState(createDriverAction, initial);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Nome completo *" name="full_name" required />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Telefone" name="phone" />
        <Field label="Documento (CPF/CNH)" name="document" />
        <Field label="Placa do veículo" name="vehicle_plate" />
        <Field label="Modelo do veículo" name="vehicle_model" />
      </div>
      <label className="flex flex-col gap-1 text-xs text-white/60">
        Status
        <select name="status" defaultValue="active" className="input-dark h-10 rounded-xl px-3 text-sm">
          {(['active', 'inactive', 'vacation', 'on_leave'] as const).map((s) => (
            <option key={s} value={s}>
              {DRIVER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-white/60">
        Anotações
        <textarea name="notes" rows={3} className="input-dark rounded-xl px-3 py-2 text-sm" />
      </label>
      {state.error && (
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      )}
      <button type="submit" className="btn-gold h-11 rounded-full px-6 text-[0.7rem] uppercase tracking-[0.22em]">
        Cadastrar
      </button>
    </form>
  );
}

function Field({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-white/60">
      {label}
      <input
        name={name}
        required={required}
        className="input-dark h-10 rounded-xl px-3 text-sm"
      />
    </label>
  );
}
