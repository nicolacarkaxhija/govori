import type { Item } from '@glotty/content';

/** An item together with the direction whose pool it lives in. */
export interface DirectedItem {
  item: Item;
  /** The owning direction's id (ADR 0046). */
  direction: string;
}

/** Persistence port for content items (ADR 0018). */
export interface ItemRepository {
  /** Idempotent by item id: reimporting an artifact updates in place.
   * Every row lands in the given direction's pool (ADR 0046). */
  upsertMany(items: readonly Item[], direction: string): Promise<void>;
  count(): Promise<number>;
}

/** Read port for serving content; pools are per direction (ADR 0046). */
export interface ItemQueries {
  /** Ids are globally unique, so lookup needs no direction — the item
   * answers with the direction it belongs to. */
  findById(id: string): Promise<DirectedItem | undefined>;
  /** Preserves the order of the requested ids; unknown ids are skipped. */
  findByIds(ids: readonly string[]): Promise<Item[]>;
  list(direction: string, limit: number, offset: number): Promise<Item[]>;
  /** Sentence items containing any of the words (whole-word, any case). */
  findSentencesContaining(
    direction: string,
    words: readonly string[],
    limit: number,
  ): Promise<Item[]>;
}
