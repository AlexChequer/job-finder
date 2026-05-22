import { describe, expect, it } from 'vitest';
import { classifyByCourses } from '../src/courses.js';

describe('classifyByCourses', () => {
  it('reads áreas from the courses a description requires', () => {
    expect(classifyByCourses('Estágio para quem está cursando Ciência da Computação.')).toEqual([
      'software',
    ]);
    expect(classifyByCourses('Buscamos estudantes de Direito para o time jurídico.')).toEqual([
      'juridico',
    ]);
    expect(classifyByCourses('Requisito: graduação em Administração ou Economia.')).toEqual([
      'negocios',
    ]);
  });

  it('returns multiple áreas when several courses are listed', () => {
    const areas = classifyByCourses(
      'Cursando Engenharia de Software, Ciência de Dados ou Engenharia Civil.',
    );
    expect(areas).toContain('software');
    expect(areas).toContain('dados');
    expect(areas).toContain('engenharia');
  });

  it('returns no área when the description names no target course', () => {
    expect(classifyByCourses('Atendente de salão. Requisito: ensino médio completo.')).toEqual([]);
  });

  it('does not read "direito" as the Law course outside a study context', () => {
    expect(
      classifyByCourses('Cursando ensino médio. O estagiário tem direito a vale-transporte.'),
    ).toEqual([]);
  });
});
