import Link from 'next/link';
import { LogoLockup } from '@/components/ui/Logo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { NotConfiguredScreen } from '@/components/hub/NotConfiguredScreen';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <NotConfiguredScreen />;

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-black">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_500px_at_50%_-20%,rgba(201,162,75,0.16),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-black" />
      </div>

      <div className="mx-auto flex min-h-[100svh] max-w-md flex-col items-stretch px-6 py-10 md:py-16">
        <Link href="/" className="mx-auto mb-10 inline-flex">
          <LogoLockup width={130} priority />
        </Link>

        <div className="glass-strong relative rounded-3xl border-gold/15 p-8 md:p-10">
          {children}
        </div>

        <footer className="mt-10 text-center text-[0.55rem] uppercase tracking-[0.35em] text-white/30">
          SR HUB · Digital Implant Center
        </footer>
      </div>
    </main>
  );
}
