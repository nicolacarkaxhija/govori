import {
  boolean,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { OriginalityAudit, Provenance } from '@govori/content';

/** The content atom (ADR 0002/0003); text is canonical etymological Latin. */
export const items = pgTable('items', {
  id: uuid('id').primaryKey(),
  kind: text('kind', { enum: ['word', 'phrase', 'sentence'] }).notNull(),
  text: text('text').notNull(),
  provenance: jsonb('provenance').$type<Provenance>().notNull(),
  audit: jsonb('audit').$type<OriginalityAudit>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
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
