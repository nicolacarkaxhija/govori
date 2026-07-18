import type { MorphologyArtifact } from '@govori/content';

/** One item's paradigm as shipped in the morphology artifact (ADR 0037). */
export type MorphologyEntry = MorphologyArtifact['entries'][number];

/** A single inflected form within a paradigm. */
export interface WordForm {
  tag: string;
  text: string;
}

/** Persistence port for inflected forms (ADR 0018). */
export interface MorphologyRepository {
  /** Idempotent by item id: reimporting replaces each paradigm wholesale. */
  replaceForItems(entries: readonly MorphologyEntry[]): Promise<void>;
}

/** Read port for serving a single item's forms. */
export interface MorphologyQueries {
  /** Empty for unknown or formless items — absence is not an error. */
  formsFor(itemId: string): Promise<WordForm[]>;
}
