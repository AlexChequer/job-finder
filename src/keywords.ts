import type { Area, Level } from './types.js';

/** Lowercase and strip accents so "Estágio" and "estagio" compare equal. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** Keywords matched as whole words — short or substring-prone ones. */
const BOUNDARY_KEYWORDS = new Set(['jr', 'sr', 'intern', 'internship']);

/** True if `keyword` occurs in the already-normalized text. */
function contains(normalizedText: string, keyword: string): boolean {
  if (BOUNDARY_KEYWORDS.has(keyword)) {
    return new RegExp(`\\b${keyword}\\b`).test(normalizedText);
  }
  return normalizedText.includes(keyword);
}

/** Title keywords that signal an early-career role (stored accent-free). */
const INCLUDE_KEYWORDS = [
  'intern',
  'internship',
  'estagio',
  'estagiario',
  'trainee',
  'junior',
  'jr',
  'entry level',
  'entry-level',
  'new grad',
  'new-grad',
  'early career',
  'early-career',
  'aprendiz',
  'recem formado',
  'recem-formado',
];

/** Title keywords that signal a senior/mid role — these veto a match. */
const EXCLUDE_KEYWORDS = [
  'senior',
  'sr',
  'pleno',
  'lead',
  'principal',
  'staff',
  'manager',
  'head',
  'director',
  'diretor',
  'gerente',
  'coordenador',
  'especialista',
  'specialist',
];

/** True when a job title looks like an internship / new-grad / junior role. */
export function isEarlyCareer(title: string): boolean {
  const normalized = normalize(title);
  const included = INCLUDE_KEYWORDS.some((keyword) => contains(normalized, keyword));
  const excluded = EXCLUDE_KEYWORDS.some((keyword) => contains(normalized, keyword));
  return included && !excluded;
}

/** Bucket an early-career title into a level (most specific wins). */
export function classifyLevel(title: string): Level {
  const n = normalize(title);
  if (contains(n, 'intern') || contains(n, 'internship') || n.includes('estagi')) {
    return 'estagio';
  }
  if (n.includes('aprendiz')) return 'aprendiz';
  if (n.includes('trainee')) return 'trainee';
  if (contains(n, 'jr') || n.includes('junior')) return 'junior';
  return 'newgrad';
}

/** Role-area keyword sets, checked in order — first match wins. */
const AREA_KEYWORDS: { area: Area; keywords: string[] }[] = [
  {
    area: 'dados',
    keywords: [
      'dados',
      'data',
      'analytics',
      'business intelligence',
      'machine learning',
      'data science',
      'ciencia de dados',
      'estatist',
    ],
  },
  {
    area: 'engenharia',
    keywords: [
      'software',
      'engenh',
      'engineer',
      'desenvolv',
      'developer',
      'programad',
      'backend',
      'back-end',
      'back end',
      'frontend',
      'front-end',
      'front end',
      'fullstack',
      'full stack',
      'full-stack',
      'mobile',
      'devops',
      'sre',
      'infraestrutura',
      'infrastructure',
      'cloud',
      'qualidade',
      'quality',
      'cyber',
    ],
  },
  {
    area: 'produto',
    keywords: ['produto', 'product', 'design'],
  },
  {
    area: 'negocios',
    keywords: [
      'comercial',
      'vendas',
      'sales',
      'negocio',
      'business',
      'marketing',
      'financ',
      'contabil',
      'fiscal',
      'tributar',
      'juridic',
      'legal',
      'recursos humanos',
      'people',
      'operac',
      'operations',
      'atendimento',
      'customer',
      'consultor',
      'auditoria',
      'risco',
      'credito',
      'investiment',
    ],
  },
];

/** Bucket a title into a broad role area. */
export function classifyArea(title: string): Area {
  const n = normalize(title);
  for (const { area, keywords } of AREA_KEYWORDS) {
    if (keywords.some((keyword) => n.includes(keyword))) {
      return area;
    }
  }
  return 'outro';
}
