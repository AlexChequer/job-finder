import { stripHtml } from './text.js';
import type { JobRecord } from './types.js';

/** Fetch one Greenhouse job's description via the single-job endpoint. */
async function greenhouseDescription(token: string, id: string): Promise<string> {
  const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs/${id}`);
  if (!response.ok) {
    return '';
  }
  const data = (await response.json()) as { content?: string };
  return stripHtml(data.content ?? '');
}

/** Fetch one Lever posting's description via the single-posting endpoint. */
async function leverDescription(token: string, id: string): Promise<string> {
  const response = await fetch(`https://api.lever.co/v0/postings/${token}/${id}?mode=json`);
  if (!response.ok) {
    return '';
  }
  const data = (await response.json()) as {
    descriptionPlain?: string;
    lists?: { text?: string; content?: string }[];
  };
  const lists = (data.lists ?? [])
    .map((list) => `${list.text ?? ''}: ${stripHtml(list.content ?? '')}`)
    .join(' ');
  return `${data.descriptionPlain ?? ''} ${lists}`.trim();
}

/** Fetch the full description text for a job, used as input for summarization. */
export async function fetchDescription(job: JobRecord): Promise<string> {
  // Gupy postings carry their description inline from the portal API.
  if (job.description) {
    return stripHtml(job.description);
  }
  const parts = job.id.split(':');
  const token = parts[1] ?? '';
  const nativeId = parts[2] ?? '';
  if (job.source === 'greenhouse') {
    return greenhouseDescription(token, nativeId);
  }
  if (job.source === 'lever') {
    return leverDescription(token, nativeId);
  }
  return '';
}
