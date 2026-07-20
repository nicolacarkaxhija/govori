import { z } from 'zod';

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
  /**
   * 0-based index of the sense this translation renders, within the
   * item's sense inventory. Omitted = ungrouped (e.g. cross-language
   * translations a source does not sense-delimit).
   */
  senseGroup: z.number().int().min(0).optional(),
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

/**
 * Cross-source attestation tier, triangulated in the forge from how many
 * independent corpora corroborate the headword: gold = 3+ sources,
 * silver = 2, bronze = 1.
 */
export const AttestationSchema = z.enum(['gold', 'silver', 'bronze']);

const ProducerSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
});

/** Parses an untrusted artifact, throwing ArtifactError with every path. */
function parserFor<Schema extends z.ZodType>(schema: Schema, kind: string) {
  return (input: unknown): z.infer<Schema> => {
    const result = schema.safeParse(input);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new ArtifactError(`invalid ${kind} artifact — ${details}`);
    }
    return result.data;
  };
}

/**
 * Binds the artifact schemas to one language's canonical-orthography
 * validator (ADR 0029): the parsers know *that* item text must be
 * canonical, but only a language pack knows *what* canonical means.
 * Callers pass `pack.validateCanonical` at their composition root.
 */
export function makeContentSchemas(
  validateCanonical: (text: string) => boolean,
) {
  const CanonicalTextSchema = z
    .string()
    .refine(validateCanonical, 'expected canonical text (ADR 0003)');

  const ItemSchema = z.object({
    id: z.uuid(),
    kind: z.enum(['word', 'phrase', 'sentence']),
    /** Canonical orthography only; scripts are derived (ADR 0003). */
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
    /** Word/phrase items only; see {@link AttestationSchema}. */
    attestation: AttestationSchema.optional(),
    /**
     * Computed 0-1 sentence-difficulty score, blended from mean word-rank
     * percentile, sentence length, and morphological complexity.
     * Sentence items only.
     */
    difficulty: z.number().min(0).max(1).optional(),
  });

  /**
   * The contract between content preparation (dedicated forge repository)
   * and this app's importer (ADR 0037). Re-validated at import time.
   */
  const ContentArtifactSchema = z.object({
    schemaVersion: z.literal(1),
    createdAt: z.iso.datetime(),
    producer: ProducerSchema,
    items: z.array(ItemSchema).min(1),
  });

  /**
   * Curriculum: the gated course structure over the item pool (ADR 0009).
   * Shipped as its own artifact so structure and items version
   * independently.
   */
  const CurriculumArtifactSchema = z.object({
    schemaVersion: z.literal(1),
    createdAt: z.iso.datetime(),
    producer: ProducerSchema,
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

  /**
   * Inflected word forms for morphology drills, keyed to content items.
   * Shipped as its own artifact so forms and items version independently;
   * `tag` is a short slot name (e.g. `pl`, `past.f`, `pres.2sg`) derived
   * in the forge from the dictionary's affix classes.
   */
  const MorphologyArtifactSchema = z.object({
    schemaVersion: z.literal(1),
    createdAt: z.iso.datetime(),
    producer: ProducerSchema,
    entries: z
      .array(
        z.object({
          /** The content-artifact item this paradigm belongs to. */
          itemId: z.uuid(),
          pos: PartOfSpeechSchema,
          /** A one-form paradigm cannot drill anything; two is the floor. */
          forms: z
            .array(
              z.object({
                tag: z.string().trim().min(1),
                text: CanonicalTextSchema,
              }),
            )
            .min(2),
        }),
      )
      .min(1),
  });

  return {
    ItemSchema,
    ContentArtifactSchema,
    CurriculumArtifactSchema,
    MorphologyArtifactSchema,
    parseContentArtifact: parserFor(ContentArtifactSchema, 'content'),
    parseCurriculumArtifact: parserFor(CurriculumArtifactSchema, 'curriculum'),
    parseMorphologyArtifact: parserFor(MorphologyArtifactSchema, 'morphology'),
  };
}

/** Every schema and parser bound to one language's canonical validator. */
export type ContentSchemas = ReturnType<typeof makeContentSchemas>;

export type PartOfSpeech = z.infer<typeof PartOfSpeechSchema>;
export type Attestation = z.infer<typeof AttestationSchema>;
export type Translation = z.infer<typeof TranslationSchema>;
export type ContrastiveNote = z.infer<typeof ContrastiveNoteSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type OriginalityAudit = z.infer<typeof OriginalityAuditSchema>;
export type Item = z.infer<ContentSchemas['ItemSchema']>;
export type ContentArtifact = z.infer<ContentSchemas['ContentArtifactSchema']>;
export type CurriculumArtifact = z.infer<
  ContentSchemas['CurriculumArtifactSchema']
>;
export type MorphologyArtifact = z.infer<
  ContentSchemas['MorphologyArtifactSchema']
>;
