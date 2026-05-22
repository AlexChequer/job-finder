import { buildBoard, loadPreviousJobs, saveBoard } from './board.js';
import { companies } from './companies.js';
import { BOARD_PATH, EXPIRY_DAYS, KEEP_REMOTE, SAO_PAULO_ONLY, STATE_PATH } from './config.js';
import { connectors } from './connectors/connector.js';
import { fetchGupyPortal } from './connectors/gupyPortal.js';
import { fetchDescription } from './description.js';
import { isEarlyCareer } from './keywords.js';
import { isInSaoPaulo } from './location.js';
import { loadState, saveState } from './state.js';
import { summariesEnabled, summarizeJob } from './summarize.js';
import { sendJob } from './telegram.js';
import type { JobRecord, Posting } from './types.js';

const SEND_DELAY_MS = 80;
const SUMMARY_DELAY_MS = Number(process.env.SUMMARY_DELAY_MS ?? 4000);
const SUMMARY_LIMIT = Number(process.env.SUMMARY_LIMIT ?? 150);
const MIN_DESCRIPTION_LENGTH = 60;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch every company's postings, isolating failures per company. */
async function fetchAllPostings(): Promise<Posting[]> {
  const all: Posting[] = [];
  for (const company of companies) {
    try {
      const postings = await connectors[company.ats](company);
      all.push(...postings);
      console.log(`  ${company.name}: ${postings.length} postings`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  ${company.name}: failed — ${message}`);
    }
  }
  // Gupy's network-wide search — one source covering every company on Gupy.
  try {
    const portal = await fetchGupyPortal();
    all.push(...portal);
    console.log(`  Gupy network: ${portal.length} postings`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  Gupy network: failed — ${message}`);
  }
  return all;
}

/** Generate AI summaries for jobs that don't have one yet, up to the run limit. */
async function addSummaries(jobs: JobRecord[]): Promise<void> {
  if (!summariesEnabled()) {
    console.log('Summaries skipped — GEMINI_API_KEY not set.');
    return;
  }
  let attempts = 0;
  let done = 0;
  for (const job of jobs) {
    if (job.summary) continue;
    if (attempts >= SUMMARY_LIMIT) break;
    attempts += 1;
    try {
      const description = await fetchDescription(job);
      if (description.length < MIN_DESCRIPTION_LENGTH) continue;
      job.summary = await summarizeJob(job.title, description);
      done += 1;
      await delay(SUMMARY_DELAY_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  summary failed: ${job.company} — ${job.title} — ${message}`);
    }
  }
  console.log(`Summarized ${done} jobs.`);
}

/** Send new postings to Telegram, pacing requests to stay under rate limits. */
async function notify(jobs: JobRecord[], dryRun: boolean): Promise<void> {
  for (const job of jobs) {
    if (dryRun) {
      console.log(`  [dry run] ${job.company} — ${job.title}`);
    } else {
      await sendJob(job);
      await delay(SEND_DELAY_MS);
    }
  }
}

async function main(): Promise<void> {
  const dryRun = process.env.DRY_RUN === 'true';
  console.log(
    `Polling ${companies.length} companies + the Gupy network${dryRun ? ' (dry run)' : ''}...`,
  );

  const allPostings = await fetchAllPostings();
  const earlyCareer = allPostings.filter((posting) => isEarlyCareer(posting.title));
  const matched = SAO_PAULO_ONLY
    ? earlyCareer.filter((posting) => isInSaoPaulo(posting.location, KEEP_REMOTE))
    : earlyCareer;
  if (SAO_PAULO_ONLY) {
    console.log(`${earlyCareer.length} early-career postings, ${matched.length} in São Paulo.`);
  }

  // Build the board, generate any missing summaries, then persist it.
  const previousJobs = await loadPreviousJobs(BOARD_PATH);
  const board = buildBoard(matched, previousJobs, new Date(), EXPIRY_DAYS);
  await addSummaries(board.jobs);
  await saveBoard(BOARD_PATH, board);

  // Report freshness: live in this poll vs. carried over vs. expired off.
  const liveIds = new Set(matched.map((posting) => posting.id));
  const boardIds = new Set(board.jobs.map((job) => job.id));
  const carriedOver = board.jobs.filter((job) => !liveIds.has(job.id)).length;
  const expired = previousJobs.filter((job) => !boardIds.has(job.id)).length;
  console.log(
    `Board: ${board.jobs.length} jobs — ${board.jobs.length - carriedOver} live, ` +
      `${carriedOver} carried over, ${expired} expired off.`,
  );

  // Notify about jobs not seen before.
  const state = await loadState(STATE_PATH);
  const firstRun = state.seenIds.length === 0;
  const seen = new Set(state.seenIds);
  const newJobs = board.jobs.filter((job) => !seen.has(job.id));

  if (firstRun) {
    console.log(`First run: seeding ${board.jobs.length} postings, no notifications sent.`);
  } else {
    console.log(`${newJobs.length} new early-career postings to notify.`);
    await notify(newJobs, dryRun);
  }

  // Keep seen-state in step with the board: a job that expires off and later
  // reopens will alert again, and the file can't grow without bound.
  const seenIds = board.jobs.map((job) => job.id);
  await saveState(STATE_PATH, { seenIds });

  const sent = firstRun ? 0 : newJobs.length;
  console.log(`Done. Fetched ${allPostings.length}, matched ${board.jobs.length}, new ${sent}.`);
}

main().catch((error: unknown) => {
  console.error('Poll failed:', error);
  process.exit(1);
});
