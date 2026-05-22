import { afterEach, describe, expect, it, vi } from 'vitest';
import { summariesEnabled, summarizeJob } from '../src/summarize.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('summariesEnabled', () => {
  it('reflects whether a Gemini API key is set', () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    expect(summariesEnabled()).toBe(false);
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    expect(summariesEnabled()).toBe(true);
  });
});

describe('summarizeJob', () => {
  it('returns an empty string when no API key is set', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    expect(await summarizeJob('Dev', 'descrição')).toBe('');
  });

  it('returns the trimmed model text', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const body = {
      candidates: [{ content: { parts: [{ text: '  Constrói APIs em Python.  ' }] } }],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))),
    );
    expect(await summarizeJob('Dev', 'descrição longa o suficiente')).toBe(
      'Constrói APIs em Python.',
    );
  });

  it('throws on a non-200 response', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('rate limited', { status: 429 }))),
    );
    await expect(summarizeJob('Dev', 'descrição')).rejects.toThrow();
  });
});
