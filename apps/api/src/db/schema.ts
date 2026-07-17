import {
  boolean,
  customType,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  CurriculumArtifact,
  Item,
  OriginalityAudit,
  Provenance,
} from '@govori/content';

/** The content atom (ADR 0002/0003); text is canonical etymological Latin. */
export const items = pgTable('items', {
  id: uuid('id').primaryKey(),
  kind: text('kind', { enum: ['word', 'phrase', 'sentence'] }).notNull(),
  text: text('text').notNull(),
  provenance: jsonb('provenance').$type<Provenance>().notNull(),
  audit: jsonb('audit').$type<OriginalityAudit>(),
  frequency: real('frequency'),
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

export const translations = pgTable(
  'translations',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    lang: text('lang').notNull(),
    text: text('text').notNull(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.lang, table.text] })],
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

/** Auth tables owned by better-auth (ADR 0021); shapes follow its core schema. */
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  role: text('role', { enum: ['learner', 'admin'] })
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

/** Runtime feature-flag states; the dependency graph lives in code (ADR 0025). */
export const flagStates = pgTable('flag_states', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull(),
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
  changedBy: text('changed_by').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
});

/** Community recordings: many per item, published unreviewed (ADR 0004/0008). */
export const recordings = pgTable('recordings', {
  id: uuid('id').primaryKey(),
  itemId: uuid('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  contributorId: text('contributor_id').notNull(),
  mime: text('mime').notNull(),
  bytes: bytea('bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
