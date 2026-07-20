import { and, asc, count, eq, inArray, or, sql } from 'drizzle-orm';
import type { Item } from '@glotty/content';
import type { Db } from '../db/client.js';
import { contrastiveNotes, items, translations } from '../db/schema.js';
import type { DirectedItem, ItemQueries, ItemRepository } from './ports.js';

type ItemRow = typeof items.$inferSelect;

/** Postgres adapter for the item ports (ADR 0020). Every read scopes by
 * direction (ADR 0046); a NULL direction is invalid after the boot
 * backfill, so such rows are treated as absent. */
export class DrizzleItemRepository implements ItemRepository, ItemQueries {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<DirectedItem | undefined> {
    const [row] = await this.db.select().from(items).where(eq(items.id, id));
    if (row === undefined) {
      return undefined;
    }
    const { direction } = row;
    if (direction === null) {
      return undefined;
    }
    const [assembled] = await this.assemble([row]);
    return assembled === undefined ? undefined : { item: assembled, direction };
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

  async list(
    direction: string,
    limit: number,
    offset: number,
  ): Promise<Item[]> {
    const rows = await this.db
      .select()
      .from(items)
      .where(eq(items.direction, direction))
      .orderBy(sql`${items.frequency} DESC NULLS LAST`, asc(items.id))
      .limit(limit)
      .offset(offset);
    return this.assemble(rows);
  }

  async findSentencesContaining(
    direction: string,
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
      .where(
        and(
          eq(items.direction, direction),
          eq(items.kind, 'sentence'),
          or(...matches),
        ),
      )
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
      ...(row.pos === null ? {} : { pos: row.pos }),
      ...(row.posDetail === null ? {} : { posDetail: row.posDetail }),
      ...(row.attestation === null ? {} : { attestation: row.attestation }),
      ...(row.difficulty === null ? {} : { difficulty: row.difficulty }),
      translations: allTranslations
        .filter((translation) => translation.itemId === row.id)
        .map(({ lang, text, senseGroup }) => ({
          lang,
          text,
          ...(senseGroup === null ? {} : { senseGroup }),
        })),
      notes: allNotes
        .filter((note) => note.itemId === row.id)
        .map(({ sourceLang, text }) => ({ sourceLang, text })),
      ...(row.audit === null ? {} : { audit: row.audit }),
    }));
  }

  async upsertMany(
    toUpsert: readonly Item[],
    direction: string,
  ): Promise<void> {
    // Chunked bulk statements: a 19k-item artifact imports in seconds
    // instead of minutes. The chunk size keeps each statement well under
    // Postgres's parameter limit even with 26 translations per item.
    const CHUNK = 200;
    await this.db.transaction(async (tx) => {
      for (let start = 0; start < toUpsert.length; start += CHUNK) {
        const chunk = toUpsert.slice(start, start + CHUNK);
        const ids = chunk.map((item) => item.id);
        await tx
          .insert(items)
          .values(
            chunk.map((item) => ({
              id: item.id,
              direction,
              kind: item.kind,
              text: item.text,
              provenance: item.provenance,
              audit: item.audit ?? null,
              frequency: item.frequency ?? null,
              pos: item.pos ?? null,
              posDetail: item.posDetail ?? null,
              attestation: item.attestation ?? null,
              difficulty: item.difficulty ?? null,
            })),
          )
          .onConflictDoUpdate({
            target: items.id,
            set: {
              direction: sql`excluded."direction"`,
              kind: sql`excluded."kind"`,
              text: sql`excluded."text"`,
              provenance: sql`excluded."provenance"`,
              audit: sql`excluded."audit"`,
              frequency: sql`excluded."frequency"`,
              pos: sql`excluded."pos"`,
              posDetail: sql`excluded."pos_detail"`,
              attestation: sql`excluded."attestation"`,
              difficulty: sql`excluded."difficulty"`,
              updatedAt: new Date(),
            },
          });
        await tx.delete(translations).where(inArray(translations.itemId, ids));
        await tx.insert(translations).values(
          chunk.flatMap((item) =>
            item.translations.map((translation) => ({
              itemId: item.id,
              lang: translation.lang,
              text: translation.text,
              senseGroup: translation.senseGroup ?? null,
            })),
          ),
        );
        await tx
          .delete(contrastiveNotes)
          .where(inArray(contrastiveNotes.itemId, ids));
        const notes = chunk.flatMap((item) =>
          item.notes.map((note) => ({
            itemId: item.id,
            sourceLang: note.sourceLang,
            text: note.text,
          })),
        );
        if (notes.length > 0) {
          await tx.insert(contrastiveNotes).values(notes);
        }
      }
    });
  }

  async count(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(items);
    return row?.value ?? 0;
  }
}
