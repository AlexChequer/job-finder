import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fetchLever } from '../src/connectors/lever.js';
import type { Company } from '../src/types.js';

const company: Company = { name: 'Acme', ats: 'lever', token: 'acme' };

function stubFetch(body: string, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(body, { status }))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchLever', () => {
  it('maps Lever postings, including the location fallback', async () => {
    const fixture = await readFile(new URL('./fixtures/lever.json', import.meta.url), 'utf-8');
    stubFetch(fixture);
    const postings = await fetchLever(company);
    expect(postings).toHaveLength(2);
    expect(postings[0]).toEqual({
      id: 'lever:acme:a1',
      company: 'Acme',
      title: 'Estágio em Engenharia de Software',
      location: 'São Paulo',
      url: 'https://jobs.lever.co/acme/a1',
      source: 'lever',
    });
    expect(postings[1]?.location).toBe('N/A');
  });

  it('throws on a non-200 response', async () => {
    stubFetch('error', 500);
    await expect(fetchLever(company)).rejects.toThrow();
  });
});
