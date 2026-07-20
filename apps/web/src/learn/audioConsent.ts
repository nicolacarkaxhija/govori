import { z } from 'zod';
import { instance } from '../instance';

/**
 * The consent charter version (ADR 0048). A learner is asked once; the
 * choice is remembered, but a bump here re-shows the sheet so a changed
 * charter is never applied to a clip under stale terms.
 */
export const CONSENT_VERSION = '1';

/** A remembered consent choice. App use is always granted (it is the price
 * of contributing at all); dataset and training are the learner's to set. */
export interface StoredConsent {
  version: string;
  app: true;
  dataset: boolean;
  training: boolean;
}

const KEY = `${instance.id}.audioConsent`;

const schema = z.object({
  version: z.string(),
  dataset: z.boolean(),
  training: z.boolean(),
});

/**
 * The remembered choice, or null when none is stored or it predates the
 * current charter version — in which case the caller re-asks.
 */
export function loadConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      return null;
    }
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.version !== CONSENT_VERSION) {
      return null;
    }
    return {
      version: CONSENT_VERSION,
      app: true,
      dataset: parsed.data.dataset,
      training: parsed.data.training,
    };
  } catch {
    return null;
  }
}

/** Persists a choice under the current charter version and returns it. */
export function saveConsent(grants: {
  dataset: boolean;
  training: boolean;
}): StoredConsent {
  const stored: StoredConsent = {
    version: CONSENT_VERSION,
    app: true,
    dataset: grants.dataset,
    training: grants.training,
  };
  localStorage.setItem(KEY, JSON.stringify(stored));
  return stored;
}
