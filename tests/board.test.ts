import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBoard, loadPreviousJobs, saveBoard } from '../src/board.js';
import type { JobRecord, Posting } from '../src/types.js';

/** Expiry window used across these tests — kept explicit so they stay deterministic. */
const EXPIRY = 7;

function posting(id: string, title: string): Posting {
  return {
    id,
    company: 'Acme',
    title,
    location: 'SP',
    url: 'https://example.com',
    source: 'greenhouse',
  };
}

/** A previous-board job record, with sensible defaults to override per test. */
function record(id: string, overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    ...posting(id, 'Estágio'),
    level: 'estagio',
    areas: ['negocios'],
    firstSeen: '2026-01-10',
    lastSeen: '2026-05-21',
    logo: '',
    summary: '',
    ...overrides,
  };
}

describe('buildBoard', () => {
  it('classifies postings and stamps today as first-seen and last-seen for new jobs', () => {
    const now = new Date('2026-05-21T12:00:00Z');
    const board = buildBoard([posting('a', 'Estágio em Dados')], [], now, EXPIRY);
    expect(board.updatedAt).toBe('2026-05-21T12:00:00.000Z');
    expect(board.jobs).toHaveLength(1);
    expect(board.jobs[0]).toMatchObject({
      id: 'a',
      level: 'estagio',
      areas: [],
      firstSeen: '2026-05-21',
      lastSeen: '2026-05-21',
    });
  });

  it('carries first-seen dates and summaries over from the previous board', () => {
    const previous = [record('a', { firstSeen: '2026-01-10', summary: 'resumo antigo' })];
    const now = new Date('2026-05-21T12:00:00Z');
    const board = buildBoard(
      [posting('a', 'Estágio'), posting('b', 'Trainee')],
      previous,
      now,
      EXPIRY,
    );
    const a = board.jobs.find((j) => j.id === 'a');
    const b = board.jobs.find((j) => j.id === 'b');
    expect(a?.firstSeen).toBe('2026-01-10');
    expect(a?.summary).toBe('resumo antigo');
    expect(b?.firstSeen).toBe('2026-05-21');
    expect(b?.summary).toBe('');
  });

  it('refreshes last-seen when a job reappears in the poll', () => {
    const previous = [record('a', { lastSeen: '2026-05-15' })];
    const board = buildBoard(
      [posting('a', 'Estágio')],
      previous,
      new Date('2026-05-21T12:00:00Z'),
      EXPIRY,
    );
    expect(board.jobs[0]?.lastSeen).toBe('2026-05-21');
  });

  it('carries over a job missing from the poll while inside the expiry window', () => {
    const previous = [record('gone', { lastSeen: '2026-05-19' })]; // 2 days ago
    const board = buildBoard(
      [posting('a', 'Estágio')],
      previous,
      new Date('2026-05-21T12:00:00Z'),
      EXPIRY,
    );
    expect(board.jobs.map((j) => j.id).sort()).toEqual(['a', 'gone']);
    // A carried-over job keeps its old last-seen — it was not seen this poll.
    expect(board.jobs.find((j) => j.id === 'gone')?.lastSeen).toBe('2026-05-19');
  });

  it('expires a job not seen for longer than the expiry window', () => {
    const previous = [record('stale', { lastSeen: '2026-05-10' })]; // 11 days ago
    const board = buildBoard(
      [posting('a', 'Estágio')],
      previous,
      new Date('2026-05-21T12:00:00Z'),
      EXPIRY,
    );
    expect(board.jobs.map((j) => j.id)).toEqual(['a']);
  });

  it('drops a missing job that has no last-seen date (pre-expiry board data)', () => {
    const legacy = {
      ...posting('old', 'Estágio'),
      level: 'estagio',
      areas: ['negocios'],
      firstSeen: '2026-01-01',
      logo: '',
      summary: '',
    } as JobRecord; // simulates an old jobs.json entry written before lastSeen existed
    const board = buildBoard(
      [posting('a', 'Estágio')],
      [legacy],
      new Date('2026-05-21T12:00:00Z'),
      EXPIRY,
    );
    expect(board.jobs.map((j) => j.id)).toEqual(['a']);
  });
});

describe('loadPreviousJobs and saveBoard', () => {
  it('returns [] when the board file does not exist', async () => {
    expect(await loadPreviousJobs(join(tmpdir(), 'job-finder-no-board.json'))).toEqual([]);
  });

  it('round-trips board jobs through save and load', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'job-finder-'));
    try {
      const path = join(dir, 'jobs.json');
      const board = buildBoard(
        [posting('a', 'Estágio em Dados')],
        [],
        new Date('2026-05-21T12:00:00Z'),
        EXPIRY,
      );
      await saveBoard(path, board);
      expect(await loadPreviousJobs(path)).toEqual(board.jobs);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('does not persist the transient description field', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'job-finder-'));
    try {
      const path = join(dir, 'jobs.json');
      const withDescription: Posting = {
        ...posting('a', 'Estágio em Dados'),
        description: 'Descrição longa da vaga.',
      };
      const board = buildBoard([withDescription], [], new Date('2026-05-21T12:00:00Z'), EXPIRY);
      expect(board.jobs[0]?.description).toBe('Descrição longa da vaga.');
      await saveBoard(path, board);
      const loaded = await loadPreviousJobs(path);
      expect(loaded[0]).not.toHaveProperty('description');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
