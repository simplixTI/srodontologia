# SR Digital — Digital Implant Center

Site institucional premium da **SR Digital**, um Digital Implant Center especializado em reabilitações implantossuportadas com fluxo 100% digital: planejamento clínico, CAD/CAM, impressão 3D e fresagem de alta precisão.

> Mais do que fabricar próteses. Planejamos resultados.

## Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- TypeScript
- TailwindCSS 3.4 + `tailwindcss-animate`
- Framer Motion
- Lucide Icons
- Radix Primitives (via shadcn patterns)

## Estrutura

```
src/
├── app/
│   ├── layout.tsx        # Root layout, fonts, SEO, Schema.org
│   ├── page.tsx          # Home
│   ├── admin/page.tsx    # Placeholder do futuro CRM interno
│   └── globals.css       # Design tokens + primitives
├── components/
│   ├── layout/           # Navbar, Footer, CustomCursor, WhatsAppFloat, BackToTop
│   ├── sections/         # Hero, WhyUs, HowItWorks, Manifesto, Technology,
│   │                     # Differential, Cases, Testimonials, Stats, CTA
│   └── ui/               # Button, Reveal, SectionHeader, Logo
└── lib/utils.ts          # Helpers + tokens (SITE, whatsappLink)
```

## Desenvolvimento

```bash
npm install
npm run dev
```

App em `http://localhost:3000`.

## Build de produção

```bash
npm run build
npm run start
```

## Configuração

Ajuste os dados de contato em [`src/lib/utils.ts`](src/lib/utils.ts):

```ts
export const SITE = {
  name: 'SR Digital',
  positioning: 'Digital Implant Center',
  whatsapp: '5531999999999',       // troque pelo número real (DDI+DDD+número)
  whatsappDisplay: '+55 (31) 99999-9999',
  email: 'contato@srdigital.com.br',
  instagram: 'https://www.instagram.com/srodontologiadigital/',
  responsible: 'Dra. Thainara Salgueiro · CRO-MG 40.844 · LP0648'
};
```

## Recursos

- Design totalmente responsivo
- SEO completo, Open Graph e JSON-LD (Schema.org `MedicalBusiness`)
- Cursor personalizado dourado com blend mode
- WhatsApp flutuante + Voltar ao topo
- Página `/admin` preparada para receber o CRM interno
- Preparado para blog e galeria de casos clínicos futuros

## Deploy

Compatível com Vercel, Netlify e qualquer host que execute Node 18+.

---

© SR Digital · Digital Implant Center
