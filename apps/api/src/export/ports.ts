import type { CurriculumArtifact, Item } from '@glotty/content';
import type { MorphologyEntry } from '../morphology/ports.js';

/** One unit as it appears in the exported curriculum artifact. */
export type ExportUnit = CurriculumArtifact['units'][number];

/**
 * Read port for the public open-data export (ADR 0007/0010): one
 * direction's whole pool at once (ADR 0046), shaped exactly like the
 * import artifacts so the export round-trips through our own importer.
 */
export interface ExportQueries {
  allItems(direction: string): Promise<Item[]>;
  curriculumUnits(direction: string): Promise<ExportUnit[]>;
  /** Only entries a valid artifact can carry: a pos and two-plus forms. */
  morphologyEntries(direction: string): Promise<MorphologyEntry[]>;
}
