/** Committed dedup state — which postings have already triggered an alert. */
export const STATE_PATH = 'data/seen.json';

/** Committed job board data, served as a static page by GitHub Pages. */
export const BOARD_PATH = 'docs/jobs.json';

/** Public URL of the job board. Update this if your GitHub repo name differs. */
export const BOARD_URL = 'https://alexchequer.github.io/job-finder/';

/** Provisional location filter: keep only jobs in the city of São Paulo. */
export const SAO_PAULO_ONLY: boolean = true;

/** When SAO_PAULO_ONLY is on, also keep fully remote jobs. */
export const KEEP_REMOTE: boolean = true;

/**
 * How many days a job may be absent from polls before it's dropped from the
 * board. A grace window, not an instant cut: genuinely-closed postings fall off
 * after this many days, while a one-off fetch failure for a company (the poll
 * isolates failures per source) never wipes its still-open jobs. Override with
 * the EXPIRY_DAYS env var.
 */
export const EXPIRY_DAYS = Number(process.env.EXPIRY_DAYS ?? 7);
