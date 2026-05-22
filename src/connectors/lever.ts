import type { Company, Posting } from '../types.js';
import { fetchJson } from './http.js';

interface LeverJob {
  id: string;
  text: string;
  hostedUrl: string;
  categories: { location?: string } | null;
}

/** Fetch open postings for a company on Lever. */
export async function fetchLever(company: Company): Promise<Posting[]> {
  const url = `https://api.lever.co/v0/postings/${company.token}?mode=json`;
  const payload = await fetchJson(url);
  if (!Array.isArray(payload)) {
    throw new Error(`Lever ${company.token}: expected a job array`);
  }
  const jobs = payload as LeverJob[];
  return jobs.map(
    (job): Posting => ({
      id: `lever:${company.token}:${job.id}`,
      company: company.name,
      title: job.text,
      location: job.categories?.location ?? 'N/A',
      url: job.hostedUrl,
      source: 'lever',
    }),
  );
}
