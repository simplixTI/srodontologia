'use client';

import { useRouter } from 'next/navigation';

export function FilterSelect({
  name,
  value,
  options,
  preserve
}: {
  name: string;
  value: string;
  options: readonly { key: string; label: string }[];
  preserve: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(preserve)) {
          if (v) params.set(k, v);
        }
        if (e.target.value) params.set(name, e.target.value);
        const qs = params.toString();
        router.push(qs ? `/casos?${qs}` : '/casos');
      }}
      className="h-8 rounded-lg border border-gold/15 bg-black/40 px-2 text-xs text-white focus:border-gold/50 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.key} value={o.key} className="bg-black">
          {o.label}
        </option>
      ))}
    </select>
  );
}
