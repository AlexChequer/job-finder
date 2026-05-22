import { readFile, writeFile } from 'node:fs/promises';

/** Dedup state — the set of posting ids already notified about. */
export interface State {
  seenIds: string[];
}

/** Load seen-job state; a missing, empty, or invalid file yields empty state. */
export async function loadState(path: string): Promise<State> {
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<State>;
    return { seenIds: Array.isArray(parsed.seenIds) ? parsed.seenIds : [] };
  } catch {
    return { seenIds: [] };
  }
}

/** Persist state as sorted, deduplicated, pretty-printed JSON. */
export async function saveState(path: string, state: State): Promise<void> {
  const seenIds = [...new Set(state.seenIds)].sort();
  await writeFile(path, JSON.stringify({ seenIds }, null, 2) + '\n', 'utf-8');
}
