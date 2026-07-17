/** Public aggregate counters (ADR 0033) — never anything individual. */
export interface StatsQueries {
  counts(): Promise<{
    items: number;
    translations: number;
    reviews: number;
    learners: number;
  }>;
}
