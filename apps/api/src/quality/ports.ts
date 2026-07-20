import type { Item } from '@glotty/content';

/** The four reasons a learner may attach to a quality report (ADR 0051). */
export const REPORT_REASONS = [
  'wrong_translation',
  'not_natural',
  'wrong_audio',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

/** A learner's report of a problem with a published item. */
export interface NewReport {
  itemId: string;
  /** The reported item's direction (ADR 0046), copied from the item. */
  direction: string;
  /** The signed-in reporter, or null for an anonymous report. */
  reporterId: string | null;
  reason: ReportReason;
  comment: string | null;
}

/**
 * Learner quality reports over published items (ADR 0051 quality-feedback-loop).
 * Anonymous reports are allowed — a report is a quality signal, not an identity
 * action.
 */
export interface ReportStore {
  /**
   * Records a report. Stamps flagged_at on the item's reports the moment the
   * third open report lands, once — idempotent under further reports. Returns
   * whether the item stands flagged after this report.
   */
  add(report: NewReport): Promise<{ flagged: boolean }>;
}

/** How many open reports carry each reason for one flagged item. */
export interface ReasonCount {
  reason: ReportReason;
  count: number;
}

/** One auto-escalated item for the reviewer flags view (ADR 0051). */
export interface QualityFlag {
  item: Item;
  /** Reviews graded 'again' for this item. */
  againCount: number;
  /** All graded reviews for this item. */
  totalGraded: number;
  /** Lapse rate among graded reviews, 0-1. */
  failureRate: number;
  /** Open manual reports on this item. */
  openReports: number;
  /** Open reports broken down by reason, richest first. */
  reasons: ReasonCount[];
}

/** The escalation bars an item must clear to surface (ADR 0051). */
export interface QualityThresholds {
  /** Minimum graded reviews before a failure rate is trusted. */
  minGraded: number;
  /** Lapse-rate bar as a fraction 0-1; strictly greater than trips it. */
  failureRate: number;
  /** Open reports that auto-flag an item. */
  minReports: number;
}

/**
 * Reviewer-facing escalation query (ADR 0051 quality-feedback-loop): a
 * server-side aggregation over the review-event log and the reports table.
 * It adds no per-learner tracking — it reads the events already synced.
 */
export interface QualityQueries {
  /** Flagged items of one direction, most severe first. */
  flags(
    direction: string,
    thresholds: QualityThresholds,
  ): Promise<QualityFlag[]>;
}
