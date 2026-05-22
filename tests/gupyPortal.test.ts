import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGupyPortal } from '../src/connectors/gupyPortal.js';

interface FakeJob {
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

/** A portal job with sensible defaults; override only what a test cares about. */
function job(overrides: Partial<FakeJob> & { id: number }): FakeJob {
  return {
    name: 'Estágio em Engenharia de Software',
    description: 'Atuar no desenvolvimento de software com React e Node.',
    type: 'vacancy_type_internship',
    city: 'São Paulo',
    state: 'São Paulo',
    country: 'Brasil',
    isRemoteWork: false,
    jobUrl: 'https://acme.gupy.io/job/abc==?jobBoardSource=gupy_portal',
    careerPageName: 'Acme',
    careerPageLogo: 'https://logos.gupy.io/acme.png',
    ...overrides,
  };
}

/** Stub fetch to paginate each keyword's jobs 10 at a time, like the real API. */
function stubPortal(jobsByKeyword: Record<string, FakeJob[]>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const url = new URL(input);
      const name = url.searchParams.get('name') ?? '';
      const offset = Number(url.searchParams.get('offset') ?? '0');
      const all = jobsByKeyword[name] ?? [];
      const body = JSON.stringify({
        data: all.slice(offset, offset + 10),
        pagination: { offset, limit: 10, total: all.length },
      });
      return Promise.resolve(new Response(body, { status: 200 }));
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchGupyPortal', () => {
  it('maps a portal job to a normalized posting', async () => {
    stubPortal({ estágio: [job({ id: 9907690 })] });

    const postings = await fetchGupyPortal();

    expect(postings).toEqual([
      {
        id: 'gupy:9907690',
        company: 'Acme',
        title: 'Estágio em Engenharia de Software',
        location: 'São Paulo, São Paulo',
        url: 'https://acme.gupy.io/job/abc==?jobBoardSource=gupy_portal',
        source: 'gupy',
        logo: 'https://logos.gupy.io/acme.png',
        description: 'Atuar no desenvolvimento de software com React e Node.',
      },
    ]);
  });

  it('drops talent-pool and freelance vacancy types', async () => {
    stubPortal({
      estágio: [
        job({ id: 1, type: 'vacancy_type_talent_pool' }),
        job({ id: 2, type: 'vacancy_type_autonomous' }),
        job({ id: 3, type: 'vacancy_type_internship' }),
      ],
    });

    const postings = await fetchGupyPortal();

    expect(postings.map((posting) => posting.id)).toEqual(['gupy:3']);
  });

  it('keeps apprentice (Jovem Aprendiz) vacancies and drops temporary ones', async () => {
    stubPortal({
      aprendiz: [
        job({ id: 10, type: 'vacancy_type_apprentice', name: 'Jovem Aprendiz' }),
        job({ id: 11, type: 'vacancy_type_temporary', name: 'Aprendiz Temporário' }),
      ],
    });

    const postings = await fetchGupyPortal();

    expect(postings.map((posting) => posting.id)).toEqual(['gupy:10']);
  });

  it('dedupes a job that matches multiple keywords', async () => {
    const shared = job({ id: 42 });
    stubPortal({ estágio: [shared], trainee: [shared] });

    const postings = await fetchGupyPortal();

    expect(postings).toHaveLength(1);
  });

  it('paginates until every result is fetched', async () => {
    const many = Array.from({ length: 23 }, (_, index) => job({ id: 100 + index }));
    stubPortal({ aprendiz: many });

    const postings = await fetchGupyPortal();

    expect(postings).toHaveLength(23);
  });

  it('labels remote jobs as "Remoto"', async () => {
    stubPortal({ estágio: [job({ id: 7, isRemoteWork: true, city: null, state: null })] });

    const [posting] = await fetchGupyPortal();

    expect(posting?.location).toBe('Remoto');
  });

  it('falls back to the company subdomain when careerPageName is missing', async () => {
    stubPortal({ estágio: [job({ id: 5, careerPageName: null })] });

    const [posting] = await fetchGupyPortal();

    expect(posting?.company).toBe('Acme');
  });

  it('keeps results when one keyword search fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        const name = new URL(input).searchParams.get('name') ?? '';
        if (name === 'trainee') {
          return Promise.resolve(new Response('error', { status: 500 }));
        }
        const data = name === 'estágio' ? [job({ id: 1 })] : [];
        const body = JSON.stringify({
          data,
          pagination: { offset: 0, limit: 10, total: data.length },
        });
        return Promise.resolve(new Response(body, { status: 200 }));
      }),
    );

    const postings = await fetchGupyPortal();

    expect(postings.map((posting) => posting.id)).toEqual(['gupy:1']);
  });

  it('uses the curated name for a known company token', async () => {
    stubPortal({
      estágio: [
        job({
          id: 1,
          careerPageName: 'Itaú Unibanco',
          jobUrl: 'https://vemproitau.gupy.io/job/x==?jobBoardSource=gupy_portal',
        }),
      ],
    });

    const [posting] = await fetchGupyPortal();

    expect(posting?.company).toBe('Itaú');
  });

  it('strips career-page boilerplate from company names', async () => {
    stubPortal({ estágio: [job({ id: 2, careerPageName: 'Eztec Carreiras' })] });

    const [posting] = await fetchGupyPortal();

    expect(posting?.company).toBe('Eztec');
  });

  it('falls back to the token when the name is a slogan', async () => {
    stubPortal({
      estágio: [
        job({
          id: 3,
          careerPageName: 'Venha construir o futuro com a gente!',
          jobUrl: 'https://granturquesa.gupy.io/job/x==?jobBoardSource=gupy_portal',
        }),
      ],
    });

    const [posting] = await fetchGupyPortal();

    expect(posting?.company).toBe('Granturquesa');
  });
});
