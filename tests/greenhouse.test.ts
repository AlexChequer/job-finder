import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fetchGreenhouse } from '../src/connectors/greenhouse.js';
import type { Company } from '../src/types.js';

const company: Company = { name: 'Acme', ats: 'greenhouse', token: 'acme' };

function loadFixture(): Promise<string> {
  return readFile(new URL('./fixtures/greenhouse.json', import.meta.url), 'utf-8');
}

function stubFetch(body: string, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(body, { status }))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchGreenhouse', () => {
  it('maps Greenhouse jobs to postings', async () => {
    stubFetch(await loadFixture());
    const postings = await fetchGreenhouse(company);
    expect(postings).toHaveLength(3);
    expect(postings[0]).toEqual({
      id: 'greenhouse:acme:111',
      company: 'Acme',
      title: 'Software Engineering Intern',
      location: 'São Paulo, Brazil',
      url: 'https://job-boards.greenhouse.io/acme/jobs/111',
      source: 'greenhouse',
    });
  });

  it('falls back to N/A when a job has no location', async () => {
    stubFetch(await loadFixture());
    const postings = await fetchGreenhouse(company);
    expect(postings[2]?.location).toBe('N/A');
  });

  it('throws on a non-200 response', async () => {
    stubFetch('not found', 404);
    await expect(fetchGreenhouse(company)).rejects.toThrow();
  });
});
