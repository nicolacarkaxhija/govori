import { createHash } from 'node:crypto';

/**
 * A stable pseudonymous speaker id for a user (ADR 0048).
 *
 * Derived by hashing the user id, so a dataset can group one speaker's clips
 * across sessions without ever storing the user id itself. Deterministic —
 * the same user always yields the same speaker — and never equal to the id
 * it is derived from.
 */
export function speakerPseudonym(userId: string): string {
  return `spk_${createHash('sha256').update(userId).digest('hex').slice(0, 24)}`;
}
