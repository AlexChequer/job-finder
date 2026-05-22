import { describe, expect, it } from 'vitest';
import { classifyAreas, classifyLevel, isEarlyCareer, normalize } from '../src/keywords.js';

describe('normalize', () => {
  it('lowercases and strips accents', () => {
    expect(normalize('Estágio')).toBe('estagio');
    expect(normalize('Júnior')).toBe('junior');
  });
});

describe('isEarlyCareer', () => {
  it('matches internship and trainee titles in English and Portuguese', () => {
    expect(isEarlyCareer('Software Engineering Intern')).toBe(true);
    expect(isEarlyCareer('Estágio em Dados')).toBe(true);
    expect(isEarlyCareer('Programa de Trainee 2026')).toBe(true);
    expect(isEarlyCareer('New Grad Software Engineer')).toBe(true);
  });

  it('matches junior with and without accents', () => {
    expect(isEarlyCareer('Desenvolvedor Júnior')).toBe(true);
    expect(isEarlyCareer('Junior Data Analyst')).toBe(true);
    expect(isEarlyCareer('Backend Engineer Jr')).toBe(true);
  });

  it('rejects senior and mid-level titles', () => {
    expect(isEarlyCareer('Senior Engineer')).toBe(false);
    expect(isEarlyCareer('Desenvolvedor Pleno')).toBe(false);
    expect(isEarlyCareer('Tech Lead')).toBe(false);
    expect(isEarlyCareer('Engineering Manager')).toBe(false);
  });

  it('rejects titles with no early-career signal', () => {
    expect(isEarlyCareer('Product Designer')).toBe(false);
    expect(isEarlyCareer('Account Executive')).toBe(false);
  });

  it('matches short keywords only as whole words', () => {
    // "SRE" contains "sr" but must not trigger the senior exclusion.
    expect(isEarlyCareer('SRE Intern')).toBe(true);
    // "intern" must match as a whole word, not inside "International".
    expect(isEarlyCareer('International Business Analyst')).toBe(false);
  });
});

describe('classifyLevel', () => {
  it('buckets titles by early-career level', () => {
    expect(classifyLevel('Estágio em Dados')).toBe('estagio');
    expect(classifyLevel('Software Engineering Intern')).toBe('estagio');
    expect(classifyLevel('Jovem Aprendiz')).toBe('aprendiz');
    expect(classifyLevel('Programa Trainee 2026')).toBe('trainee');
    expect(classifyLevel('Analista Júnior')).toBe('junior');
    expect(classifyLevel('Backend Engineer Jr')).toBe('junior');
    expect(classifyLevel('New Grad Engineer')).toBe('newgrad');
  });
});

describe('classifyAreas', () => {
  it('buckets a title into every role area it matches', () => {
    expect(classifyAreas('Estágio em Engenharia de Dados')).toEqual(['dados', 'engenharia']);
    expect(classifyAreas('Desenvolvedor Backend Júnior')).toEqual(['engenharia']);
    expect(classifyAreas('Analista Comercial Júnior')).toEqual(['negocios']);
    expect(classifyAreas('Product Designer')).toEqual(['produto']);
  });

  it('falls back to "outro" when no area keyword matches', () => {
    expect(classifyAreas('Analista Júnior')).toEqual(['outro']);
  });
});
