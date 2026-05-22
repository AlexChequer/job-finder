import { describe, expect, it } from 'vitest';
import { formatJob } from '../src/telegram.js';
import type { JobRecord } from '../src/types.js';

function job(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: 'greenhouse:acme:1',
    company: 'Nubank',
    title: 'Estágio em Engenharia',
    location: 'São Paulo, SP',
    url: 'https://example.com/jobs/1',
    source: 'greenhouse',
    level: 'estagio',
    area: 'engenharia',
    firstSeen: '2026-05-21',
    lastSeen: '2026-05-21',
    logo: '',
    summary: '',
    ...overrides,
  };
}

describe('formatJob', () => {
  it('includes company, title, location, and both links', () => {
    const message = formatJob(job());
    expect(message).toContain('Nubank');
    expect(message).toContain('Estágio em Engenharia');
    expect(message).toContain('São Paulo, SP');
    expect(message).toContain('Ver vaga');
    expect(message).toContain('todas as vagas');
  });

  it('shows the level label even when absent from the title', () => {
    const message = formatJob(job({ title: 'Desenvolvedor Backend', level: 'junior' }));
    expect(message).toContain('Júnior');
  });

  it('escapes HTML-special characters in job fields', () => {
    const message = formatJob(job({ company: 'Acme & Co', title: 'Dev <Júnior>' }));
    expect(message).toContain('Acme &amp; Co');
    expect(message).toContain('Dev &lt;Júnior&gt;');
  });
});
