/** Public aggregate counters (ADR 0033) — never anything individual.
 * Content counters are scoped to one direction (ADR 0046); learners
 * belong to the whole instance. */
export interface StatsQueries {
  counts(direction: string): Promise<{
    items: number;
    translations: number;
    reviews: number;
    learners: number;
  }>;
}
