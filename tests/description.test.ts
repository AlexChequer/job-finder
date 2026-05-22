import { describe, expect, it } from 'vitest';
import { fetchDescription } from '../src/description.js';
import type { JobRecord } from '../src/types.js';

const baseJob: JobRecord = {
  id: 'gupy:123',
  company: 'Acme',
  title: 'Estágio em Dados',
  location: 'São Paulo, São Paulo',
  url: 'https://acme.gupy.io/job/x',
  source: 'gupy',
  logo: '',
  level: 'estagio',
  areas: ['dados'],
  firstSeen: '2026-05-21',
  lastSeen: '2026-05-21',
  summary: '',
};

describe('fetchDescription', () => {
  it('returns the inline description, decoding entities, without a network call', async () => {
    const job: JobRecord = { ...baseJob, description: 'Trabalhar com&nbsp;SQL e Python.' };

    expect(await fetchDescription(job)).toBe('Trabalhar com SQL e Python.');
  });

  it('returns an empty string for a Gupy job with no inline description', async () => {
    expect(await fetchDescription(baseJob)).toBe('');
  });
});
