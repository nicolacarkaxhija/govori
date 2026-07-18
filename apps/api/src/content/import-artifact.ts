import type { ContentSchemas } from '@glotty/content';
import type { ItemRepository } from './ports.js';

export interface ImportResult {
  imported: number;
  producer: string;
}

/**
 * The bare-minimum seeding seam (ADR 0037): re-validates an untrusted
 * content artifact against the shared schemas — bound to the instance's
 * language pack at the composition root (ADR 0029) — then upserts
 * idempotently. Invalid artifacts throw before anything touches the
 * repository.
 */
export async function importArtifact(
  input: unknown,
  repository: ItemRepository,
  parseContentArtifact: ContentSchemas['parseContentArtifact'],
): Promise<ImportResult> {
  const artifact = parseContentArtifact(input);
  await repository.upsertMany(artifact.items);
  return {
    imported: artifact.items.length,
    producer: `${artifact.producer.name}@${artifact.producer.version}`,
  };
}
