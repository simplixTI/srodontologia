'use client';

import {
  Instagram,
  Mail,
  MessageCircle,
  MapPin,
  Shield
} from 'lucide-react';
import { LogoLockup } from '@/components/ui/Logo';
import { SITE, whatsappLink } from '@/lib/utils';

const quickLinks = [
  { label: 'Diferenciais', href: '#diferenciais' },
  { label: 'Processo', href: '#processo' },
  { label: 'Tecnologia', href: '#tecnologia' },
  { label: 'Casos Clínicos', href: '#casos' },
  { label: 'Depoimentos', href: '#depoimentos' }
];

const capabilities = [
  'Laboratório CAD/CAM',
  'Cirurgia Guiada',
  'Escaneamento Intraoral',
  'Impressão 3D',
  'Fresagem'
];

export function Footer() {
  return (
    <footer
      id="contato"
      className="relative overflow-hidden border-t border-gold/10 bg-black pt-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gold/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <LogoLockup width={160} />
            <div className="mt-3 text-[0.55rem] tracking-[0.4em] text-white/40">
              DIGITAL · IMPLANT · CENTER
            </div>

            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">
              Onde engenharia digital encontra excelência clínica.
              Planejamento, CAD/CAM, impressão 3D e fresagem para casos
              previsíveis do início ao fim.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-gold/20 px-4 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-white/70 transition hover:border-gold/60 hover:text-gold-100"
              >
                <Instagram className="h-3.5 w-3.5" strokeWidth={1.5} />
                Instagram
              </a>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-gold/20 px-4 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-white/70 transition hover:border-gold/60 hover:text-gold-100"
              >
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                WhatsApp
              </a>
              <a
                href="/admin"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-white/50 transition hover:border-gold/40 hover:text-white/80"
              >
                <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
                Painel Administrativo
              </a>
            </div>
          </div>

          <div>
            <div className="eyebrow">Navegação</div>
            <ul className="mt-6 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-white/70 transition hover:text-gold-100"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="eyebrow">Capacidades</div>
            <ul className="mt-6 space-y-3">
              {capabilities.map((c) => (
                <li key={c} className="flex items-center gap-2 text-sm text-white/70">
                  <span className="h-px w-3 bg-gold/60" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="eyebrow">Contato</div>
            <ul className="mt-6 space-y-4">
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-3 text-sm text-white/80 transition hover:text-gold-100"
                >
                  <MessageCircle
                    className="mt-0.5 h-4 w-4 text-gold-300"
                    strokeWidth={1.5}
                  />
                  <span>
                    <span className="block text-[0.6rem] uppercase tracking-[0.3em] text-white/40">
                      WhatsApp
                    </span>
                    {SITE.whatsappDisplay}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE.email}`}
                  className="group flex items-start gap-3 text-sm text-white/80 transition hover:text-gold-100"
                >
                  <Mail
                    className="mt-0.5 h-4 w-4 text-gold-300"
                    strokeWidth={1.5}
                  />
                  <span>
                    <span className="block text-[0.6rem] uppercase tracking-[0.3em] text-white/40">
                      Email
                    </span>
                    {SITE.email}
                  </span>
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3 text-sm text-white/80">
                  <MapPin
                    className="mt-0.5 h-4 w-4 text-gold-300"
                    strokeWidth={1.5}
                  />
                  <span>
                    <span className="block text-[0.6rem] uppercase tracking-[0.3em] text-white/40">
                      Endereço
                    </span>
                    {SITE.address}
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="gold-hairline mt-16" />

        <div className="flex flex-col-reverse items-start justify-between gap-6 py-8 md:flex-row md:items-center">
          <div className="text-[0.65rem] uppercase tracking-[0.3em] text-white/40">
            © {new Date().getFullYear()} {SITE.name} · Todos os direitos reservados
          </div>
          <div className="text-[0.65rem] uppercase tracking-[0.3em] text-white/40">
            Resp. Técnica: {SITE.responsible}
          </div>
        </div>
      </div>
    </footer>
  );
}
