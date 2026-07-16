import type { Item } from '@govori/content';

/** Persistence port for content items (ADR 0018). */
export interface ItemRepository {
  /** Idempotent by item id: reimporting an artifact updates in place. */
  upsertMany(items: readonly Item[]): Promise<void>;
  count(): Promise<number>;
}
