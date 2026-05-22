import { describe, expect, it } from 'vitest';
import { stripHtml, truncate } from '../src/text.js';

describe('stripHtml', () => {
  it('removes tags, decodes entities, and collapses whitespace', () => {
    expect(stripHtml('<p>Olá&nbsp;&amp; bem-vindo</p>\n  <b>aqui</b>')).toBe(
      'Olá & bem-vindo aqui',
    );
  });
});

describe('truncate', () => {
  it('cuts text longer than the limit and leaves shorter text alone', () => {
    expect(truncate('abcdef', 3)).toBe('abc');
    expect(truncate('ab', 5)).toBe('ab');
  });
});
