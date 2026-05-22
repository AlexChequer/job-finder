import type { Company, Posting } from '../types.js';
import { fetchJson } from './http.js';

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string } | null;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

/** Fetch open postings for a company on Greenhouse. */
export async function fetchGreenhouse(company: Company): Promise<Posting[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs`;
  const data = (await fetchJson(url)) as GreenhouseResponse;
  if (!Array.isArray(data.jobs)) {
    throw new Error(`Greenhouse ${company.token}: unexpected response shape`);
  }
  return data.jobs.map(
    (job): Posting => ({
      id: `greenhouse:${company.token}:${job.id}`,
      company: company.name,
      title: job.title,
      location: job.location?.name ?? 'N/A',
      url: job.absolute_url,
      source: 'greenhouse',
    }),
  );
}
