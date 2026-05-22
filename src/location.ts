import { normalize } from './keywords.js';

/** Location fragments that mark a fully remote role. */
const REMOTE_TERMS = ['remoto', 'remote', 'home office'];

/**
 * True when a posting belongs on a São Paulo–focused board. A job counts when
 * its city is São Paulo; when `keepRemote` is set, fully remote roles also pass,
 * since they're open to someone living in São Paulo. Provisional filter — see
 * SAO_PAULO_ONLY in config.ts.
 */
export function isInSaoPaulo(location: string, keepRemote: boolean): boolean {
  const normalized = normalize(location);
  if (REMOTE_TERMS.some((term) => normalized.includes(term))) {
    return keepRemote;
  }
  // The city is the first segment, before ", state" / " / hybrid" / "(...)".
  const city = normalize(location.split(/[,/(]/)[0] ?? '').trim();
  return city === 'sao paulo';
}
