import {
  boolean,
  customType,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  Attestation,
  CurriculumArtifact,
  Item,
  OriginalityAudit,
  PartOfSpeech,
  Provenance,
} from '@glotty/content';
import type { DeviceMeta } from '../audio/ports.js';

/** The content atom (ADR 0002/0003); text is canonical in its pack. */
export const items = pgTable('items', {
  id: uuid('id').primaryKey(),
  /**
   * The learning direction this item belongs to (ADR 0046). Nullable in
   * SQL only for the migration window: the boot backfill stamps every
   * NULL with the instance's first direction, and adapters treat NULL
   * rows as absent from then on.
   */
  direction: text('direction'),
  kind: text('kind', { enum: ['word', 'phrase', 'sentence'] }).notNull(),
  text: text('text').notNull(),
  provenance: jsonb('provenance').$type<Provenance>().notNull(),
  audit: jsonb('audit').$type<OriginalityAudit>(),
  frequency: real('frequency'),
  /** Normalized part of speech from the content artifact; null until set. */
  pos: text('pos').$type<PartOfSpeech>(),
  /** The source's raw part-of-speech tag, e.g. `v.tr. ipf.` or `m.anim.`. */
  posDetail: text('pos_detail'),
  /** Cross-source triangulation tier from the forge (ADR 0051); word/phrase only. */
  attestation: text('attestation').$type<Attestation>(),
  /** Computed 0-1 sentence-difficulty score (ADR 0051); sentence items only. */
  difficulty: real('difficulty'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** AI drafts awaiting a human decision — never served publicly (ADR 0038). */
export const reviewQueue = pgTable('review_queue', {
  /** Matches the item id the draft becomes when approved. */
  id: uuid('id').primaryKey(),
  /** The direction the draft publishes into (ADR 0046); see items. */
  direction: text('direction'),
  item: jsonb('item').$type<Item>().notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] })
    .notNull()
    .default('pending'),
  decidedBy: text('decided_by'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One community vote per learner per pending draft (ADR 0040). */
export const reviewVotes = pgTable(
  'review_votes',
  {
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviewQueue.id, { onDelete: 'cascade' }),
    voterId: text('voter_id').notNull(),
    up: boolean('up').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.reviewId, table.voterId] })],
);

export const translations = pgTable(
  'translations',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    lang: text('lang').notNull(),
    text: text('text').notNull(),
    /** 0-based sense-inventory index this translation renders (ADR 0051). */
    senseGroup: integer('sense_group'),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.lang, table.text] })],
);

/**
 * Inflected forms per item for morphology drills; replaced wholesale on
 * reimport (ADR 0037). `tag` is a short slot name like `pres.2sg`.
 */
export const itemForms = pgTable(
  'item_forms',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
    text: text('text').notNull(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.tag, table.text] })],
);

/** Contrastive notes per source language (ADR 0001). */
export const contrastiveNotes = pgTable(
  'contrastive_notes',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    sourceLang: text('source_lang').notNull(),
    text: text('text').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.sourceLang, table.text] }),
  ],
);

/** Gated course structure over the item pool (ADR 0009). */
export const units = pgTable('units', {
  id: uuid('id').primaryKey(),
  /** The direction this unit teaches (ADR 0046); see items. Lessons
   * inherit it through their unit. */
  direction: text('direction'),
  title: text('title').notNull(),
  position: real('position').notNull(),
});

type LessonDialogue = NonNullable<
  CurriculumArtifact['units'][number]['lessons'][number]['dialogue']
>;

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey(),
  dialogue: jsonb('dialogue').$type<LessonDialogue>(),
  unitId: uuid('unit_id')
    .notNull()
    .references(() => units.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  position: real('position').notNull(),
});

export const lessonItems = pgTable(
  'lesson_items',
  {
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    position: real('position').notNull(),
  },
  (table) => [primaryKey({ columns: [table.lessonId, table.itemId] })],
);

/**
 * The golden-set sample (ADR 0051): a fixed, append-only list of item ids per
 * direction, stratified-sampled from the pool. Items enter once and stay —
 * growing the course adds new picks without displacing audited ones, so this
 * is only ever inserted into, never deleted from.
 */
export const goldenSample = pgTable(
  'golden_sample',
  {
    direction: text('direction').notNull(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.direction, table.itemId] })],
);

/**
 * Reviewer audits over the golden set (ADR 0051): one row per (item,
 * reviewer), re-auditing upserts in place. Three 1-5 axes plus an optional
 * comment; the public quality score is a query over these rows, never stored.
 */
export const goldenAudits = pgTable(
  'golden_audits',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    /** The audited item's direction (ADR 0046); scopes the quality query. */
    direction: text('direction').notNull(),
    reviewerId: text('reviewer_id').notNull(),
    accuracy: integer('accuracy').notNull(),
    naturalness: integer('naturalness').notNull(),
    fit: integer('fit').notNull(),
    comment: text('comment'),
    auditedAt: timestamp('audited_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.reviewerId] })],
);

/** Auth tables owned by better-auth (ADR 0021); shapes follow its core schema. */
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  role: text('role', { enum: ['learner', 'reviewer', 'admin'] })
    .notNull()
    .default('learner'),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
    withTimezone: true,
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Append-only review events per user (ADR 0030); the event id is the
 * identity, so set-union sync is INSERT ... ON CONFLICT DO NOTHING.
 */
export const reviewEvents = pgTable('review_events', {
  id: uuid('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull(),
  grade: text('grade', {
    enum: ['again', 'hard', 'good', 'easy'],
  }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Learner quality reports on published items (ADR 0051 quality-feedback-loop).
 * Anonymous reporting is allowed — a report is a quality signal, not an
 * identity action — so reporter_id is nullable. Three open reports on one item
 * auto-flag it: flagged_at is stamped once, when the third open report lands.
 */
export const itemReports = pgTable('item_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  /** The reported item's direction (ADR 0046); copied from the item at report
   * time so the reviewer flags view can scope by direction without a join. */
  direction: text('direction').notNull(),
  /** The signed-in reporter, or null for an anonymous report. */
  reporterId: text('reporter_id'),
  reason: text('reason', {
    enum: ['wrong_translation', 'not_natural', 'wrong_audio', 'other'],
  }).notNull(),
  comment: text('comment'),
  status: text('status', { enum: ['open', 'resolved', 'dismissed'] })
    .notNull()
    .default('open'),
  /** Stamped once, on the third open report for the item; idempotent. */
  flaggedAt: timestamp('flagged_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Runtime feature-flag states; the dependency graph lives in code (ADR 0025). */
export const flagStates = pgTable('flag_states', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull(),
  /** Visibility ring: role-and-up may see the flag (ADR 0025). */
  targetRole: text('target_role', { enum: ['all', 'reviewer', 'admin'] })
    .notNull()
    .default('all'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: text('updated_by').notNull(),
});

/** Append-only audit of who flipped what, when (ADR 0025). */
export const flagAudit = pgTable('flag_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  enabled: boolean('enabled').notNull(),
  /** The visibility ring set by this change (ADR 0025). */
  targetRole: text('target_role', { enum: ['all', 'reviewer', 'admin'] })
    .notNull()
    .default('all'),
  changedBy: text('changed_by').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
});

/**
 * Community recordings, carried at dataset grade from day one (ADR 0048) so
 * activating the audio program needs no migration. Many per item; validated
 * through the community-vote path (ADR 0040) before they serve publicly.
 */
export const recordings = pgTable('recordings', {
  id: uuid('id').primaryKey(),
  itemId: uuid('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  /**
   * The learning direction this clip belongs to (ADR 0046); see items.
   * Nullable for the migration window, treated as absent once backfilled.
   */
  direction: text('direction'),
  contributorId: text('contributor_id').notNull(),
  /** Stable pseudonymous speaker id (ADR 0048): derived per user, never the
   * user id, so a dataset can group a speaker without carrying their identity. */
  speakerPseudonym: text('speaker_pseudonym').notNull(),
  /** Contributor-declared accent/dialect tag; null when undeclared. */
  accentTag: text('accent_tag'),
  mime: text('mime').notNull(),
  bytes: bytea('bytes').notNull(),
  /** Client-estimated capture metadata: sample rate, mime, duration (ADR 0048). */
  deviceMeta: jsonb('device_meta').$type<DeviceMeta>().notNull(),
  /** Versioned consent record (ADR 0048): the three grants are independently
   * opt-in; app-use is required to contribute, dataset and training default off. */
  consentVersion: text('consent_version').notNull(),
  consentApp: boolean('consent_app').notNull(),
  consentDataset: boolean('consent_dataset').notNull().default(false),
  consentTraining: boolean('consent_training').notNull().default(false),
  /** Community-vote validation state (ADR 0048/0040). */
  status: text('status', { enum: ['pending', 'verified', 'rejected'] })
    .notNull()
    .default('pending'),
  /** Deletion tombstone (ADR 0010/0048): set on erasure. The row is retained
   * but excluded from future dataset builds; shipped versions stay non-recallable. */
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One community vote per learner per recording (ADR 0048); mirrors review_votes. */
export const recordingVotes = pgTable(
  'recording_votes',
  {
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    voterId: text('voter_id').notNull(),
    up: boolean('up').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.recordingId, table.voterId] })],
);

/**
 * The casual-tier premium-time ledger (ADR 0048): one row per contributor,
 * accruing community-validated seconds into granted premium days. The grant
 * rule (seconds per grant, days per grant) lives in credit-policy.ts.
 */
export const audioCredits = pgTable('audio_credits', {
  userId: text('user_id').primaryKey(),
  secondsValidated: integer('seconds_validated').notNull().default(0),
  premiumDaysGranted: integer('premium_days_granted').notNull().default(0),
  grantedAt: timestamp('granted_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A dataset build's frozen membership (ADR 0048): the recording ids a version
 * shipped with. Snapshotting proves the tombstone contract — a withdrawn
 * recording drops from future builds, but the version it already shipped in
 * stays non-recallable.
 */
export const datasetManifests = pgTable('dataset_manifests', {
  version: text('version').primaryKey(),
  recordingIds: jsonb('recording_ids').$type<string[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Per-SKU lifetime unlocks (ADR 0047/0050). One row per user per SKU — a
 * lifetime unlock never expires, so there is no validity window to store.
 * Grants come only from the admin/founder path today; no payment rails yet.
 */
export const entitlements = pgTable(
  'entitlements',
  {
    userId: text('user_id').notNull(),
    sku: text('sku').notNull(),
    source: text('source', {
      enum: ['purchase', 'founder', 'contribution'],
    }).notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.sku] })],
);
