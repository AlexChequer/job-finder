import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSmartRecruiters } from '../src/connectors/smartrecruiters.js';
import type { Company } from '../src/types.js';

const company: Company = { name: 'Acme', ats: 'smartrecruiters', token: 'acme' };

interface FakePosting {
  id: string;
  name: string;
  location: Record<string, unknown> | null;
}

/** A posting with sensible defaults; override only what a test cares about. */
function posting(overrides: Partial<FakePosting> & { id: string }): FakePosting {
  return {
    name: 'Estágio em Engenharia de Software',
    location: {
      city: 'São Paulo',
      region: 'SP',
      country: 'br',
      fullLocation: 'São Paulo, SP, Brazil',
    },
    ...overrides,
  };
}

/** Stub fetch to paginate postings 100 at a time, like the real API. */
function stubApi(all: FakePosting[]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const url = new URL(input);
      const offset = Number(url.searchParams.get('offset') ?? '0');
      const limit = Number(url.searchParams.get('limit') ?? '100');
      const body = JSON.stringify({
        offset,
        limit,
        totalFound: all.length,
        content: all.slice(offset, offset + limit),
      });
      return Promise.resolve(new Response(body, { status: 200 }));
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchSmartRecruiters', () => {
  it('maps a posting to a normalized posting', async () => {
    stubApi([posting({ id: '744000122' })]);

    const postings = await fetchSmartRecruiters(company);

    expect(postings).toEqual([
      {
        id: 'smartrecruiters:acme:744000122',
        company: 'Acme',
        title: 'Estágio em Engenharia de Software',
        location: 'São Paulo, SP, Brazil',
        url: 'https://jobs.smartrecruiters.com/acme/744000122',
        source: 'smartrecruiters',
      },
    ]);
  });

  it('labels remote jobs as "Remoto"', async () => {
    stubApi([posting({ id: '1', location: { city: 'São Paulo', remote: true } })]);

    const [first] = await fetchSmartRecruiters(company);

    expect(first?.location).toBe('Remoto');
  });

  it('falls back to N/A when a posting has no location', async () => {
    stubApi([posting({ id: '1', location: null })]);

    const [first] = await fetchSmartRecruiters(company);

    expect(first?.location).toBe('N/A');
  });

  it('builds location from city and region when fullLocation is absent', async () => {
    stubApi([posting({ id: '1', location: { city: 'Campinas', region: 'SP' } })]);

    const [first] = await fetchSmartRecruiters(company);

    expect(first?.location).toBe('Campinas, SP');
  });

  it('paginates until every posting is fetched', async () => {
    const many = Array.from({ length: 230 }, (_, index) => posting({ id: String(index) }));
    stubApi(many);

    const postings = await fetchSmartRecruiters(company);

    expect(postings).toHaveLength(230);
  });

  it('throws on a non-200 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('nope', { status: 404 }))),
    );

    await expect(fetchSmartRecruiters(company)).rejects.toThrow();
  });
});
