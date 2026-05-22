import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { companies } from './companies.js';
import { classifyLevel } from './keywords.js';
import type { BoardData, JobRecord, Posting } from './types.js';

/** Logo URL for a company domain, via Google's favicon service. */
function logoUrl(domain: string | undefined): string {
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : '';
}

/** Load job records from a previously written board file, or [] if none. */
export async function loadPreviousJobs(path: string): Promise<JobRecord[]> {
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BoardData>;
    return Array.isArray(parsed.jobs) ? parsed.jobs : [];
  } catch {
    return [];
  }
}

/** Whole days between an ISO date (YYYY-MM-DD) and a reference date. */
function daysSince(isoDate: string | undefined, now: Date): number {
  const then = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(then)) {
    return Number.POSITIVE_INFINITY;
  }
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((today - then) / 86_400_000);
}

/**
 * Classify postings into board records.
 *
 * Jobs in `postings` are live — stamped `lastSeen = today`. Jobs from
 * `previousJobs` that are absent from this poll are carried over until they go
 * `expiryDays` without being seen, then dropped. First-seen dates and AI
 * summaries are preserved across runs.
 */
export function buildBoard(
  postings: Posting[],
  previousJobs: JobRecord[],
  now: Date,
  expiryDays: number,
): BoardData {
  const previousById = new Map<string, JobRecord>();
  for (const job of previousJobs) {
    previousById.set(job.id, job);
  }
  const logoByCompany = new Map<string, string>();
  for (const company of companies) {
    logoByCompany.set(company.name, logoUrl(company.domain));
  }
  const today = now.toISOString().slice(0, 10);

  // Jobs seen in this poll — fresh, last-seen stamped today.
  const liveJobs: JobRecord[] = postings.map((posting): JobRecord => {
    const previous = previousById.get(posting.id);
    return {
      ...posting,
      level: classifyLevel(posting.title),
      areas: previous?.areas ?? [],
      firstSeen: previous?.firstSeen ?? today,
      lastSeen: today,
      logo: posting.logo || logoByCompany.get(posting.company) || '',
      summary: previous?.summary ?? '',
    };
  });

  // Jobs absent from this poll — kept until they pass the expiry window.
  const liveIds = new Set(liveJobs.map((job) => job.id));
  const carriedOver = previousJobs.filter(
    (job) => !liveIds.has(job.id) && daysSince(job.lastSeen, now) < expiryDays,
  );

  const jobs = [...liveJobs, ...carriedOver].sort((a, b) => a.id.localeCompare(b.id));
  return { updatedAt: now.toISOString(), jobs };
}

/** Write board data as pretty-printed JSON, creating the folder if needed. */
export async function saveBoard(path: string, board: BoardData): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  // Drop the transient `description` field — the board only needs the summary.
  const json = JSON.stringify(
    board,
    (key: string, value: unknown): unknown => (key === 'description' ? undefined : value),
    2,
  );
  await writeFile(path, json + '\n', 'utf-8');
}
