import type { Company } from './types.js';

/**
 * Companies polled one at a time. To add one, append an entry — `token` is the
 * board slug in the ATS URL and `domain` supplies the logo. Gupy is covered
 * network-wide by the portal connector (`connectors/gupyPortal.ts`), so Gupy
 * companies are not listed here. See README.md.
 */
export const companies: Company[] = [
  // Greenhouse
  { name: 'Nubank', ats: 'greenhouse', token: 'nubank', domain: 'nubank.com.br' },
  { name: 'XP Inc', ats: 'greenhouse', token: 'xpinc', domain: 'xpi.com.br' },
  { name: 'C6 Bank', ats: 'greenhouse', token: 'c6bank', domain: 'c6bank.com.br' },
  { name: 'iFood', ats: 'greenhouse', token: 'ifoodcarreiras', domain: 'ifood.com.br' },
  { name: 'VTEX', ats: 'greenhouse', token: 'vtex', domain: 'vtex.com' },
  { name: 'Wellhub', ats: 'greenhouse', token: 'gympass', domain: 'wellhub.com' },
  { name: 'EBANX', ats: 'greenhouse', token: 'ebanx', domain: 'ebanx.com' },
  { name: 'QuintoAndar', ats: 'greenhouse', token: 'quintoandar', domain: 'quintoandar.com.br' },
  {
    name: 'Wildlife Studios',
    ats: 'greenhouse',
    token: 'wildlifestudios',
    domain: 'wildlifestudios.com',
  },
  { name: 'RD Station', ats: 'greenhouse', token: 'rdstation', domain: 'rdstation.com' },
  { name: 'Stone', ats: 'greenhouse', token: 'stone', domain: 'stone.com.br' },
  { name: 'BTG Pactual', ats: 'greenhouse', token: 'btgpactual', domain: 'btgpactual.com' },
  { name: 'Banco Inter', ats: 'greenhouse', token: 'inter', domain: 'bancointer.com.br' },
  {
    name: 'Arco Educação',
    ats: 'greenhouse',
    token: 'arcoeducacao',
    domain: 'arcoeducacao.com.br',
  },
  { name: 'Zup Innovation', ats: 'greenhouse', token: 'zupinnovation', domain: 'zup.com.br' },
  { name: 'Hotmart', ats: 'greenhouse', token: 'hotmartcareersbr', domain: 'hotmart.com' },
  { name: 'Jusbrasil', ats: 'greenhouse', token: 'jusbrasil', domain: 'jusbrasil.com.br' },
  // Lever
  { name: 'CloudWalk', ats: 'lever', token: 'cloudwalk', domain: 'cloudwalk.io' },
  { name: 'Neon', ats: 'lever', token: 'neon', domain: 'neon.com.br' },
  { name: 'Flash', ats: 'lever', token: 'flashapp', domain: 'flashapp.com.br' },
  { name: 'Banco BV', ats: 'lever', token: 'bv', domain: 'bancobv.com.br' },
  { name: 'CI&T', ats: 'lever', token: 'ciandt', domain: 'ciandt.com' },
  { name: 'Insider', ats: 'lever', token: 'insiderone', domain: 'useinsider.com' },
  { name: 'TRACTIAN', ats: 'lever', token: 'tractian', domain: 'tractian.com' },
  { name: 'Stark Bank', ats: 'lever', token: 'starkbank', domain: 'starkbank.com' },
  // SmartRecruiters
  { name: 'Experian', ats: 'smartrecruiters', token: 'experian', domain: 'experian.com.br' },
];
