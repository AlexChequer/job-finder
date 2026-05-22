import type { Company, Posting } from '../types.js';
import { fetchJson } from './http.js';

/** SmartRecruiters' public Posting API — one company's open jobs per request. */
const POSTINGS_API = 'https://api.smartrecruiters.com/v1/companies';

/** The API caps page size at 100. */
const PAGE_SIZE = 100;

/** Safety cap on pages, so an unexpectedly large board can't stall a run. */
const MAX_PAGES = 20;

interface SmartRecruitersLocation {
  city?: string;
  region?: string;
  country?: string;
  remote?: boolean;
  fullLocation?: string;
}

interface SmartRecruitersPosting {
  id: string;
  name: string;
  location: SmartRecruitersLocation | null;
}

interface SmartRecruitersResponse {
  offset: number;
  limit: number;
  totalFound: number;
  content: SmartRecruitersPosting[];
}

/** Build a human-readable location from a SmartRecruiters posting. */
function formatLocation(location: SmartRecruitersLocation | null): string {
  if (!location) {
    return 'N/A';
  }
  if (location.remote) {
    return 'Remoto';
  }
  if (location.fullLocation) {
    return location.fullLocation;
  }
  const parts = [location.city, location.region].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(', ') : (location.country ?? 'N/A');
}

/** Fetch open postings for a company on SmartRecruiters, paging through results. */
export async function fetchSmartRecruiters(company: Company): Promise<Posting[]> {
  const postings: Posting[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_SIZE;
    const url = `${POSTINGS_API}/${company.token}/postings?limit=${PAGE_SIZE}&offset=${offset}`;
    const data = (await fetchJson(url)) as SmartRecruitersResponse;
    if (!Array.isArray(data.content)) {
      throw new Error(`SmartRecruiters ${company.token}: unexpected response shape`);
    }
    for (const job of data.content) {
      postings.push({
        id: `smartrecruiters:${company.token}:${job.id}`,
        company: company.name,
        title: job.name,
        location: formatLocation(job.location),
        url: `https://jobs.smartrecruiters.com/${company.token}/${job.id}`,
        source: 'smartrecruiters',
      });
    }
    if (data.content.length === 0 || offset + PAGE_SIZE >= data.totalFound) {
      break;
    }
  }
  return postings;
}
