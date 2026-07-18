import { parseMorphologyArtifact } from '@govori/content';
import type { MorphologyRepository } from './ports.js';

export interface MorphologyImportResult {
  entries: number;
  forms: number;
  producer: string;
}

/**
 * The morphology seeding seam (ADR 0037): re-validates an untrusted
 * morphology artifact against the shared schemas, then replaces each
 * item's paradigm idempotently. Invalid artifacts throw before anything
 * touches the repository.
 */
export async function importMorphologyArtifact(
  input: unknown,
  repository: MorphologyRepository,
): Promise<MorphologyImportResult> {
  const artifact = parseMorphologyArtifact(input);
  await repository.replaceForItems(artifact.entries);
  return {
    entries: artifact.entries.length,
    forms: artifact.entries.reduce(
      (total, entry) => total + entry.forms.length,
      0,
    ),
    producer: `${artifact.producer.name}@${artifact.producer.version}`,
  };
}
