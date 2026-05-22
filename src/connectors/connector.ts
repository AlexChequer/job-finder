import type { AtsType, Company, Posting } from '../types.js';
import { fetchGreenhouse } from './greenhouse.js';
import { fetchLever } from './lever.js';
import { fetchSmartRecruiters } from './smartrecruiters.js';

/** A connector fetches every open posting for one company from its ATS. */
export type ConnectorFn = (company: Company) => Promise<Posting[]>;

/** Maps each per-company ATS type to its connector. Add a new ATS with one entry. */
export const connectors: Record<AtsType, ConnectorFn> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  smartrecruiters: fetchSmartRecruiters,
};
