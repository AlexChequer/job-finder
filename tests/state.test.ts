import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadState, saveState } from '../src/state.js';

describe('loadState', () => {
  it('returns empty state when the file is missing', async () => {
    const state = await loadState(join(tmpdir(), 'job-finder-missing-xyz.json'));
    expect(state).toEqual({ seenIds: [] });
  });
});

describe('saveState + loadState', () => {
  it('round-trips sorted, deduplicated ids with a trailing newline', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'job-finder-'));
    const path = join(dir, 'seen.json');
    try {
      await saveState(path, { seenIds: ['c', 'a', 'b', 'a'] });
      const raw = await readFile(path, 'utf-8');
      expect(raw.endsWith('\n')).toBe(true);
      expect(JSON.parse(raw)).toEqual({ seenIds: ['a', 'b', 'c'] });
      expect((await loadState(path)).seenIds).toEqual(['a', 'b', 'c']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
