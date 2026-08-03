import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SITE = {
  name: 'SR Digital',
  positioning: 'Digital Implant Center',
  tagline: 'Precisão Digital para Reabilitações Implantossuportadas',
  manifesto: 'Mais do que fabricar próteses. Planejamos resultados.',
  url: 'https://srdigital.com.br',
  whatsapp: '5532991651437',
  whatsappDisplay: '+55 (32) 99165-1437',
  email: 'contato@srdigital.com.br',
  address: 'Belo Horizonte · Minas Gerais · Brasil',
  instagram: 'https://www.instagram.com/srodontologiadigital/',
  instagramHandle: '@srodontologiadigital',
  responsible: 'Dra. Thainara Salgueiro · CRO-MG 40.844 · LP0648'
};

export const whatsappLink = (message = 'Olá SR Digital, gostaria de agendar uma apresentação.') =>
  `https://api.whatsapp.com/send?phone=${SITE.whatsapp}&text=${encodeURIComponent(message)}`;
