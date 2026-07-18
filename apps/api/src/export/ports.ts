import type { CurriculumArtifact, Item } from '@govori/content';
import type { MorphologyEntry } from '../morphology/ports.js';

/** One unit as it appears in the exported curriculum artifact. */
export type ExportUnit = CurriculumArtifact['units'][number];

/**
 * Read port for the public open-data export (ADR 0007/0010): the whole
 * pool at once, shaped exactly like the import artifacts so the export
 * round-trips through our own importer.
 */
export interface ExportQueries {
  allItems(): Promise<Item[]>;
  curriculumUnits(): Promise<ExportUnit[]>;
  /** Only entries a valid artifact can carry: a pos and two-plus forms. */
  morphologyEntries(): Promise<MorphologyEntry[]>;
}
