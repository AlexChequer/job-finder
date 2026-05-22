import { describe, expect, it } from 'vitest';
import { isInSaoPaulo } from '../src/location.js';

describe('isInSaoPaulo', () => {
  it('keeps a job in the city of São Paulo', () => {
    expect(isInSaoPaulo('São Paulo, São Paulo', false)).toBe(true);
  });

  it('keeps a São Paulo job regardless of accents or casing', () => {
    expect(isInSaoPaulo('sao paulo, brazil', false)).toBe(true);
  });

  it('keeps a hybrid São Paulo job with a slash suffix', () => {
    expect(isInSaoPaulo('São Paulo / Híbrido', false)).toBe(true);
  });

  it('drops a job in another city of São Paulo state', () => {
    expect(isInSaoPaulo('Piracicaba, São Paulo', false)).toBe(false);
  });

  it('drops a job in another state', () => {
    expect(isInSaoPaulo('Florianópolis, Santa Catarina', false)).toBe(false);
  });

  it('drops a job with no usable location', () => {
    expect(isInSaoPaulo('N/A', false)).toBe(false);
  });

  it('keeps a remote job only when keepRemote is set', () => {
    expect(isInSaoPaulo('Remoto', true)).toBe(true);
    expect(isInSaoPaulo('Remoto', false)).toBe(false);
  });
});
