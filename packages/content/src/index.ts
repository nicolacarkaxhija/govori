import { z } from 'zod';
import { isCanonical } from '@govori/transliteration';

/** A content artifact failed validation at the import seam (ADR 0037). */
export class ArtifactError extends Error {
  override readonly name = 'ArtifactError';
}

export const LanguageCodeSchema = z
  .string()
  .regex(/^[a-z]{2,3}(-[a-zA-Z0-9]+)*$/, 'expected a BCP 47 language code');

export const TranslationSchema = z.object({
  lang: LanguageCodeSchema,
  text: z.string().trim().min(1),
});

/** Contrastive note shown to speakers of one source language (ADR 0001). */
export const ContrastiveNoteSchema = z.object({
  sourceLang: LanguageCodeSchema,
  text: z.string().trim().min(1),
});

/** Where an item came from — queryable, disclosed product policy (ADR 0012). */
export const ProvenanceSchema = z.discriminatedUnion('origin', [
  z.object({
    origin: z.literal('human'),
    /** The auth system's user id — an opaque string, not a UUID. */
    contributorId: z.string().min(1),
  }),
  z.object({
    origin: z.literal('ai-draft'),
    model: z.string().min(1),
    generatedAt: z.iso.datetime(),
    factPack: z.string().min(1).optional(),
  }),
  z.object({
    origin: z.literal('import'),
    source: z.string().min(1),
    license: z.string().min(1),
    url: z.url().optional(),
    attribution: z.string().min(1),
  }),
]);

/** Result of the originality audit (ADR 0035). */
export const OriginalityAuditSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('clean'),
    maxOverlap: z.number().min(0).max(1),
    auditedAt: z.iso.datetime(),
  }),
  z.object({
    status: z.literal('flagged'),
    maxOverlap: z.number().min(0).max(1),
    reference: z.string().min(1),
    auditedAt: z.iso.datetime(),
  }),
  z.object({
    status: z.literal('exempt-import'),
    auditedAt: z.iso.datetime(),
  }),
]);

const CanonicalTextSchema = z
  .string()
  .refine(isCanonical, 'expected canonical etymological Latin (ADR 0003)');

/**
 * Normalized part-of-speech inventory, folded down from the slovnik's raw
 * tags (gendered noun tags like `m.anim.`, verb tags like `v.tr. ipf.`).
 * The raw tag survives verbatim in `posDetail`.
 */
export const PartOfSpeechSchema = z.enum([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'numeral',
  'preposition',
  'conjunction',
  'interjection',
  'particle',
  'phrase',
  'affix',
]);

export const ItemSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['word', 'phrase', 'sentence']),
  /** Canonical etymological Latin only; scripts are derived (ADR 0003). */
  text: CanonicalTextSchema,
  translations: z.array(TranslationSchema).min(1),
  /** Community frequency score; higher = more common. Drives ordering. */
  frequency: z.number().min(0).optional(),
  /** Normalized part of speech; morphology drills key off this. */
  pos: PartOfSpeechSchema.optional(),
  /** The source's raw part-of-speech tag, e.g. `v.tr. ipf.` or `m.anim.`. */
  posDetail: z.string().trim().min(1).optional(),
  notes: z.array(ContrastiveNoteSchema).default([]),
  provenance: ProvenanceSchema,
  audit: OriginalityAuditSchema.optional(),
});

/**
 * The contract between content preparation (dedicated forge repository) and
 * this app's importer (ADR 0037). Artifacts are re-validated at import time.
 */
export const ContentArtifactSchema = z.object({
  schemaVersion: z.literal(1),
  createdAt: z.iso.datetime(),
  producer: z.object({
    name: z.string().min(1),
    version: z.string().min(1),
  }),
  items: z.array(ItemSchema).min(1),
});

export type PartOfSpeech = z.infer<typeof PartOfSpeechSchema>;
export type Translation = z.infer<typeof TranslationSchema>;
export type ContrastiveNote = z.infer<typeof ContrastiveNoteSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type OriginalityAudit = z.infer<typeof OriginalityAuditSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type ContentArtifact = z.infer<typeof ContentArtifactSchema>;

/**
 * Curriculum: the gated course structure over the item pool (ADR 0009).
 * Shipped as its own artifact so structure and items version independently.
 */
export const CurriculumArtifactSchema = z.object({
  schemaVersion: z.literal(1),
  createdAt: z.iso.datetime(),
  producer: z.object({
    name: z.string().min(1),
    version: z.string().min(1),
  }),
  units: z
    .array(
      z.object({
        title: z.string().min(1),
        lessons: z
          .array(
            z.object({
              title: z.string().min(1),
              itemIds: z.array(z.uuid()).min(1),
              /** Optional intro scene (ADR 0039); rides the lesson so
               * wholesale curriculum reimports cannot orphan it. */
              dialogue: z
                .object({
                  turns: z
                    .array(
                      z.object({
                        speaker: z.string().min(1),
                        text: CanonicalTextSchema,
                        translation: z.string().min(1),
                      }),
                    )
                    .min(1),
                  provenance: ProvenanceSchema,
                })
                .optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type CurriculumArtifact = z.infer<typeof CurriculumArtifactSchema>;

export function parseCurriculumArtifact(input: unknown): CurriculumArtifact {
  const result = CurriculumArtifactSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ArtifactError(`invalid curriculum artifact — ${details}`);
  }
  return result.data;
}

/** Parses an untrusted artifact, throwing ArtifactError with every path. */
export function parseContentArtifact(input: unknown): ContentArtifact {
  const result = ContentArtifactSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ArtifactError(`invalid content artifact — ${details}`);
  }
  return result.data;
}
