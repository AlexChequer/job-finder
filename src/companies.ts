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
  // Lever
  { name: 'CloudWalk', ats: 'lever', token: 'cloudwalk', domain: 'cloudwalk.io' },
  { name: 'Neon', ats: 'lever', token: 'neon', domain: 'neon.com.br' },
];
