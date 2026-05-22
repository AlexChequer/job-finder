/** ATS platforms polled one company at a time. */
export type AtsType = 'greenhouse' | 'lever';

/** Where a posting came from — the per-company ATSs plus the Gupy network. */
export type Source = AtsType | 'gupy';

/** A normalized job posting — every connector emits this shape. */
export interface Posting {
  /** Stable dedup key, e.g. "greenhouse:{token}:{id}" or "gupy:{id}". */
  id: string;
  company: string;
  title: string;
  location: string;
  url: string;
  source: Source;
  /** Company logo URL, when the source provides one. */
  logo?: string;
  /** Raw job description — input for AI summaries, never written to the board. */
  description?: string;
}

/** A company to track, plus what the connector needs to reach its ATS. */
export interface Company {
  name: string;
  ats: AtsType;
  /** Greenhouse/Lever board slug. */
  token: string;
  /** Marketing domain for the logo. */
  domain?: string;
}

/** Early-career level bucket, derived from the job title. */
export type Level = 'estagio' | 'trainee' | 'aprendiz' | 'junior' | 'newgrad';

/** Broad role area, derived from the job title. */
export type Area = 'engenharia' | 'dados' | 'produto' | 'negocios' | 'outro';

/** A posting enriched with classification, recency, and an AI summary. */
export interface JobRecord extends Posting {
  level: Level;
  area: Area;
  /** ISO date (YYYY-MM-DD) the tracker first saw this job. */
  firstSeen: string;
  /**
   * ISO date (YYYY-MM-DD) the tracker last saw this job in a poll. A job is
   * dropped from the board once this falls outside the expiry window — so
   * `lastSeen + EXPIRY_DAYS` is effectively the posting's expiration date.
   */
  lastSeen: string;
  /** Company logo URL, or '' when none is known. */
  logo: string;
  /** One-line AI synthesis of the role, or '' when not yet generated. */
  summary: string;
}

/** The job board payload written to docs/jobs.json for the static page. */
export interface BoardData {
  /** ISO timestamp of the last poll. */
  updatedAt: string;
  jobs: JobRecord[];
}
