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
