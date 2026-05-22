import type { Posting } from '../types.js';
import { fetchJson } from './http.js';

/** Gupy's network-wide job search — one endpoint, every company on Gupy. */
const PORTAL_API = 'https://portal.api.gupy.io/api/job';

/** The API hard-caps page size at 10 regardless of the limit sent. */
const PAGE_SIZE = 10;

/** Safety cap so an unexpectedly large result set can't stall a run. */
const MAX_PAGES = 60;

/** Spacing between requests, to stay polite to an unofficial endpoint. */
const REQUEST_DELAY_MS = 150;

/**
 * Level keywords to search. `name` is a required, accent-insensitive,
 * token-based match — single words only, since phrases match nothing.
 */
const LEVEL_KEYWORDS = ['estágio', 'estagiário', 'trainee', 'aprendiz', 'júnior'];

/**
 * Vacancy types worth keeping. Drops `vacancy_type_talent_pool` (evergreen
 * "Banco de Talentos" pools that never close), `vacancy_type_autonomous`
 * (freelance), `vacancy_legal_entity` (PJ contracts) and `vacancy_type_temporary`
 * (short-term seasonal hires). `vacancy_type_apprentice` is kept — Jovem
 * Aprendiz is an early-career level this tool explicitly targets. The job title
 * remains the real early-career gate downstream.
 */
const KEEP_TYPES = new Set([
  'vacancy_type_internship',
  'vacancy_type_trainee',
  'vacancy_type_effective',
  'vacancy_type_apprentice',
]);

interface PortalJob {
  id: number;
  name: string;
  description: string;
  type: string;
  city: string | null;
  state: string | null;
  country: string | null;
  isRemoteWork: boolean;
  jobUrl: string;
  careerPageName: string | null;
  careerPageLogo: string | null;
}

interface PortalResponse {
  data: PortalJob[];
  pagination: { offset: number; limit: number; total: number };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Page through every result for one level keyword. */
async function fetchKeyword(keyword: string): Promise<PortalJob[]> {
  const jobs: PortalJob[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_SIZE;
    const url = `${PORTAL_API}?name=${encodeURIComponent(keyword)}&offset=${offset}&limit=${PAGE_SIZE}`;
    const data = (await fetchJson(url)) as PortalResponse;
    if (!Array.isArray(data.data)) {
      throw new Error(`Gupy portal "${keyword}": unexpected response shape`);
    }
    jobs.push(...data.data);
    if (data.data.length === 0 || offset + PAGE_SIZE >= data.pagination.total) {
      break;
    }
    await delay(REQUEST_DELAY_MS);
  }
  return jobs;
}

/**
 * Known company tokens mapped to clean display names — the curated Gupy
 * companies from before the switch to the network-wide portal. The long tail
 * of companies relies on the careerPageName cleanup in `companyName` below.
 */
const COMPANY_NAMES: Record<string, string> = {
  vemproitau: 'Itaú',
  creditas: 'Creditas',
  stone: 'Stone',
  dock: 'Dock',
  ambevtech: 'Ambev Tech',
  casadosventos: 'Casa dos Ventos',
  meliuz: 'Méliuz',
  vivo: 'Vivo',
  locaweb: 'Locaweb',
  pagseguro: 'PagBank',
  clearsale: 'ClearSale',
  stefanini: 'Stefanini',
  fcamara: 'FCamara',
  vemprotime: 'TIM',
  globo: 'Globo',
  vemsergrupoolx: 'OLX',
  afya: 'Afya',
  sidi: 'SiDi',
  vempraquod: 'Quod',
  tecban: 'Tecban',
  logcomex: 'Logcomex',
};

/** Career-page boilerplate to strip out of a company name. */
const NAME_NOISE = /\b(carreiras?|careers?|trabalhe conosco|vagas|oportunidades|recrutamento)\b/gi;

/** Capitalize a bare token as a last-resort display name. */
function humanizeToken(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1);
}

/** Resolve a clean company display name from the career-page name and token. */
function companyName(rawName: string | null, token: string): string {
  const known = COMPANY_NAMES[token];
  if (known) {
    return known;
  }
  let name = (rawName ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  name = (name.split('|')[0] ?? '').trim(); // drop "| sub-brand" tails
  name = name
    .replace(/^#/, '')
    .replace(NAME_NOISE, '')
    .replace(/^[\s\-–|]+|[\s\-–|]+$/g, '')
    .trim();
  // Slogans ("Venha construir o futuro!") aren't usable names — fall back.
  if (!name || name.length > 40 || /[!?]/.test(name)) {
    return humanizeToken(token);
  }
  return name;
}

/** The company subdomain — "franq" from "https://franq.gupy.io/...". */
function tokenFromUrl(jobUrl: string): string {
  try {
    return new URL(jobUrl).hostname.split('.')[0] ?? 'gupy';
  } catch {
    return 'gupy';
  }
}

/** Build a human-readable location from a portal job. */
function formatLocation(job: PortalJob): string {
  if (job.isRemoteWork) {
    return 'Remoto';
  }
  if (job.city && job.state) {
    return `${job.city}, ${job.state}`;
  }
  return job.city ?? job.state ?? job.country ?? 'N/A';
}

/** Map a portal job to the project's normalized posting shape. */
function toPosting(job: PortalJob): Posting {
  return {
    id: `gupy:${job.id}`,
    company: companyName(job.careerPageName, tokenFromUrl(job.jobUrl)),
    title: job.name,
    location: formatLocation(job),
    url: job.jobUrl,
    source: 'gupy',
    logo: job.careerPageLogo ?? '',
    description: job.description,
  };
}

/**
 * Fetch early-career postings across the whole Gupy network. Each keyword is
 * isolated — one failing search never loses the others.
 */
export async function fetchGupyPortal(): Promise<Posting[]> {
  const byId = new Map<number, PortalJob>();
  for (const keyword of LEVEL_KEYWORDS) {
    try {
      for (const job of await fetchKeyword(keyword)) {
        if (KEEP_TYPES.has(job.type)) {
          byId.set(job.id, job);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  Gupy portal "${keyword}": failed — ${message}`);
    }
  }
  return [...byId.values()].map(toPosting);
}
