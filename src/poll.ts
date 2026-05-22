import { buildBoard, loadPreviousJobs, saveBoard } from './board.js';
import { companies } from './companies.js';
import { BOARD_PATH, EXPIRY_DAYS, KEEP_REMOTE, SAO_PAULO_ONLY, STATE_PATH } from './config.js';
import { connectors } from './connectors/connector.js';
import { fetchGupyPortal } from './connectors/gupyPortal.js';
import { classifyByCourses } from './courses.js';
import { fetchDescription } from './description.js';
import { isEarlyCareer } from './keywords.js';
import { isInSaoPaulo } from './location.js';
import { loadState, saveState } from './state.js';
import { summariesEnabled, summarizeJob } from './summarize.js';
import { sendJob } from './telegram.js';
import type { BoardData, JobRecord, Posting } from './types.js';

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

/**
 * Enrich board jobs in place: classify áreas from the courses named in the
 * description, and generate an AI summary for jobs that still lack one. The
 * description is fetched once and reused for both.
 */
async function enrichJobs(jobs: JobRecord[]): Promise<void> {
  const canSummarize = summariesEnabled();
  if (!canSummarize) {
    console.log('Summaries skipped — GEMINI_API_KEY not set.');
  }
  let summarized = 0;
  let summaryAttempts = 0;
  for (const job of jobs) {
    const needsAreas = job.areas.length === 0;
    const needsSummary = canSummarize && !job.summary && summaryAttempts < SUMMARY_LIMIT;
    if (!needsAreas && !needsSummary) continue;
    let description = '';
    try {
      description = await fetchDescription(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  description failed: ${job.company} — ${job.title} — ${message}`);
    }
    if (needsAreas) {
      job.areas = classifyByCourses(description);
    }
    if (needsSummary && description.length >= MIN_DESCRIPTION_LENGTH) {
      summaryAttempts += 1;
      try {
        job.summary = await summarizeJob(job.title, description);
        summarized += 1;
        await delay(SUMMARY_DELAY_MS);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`  summary failed: ${job.company} — ${job.title} — ${message}`);
      }
    }
  }
  console.log(`Summarized ${summarized} jobs.`);
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

  // Build the board, classify + summarize, then keep only relevant jobs.
  const previousJobs = await loadPreviousJobs(BOARD_PATH);
  const board = buildBoard(matched, previousJobs, new Date(), EXPIRY_DAYS);
  await enrichJobs(board.jobs);

  // Strict relevance gate — keep only jobs whose description named a target
  // course; service, manual, and unparseable roles fall away here.
  const relevant = board.jobs.filter((job) => job.areas.length > 0);
  console.log(`${board.jobs.length - relevant.length} jobs dropped — no target course found.`);
  const finalBoard: BoardData = { updatedAt: board.updatedAt, jobs: relevant };
  await saveBoard(BOARD_PATH, finalBoard);

  // Report freshness: live in this poll vs. carried over vs. expired off.
  const liveIds = new Set(matched.map((posting) => posting.id));
  const boardIds = new Set(finalBoard.jobs.map((job) => job.id));
  const carriedOver = finalBoard.jobs.filter((job) => !liveIds.has(job.id)).length;
  const expired = previousJobs.filter((job) => !boardIds.has(job.id)).length;
  console.log(
    `Board: ${finalBoard.jobs.length} jobs — ${finalBoard.jobs.length - carriedOver} live, ` +
      `${carriedOver} carried over, ${expired} expired off.`,
  );

  // Notify about jobs not seen before.
  const state = await loadState(STATE_PATH);
  const firstRun = state.seenIds.length === 0;
  const seen = new Set(state.seenIds);
  const newJobs = finalBoard.jobs.filter((job) => !seen.has(job.id));

  if (firstRun) {
    console.log(`First run: seeding ${finalBoard.jobs.length} postings, no notifications sent.`);
  } else {
    console.log(`${newJobs.length} new early-career postings to notify.`);
    await notify(newJobs, dryRun);
  }

  // Keep seen-state in step with the board: a job that expires off and later
  // reopens will alert again, and the file can't grow without bound.
  const seenIds = finalBoard.jobs.map((job) => job.id);
  await saveState(STATE_PATH, { seenIds });

  const sent = firstRun ? 0 : newJobs.length;
  console.log(
    `Done. Fetched ${allPostings.length}, matched ${finalBoard.jobs.length}, new ${sent}.`,
  );
}

main().catch((error: unknown) => {
  console.error('Poll failed:', error);
  process.exit(1);
});
