import { and, asc, count, eq, inArray, or, sql } from 'drizzle-orm';
import type { Item } from '@govori/content';
import type { Db } from '../db/client.js';
import { contrastiveNotes, items, translations } from '../db/schema.js';
import type { ItemQueries, ItemRepository } from './ports.js';

type ItemRow = typeof items.$inferSelect;

/** Postgres adapter for the item ports (ADR 0020). */
export class DrizzleItemRepository implements ItemRepository, ItemQueries {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Item | undefined> {
    const [row] = await this.db.select().from(items).where(eq(items.id, id));
    if (row === undefined) {
      return undefined;
    }
    const [assembled] = await this.assemble([row]);
    return assembled;
  }

  async findByIds(ids: readonly string[]): Promise<Item[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(items)
      .where(inArray(items.id, [...ids]));
    const assembled = await this.assemble(rows);
    const byId = new Map(assembled.map((item) => [item.id, item]));
    return ids.flatMap((id) => {
      const item = byId.get(id);
      return item === undefined ? [] : [item];
    });
  }

  async list(limit: number, offset: number): Promise<Item[]> {
    const rows = await this.db
      .select()
      .from(items)
      .orderBy(sql`${items.frequency} DESC NULLS LAST`, asc(items.id))
      .limit(limit)
      .offset(offset);
    return this.assemble(rows);
  }

  async findSentencesContaining(
    words: readonly string[],
    limit: number,
  ): Promise<Item[]> {
    if (words.length === 0) {
      return [];
    }
    // Whole-word, case-insensitive match; regex metacharacters in the
    // word are neutralized so dictionary entries cannot break the query.
    const matches = words.map((word) => {
      const pattern = `\\m${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\M`;
      return sql`${items.text} ~* ${pattern}`;
    });
    const rows = await this.db
      .select()
      .from(items)
      .where(and(eq(items.kind, 'sentence'), or(...matches)))
      .orderBy(asc(items.id))
      .limit(limit);
    return this.assemble(rows);
  }

  private async assemble(rows: readonly ItemRow[]): Promise<Item[]> {
    if (rows.length === 0) {
      return [];
    }
    const ids = rows.map((row) => row.id);
    const allTranslations = await this.db
      .select()
      .from(translations)
      .where(inArray(translations.itemId, ids));
    const allNotes = await this.db
      .select()
      .from(contrastiveNotes)
      .where(inArray(contrastiveNotes.itemId, ids));
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      text: row.text,
      provenance: row.provenance,
      ...(row.frequency === null ? {} : { frequency: row.frequency }),
      translations: allTranslations
        .filter((translation) => translation.itemId === row.id)
        .map(({ lang, text }) => ({ lang, text })),
      notes: allNotes
        .filter((note) => note.itemId === row.id)
        .map(({ sourceLang, text }) => ({ sourceLang, text })),
      ...(row.audit === null ? {} : { audit: row.audit }),
    }));
  }

  async upsertMany(toUpsert: readonly Item[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const item of toUpsert) {
        await tx
          .insert(items)
          .values({
            id: item.id,
            kind: item.kind,
            text: item.text,
            provenance: item.provenance,
            audit: item.audit ?? null,
            frequency: item.frequency ?? null,
          })
          .onConflictDoUpdate({
            target: items.id,
            set: {
              kind: item.kind,
              text: item.text,
              provenance: item.provenance,
              audit: item.audit ?? null,
              frequency: item.frequency ?? null,
              updatedAt: new Date(),
            },
          });
        await tx.delete(translations).where(eq(translations.itemId, item.id));
        await tx.insert(translations).values(
          item.translations.map((translation) => ({
            itemId: item.id,
            lang: translation.lang,
            text: translation.text,
          })),
        );
        await tx
          .delete(contrastiveNotes)
          .where(eq(contrastiveNotes.itemId, item.id));
        if (item.notes.length > 0) {
          await tx.insert(contrastiveNotes).values(
            item.notes.map((note) => ({
              itemId: item.id,
              sourceLang: note.sourceLang,
              text: note.text,
            })),
          );
        }
      }
    });
  }

  async count(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(items);
    return row?.value ?? 0;
  }
}
