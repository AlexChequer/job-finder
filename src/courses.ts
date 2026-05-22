import type { Area } from './types.js';
import { normalize } from './keywords.js';

/**
 * Course-name keywords (accent-free) and the role áreas they imply. Matched
 * only inside a study-requirement window (see classifyByCourses), so a course
 * named in passing isn't mistaken for a requirement.
 */
const COURSE_AREAS: { course: string; areas: Area[] }[] = [
  // Software / computing
  { course: 'ciencia da computacao', areas: ['software'] },
  { course: 'engenharia de software', areas: ['software'] },
  { course: 'engenharia da computacao', areas: ['software'] },
  { course: 'engenharia de computacao', areas: ['software'] },
  { course: 'sistemas de informacao', areas: ['software'] },
  { course: 'analise e desenvolvimento de sistemas', areas: ['software'] },
  { course: 'desenvolvimento de sistemas', areas: ['software'] },
  { course: 'tecnologia da informacao', areas: ['software'] },
  { course: 'sistemas para internet', areas: ['software'] },
  { course: 'redes de computadores', areas: ['software'] },
  { course: 'seguranca da informacao', areas: ['software'] },
  { course: 'jogos digitais', areas: ['software'] },
  { course: 'tecnico em informatica', areas: ['software'] },
  // Data
  { course: 'ciencia de dados', areas: ['dados'] },
  { course: 'estatistica', areas: ['dados'] },
  { course: 'inteligencia artificial', areas: ['dados', 'software'] },
  // Engineering (non-software)
  { course: 'engenharia civil', areas: ['engenharia'] },
  { course: 'engenharia mecanica', areas: ['engenharia'] },
  { course: 'engenharia eletrica', areas: ['engenharia'] },
  { course: 'engenharia eletronica', areas: ['engenharia'] },
  { course: 'engenharia de producao', areas: ['engenharia'] },
  { course: 'engenharia quimica', areas: ['engenharia'] },
  { course: 'engenharia ambiental', areas: ['engenharia'] },
  { course: 'engenharia mecatronica', areas: ['engenharia'] },
  { course: 'engenharia de controle e automacao', areas: ['engenharia'] },
  { course: 'engenharia de materiais', areas: ['engenharia'] },
  { course: 'arquitetura e urbanismo', areas: ['engenharia'] },
  // Business
  { course: 'administracao', areas: ['negocios'] },
  { course: 'ciencias economicas', areas: ['negocios'] },
  { course: 'economia', areas: ['negocios'] },
  { course: 'ciencias contabeis', areas: ['negocios'] },
  { course: 'contabilidade', areas: ['negocios'] },
  { course: 'relacoes internacionais', areas: ['negocios'] },
  { course: 'comercio exterior', areas: ['negocios'] },
  { course: 'recursos humanos', areas: ['negocios'] },
  { course: 'gestao comercial', areas: ['negocios'] },
  { course: 'gestao financeira', areas: ['negocios'] },
  { course: 'processos gerenciais', areas: ['negocios'] },
  { course: 'marketing', areas: ['negocios'] },
  { course: 'publicidade', areas: ['negocios', 'produto'] },
  { course: 'jornalismo', areas: ['negocios'] },
  { course: 'comunicacao social', areas: ['negocios'] },
  // Product / design
  { course: 'design', areas: ['produto'] },
];

/**
 * "Direito" the course needs its own tight pattern — the bare word also means
 * "a right" (trabalhista benefits), so it only counts directly after a cue.
 */
const LAW_COURSE =
  /(cursando|formacao|graduacao|graduando|bacharelado|estudantes? de|superior)\s+(em\s+|de\s+|do\s+|o\s+|a\s+|curso de\s+)?direito\b/;

/** Words that introduce a course requirement ("cursando…", "formação em…"). */
const STUDY_CUE =
  /curs|formac|gradua|bacharel|tecnolog|estudante|superior em|superior complet|ensino superior|nivel superior/g;

/** How far past a study cue to scan for course names (covers short lists). */
const WINDOW = 110;

/**
 * The role áreas a job implies, read from the courses named in its
 * description. Empty when no target course is named — which is how the board
 * drops service and manual roles.
 */
export function classifyByCourses(description: string): Area[] {
  const text = normalize(description);
  const areas = new Set<Area>();
  if (LAW_COURSE.test(text)) {
    areas.add('juridico');
  }
  for (const cue of text.matchAll(STUDY_CUE)) {
    const start = cue.index ?? 0;
    const window = text.slice(start, start + WINDOW);
    for (const { course, areas: courseAreas } of COURSE_AREAS) {
      if (window.includes(course)) {
        for (const area of courseAreas) {
          areas.add(area);
        }
      }
    }
  }
  return [...areas];
}
