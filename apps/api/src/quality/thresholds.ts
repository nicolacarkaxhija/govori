import type { QualityThresholds } from './ports.js';

/**
 * The auto-escalation bars for the quality-feedback loop (ADR 0051). An item
 * surfaces to reviewers when learners lapse on it far more often than a healthy
 * item warrants, or when enough of them report it by hand. The numbers are the
 * charter's: they are set here, once, and never re-derived at a call site.
 */

/**
 * Minimum graded reviews before a failure rate is trustworthy. Below this a
 * couple of early lapses are noise, not a quality signal — the charter's ≥10.
 */
export const MIN_GRADED_EVENTS = 10;

/**
 * Lapse-rate bar: an item trips it when strictly more than half of its graded
 * reviews were graded 'again' — the charter's >50%.
 */
export const FAILURE_RATE_THRESHOLD = 0.5;

/**
 * Open manual reports that auto-flag an item — the charter's three. The same
 * count stamps flagged_at on the reports themselves (see the report store).
 */
export const REPORT_FLAG_THRESHOLD = 3;

/** The charter's bars, bundled for the escalation query. */
export const qualityThresholds: QualityThresholds = {
  minGraded: MIN_GRADED_EVENTS,
  failureRate: FAILURE_RATE_THRESHOLD,
  minReports: REPORT_FLAG_THRESHOLD,
};
