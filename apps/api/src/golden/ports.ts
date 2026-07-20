import type { SampleCandidate } from './sample.js';

/** One reviewer's scores over a golden-set item (ADR 0051). */
export interface GoldenAudit {
  accuracy: number;
  naturalness: number;
  fit: number;
  comment: string | null;
  auditedAt: string;
}

/** A golden-set item awaiting the caller's audit, with any prior audit on it. */
export interface GoldenQueueEntry {
  itemId: string;
  /** The most recent audit on this item by anyone, as review context; null
   * when nobody has audited it yet. */
  priorAudit: GoldenAudit | null;
}

/** The write side of one reviewer's audit; the store stamps the time. */
export interface GoldenAuditInput {
  itemId: string;
  direction: string;
  reviewerId: string;
  accuracy: number;
  naturalness: number;
  fit: number;
  comment: string | null;
}

/** The direction's published quality signal (ADR 0051). */
export interface GoldenQuality {
  /** Mean of the three axes across every audit, rescaled 1-5 → 0-100. */
  score: number;
  /** Distinct golden-set items with at least one audit. */
  auditedItems: number;
}

/**
 * The golden-set store (ADR 0051): the append-only sample per direction, the
 * reviewer audits over it, and the quality query derived from those audits.
 */
export interface GoldenSetStore {
  /** The direction's whole item pool, reduced to what stratification needs. */
  sampleCandidates(direction: string): Promise<SampleCandidate[]>;
  /** Item ids currently in the direction's golden sample. */
  sampleItemIds(direction: string): Promise<string[]>;
  /** Appends ids to the sample; ids already present are skipped. Returns the
   * number newly added. */
  addToSample(direction: string, itemIds: readonly string[]): Promise<number>;
  /** Golden-sample items the reviewer has not yet audited, oldest-sampled
   * first, each with the most recent prior audit (by anyone) or null. */
  queueFor(
    direction: string,
    reviewerId: string,
    limit: number,
  ): Promise<GoldenQueueEntry[]>;
  /** Upserts one audit per (item, reviewer). */
  saveAudit(input: GoldenAuditInput): Promise<void>;
  /** The direction's quality signal, or null when no audits exist yet. */
  quality(direction: string): Promise<GoldenQuality | null>;
}
