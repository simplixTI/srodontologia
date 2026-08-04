import type { Metadata, Viewport } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { SITE } from '@/lib/utils';

const sans = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap'
});

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap'
});

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.positioning} | Laboratório CAD/CAM`,
    template: `%s · ${SITE.name}`
  },
  description:
    'SR Digital é um laboratório de prótese odontológica CAD/CAM com fluxo 100% digital. Também atua como Planning Center para cirurgia guiada, carga imediata e reabilitações sobre implantes.',
  keywords: [
    'SR Digital Center',
    'Laboratório CAD/CAM',
    'Prótese odontológica digital',
    'Planning Center',
    'Cirurgia Guiada',
    'Carga imediata',
    'Reabilitação sobre implantes',
    'Impressão 3D odontológica',
    'Fresagem',
    'Escaneamento Intraoral',
    'SR Digital',
    'SR Odontologia Digital'
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.positioning}`,
    description:
      'Onde engenharia digital encontra excelência clínica. Planejamento, CAD/CAM, impressão 3D e fresagem para casos previsíveis.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SR Digital — SR Digital Center'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.positioning}`,
    description:
      'Planejamento, CAD/CAM, impressão 3D e fresagem para reabilitações implantossuportadas previsíveis.',
    images: ['/og-image.jpg']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  alternates: {
    canonical: SITE.url
  }
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalBusiness',
  name: SITE.name,
  alternateName: 'SR Odontologia Digital',
  description:
    'SR Digital Center: laboratório CAD/CAM + Planning Center para cirurgia guiada, carga imediata e reabilitações sobre implantes.',
  url: SITE.url,
  telephone: SITE.whatsappDisplay,
  email: SITE.email,
  image: `${SITE.url}/og-image.jpg`,
  logo: `${SITE.url}/logo.jpeg`,
  areaServed: 'BR',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'BR',
    addressRegion: 'MG',
    addressLocality: 'Belo Horizonte'
  },
  sameAs: [SITE.instagram]
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
