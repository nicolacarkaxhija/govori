import { asc, eq, sql } from 'drizzle-orm';
import type { Item, PartOfSpeech } from '@glotty/content';
import type { Db } from '../db/client.js';
import {
  contrastiveNotes,
  itemForms,
  items,
  lessonItems,
  lessons,
  translations,
  units,
} from '../db/schema.js';
import type { MorphologyEntry, WordForm } from '../morphology/ports.js';
import type { ExportQueries, ExportUnit } from './ports.js';

/**
 * Postgres adapter for the open-data export (ADR 0007/0010). The pool is
 * ~20k items with ~250k translations, so every method reads whole tables
 * in a handful of bulk queries and groups in memory — no per-item chatter.
 */
export class DrizzleExport implements ExportQueries {
  constructor(private readonly db: Db) {}

  async allItems(direction: string): Promise<Item[]> {
    const [itemRows, translationRows, noteRows] = await Promise.all([
      this.db
        .select()
        .from(items)
        .where(eq(items.direction, direction))
        .orderBy(sql`${items.frequency} DESC NULLS LAST`, asc(items.id)),
      this.db.select().from(translations),
      this.db.select().from(contrastiveNotes),
    ]);
    const translationsByItem = new Map<
      string,
      { lang: string; text: string }[]
    >();
    for (const row of translationRows) {
      const bucket = translationsByItem.get(row.itemId);
      const translation = { lang: row.lang, text: row.text };
      if (bucket === undefined) {
        translationsByItem.set(row.itemId, [translation]);
      } else {
        bucket.push(translation);
      }
    }
    const notesByItem = new Map<
      string,
      { sourceLang: string; text: string }[]
    >();
    for (const row of noteRows) {
      const bucket = notesByItem.get(row.itemId);
      const note = { sourceLang: row.sourceLang, text: row.text };
      if (bucket === undefined) {
        notesByItem.set(row.itemId, [note]);
      } else {
        bucket.push(note);
      }
    }
    return itemRows.map((row) => ({
      id: row.id,
      kind: row.kind,
      text: row.text,
      provenance: row.provenance,
      ...(row.frequency === null ? {} : { frequency: row.frequency }),
      ...(row.pos === null ? {} : { pos: row.pos }),
      ...(row.posDetail === null ? {} : { posDetail: row.posDetail }),
      translations: translationsByItem.get(row.id) ?? [],
      notes: notesByItem.get(row.id) ?? [],
      ...(row.audit === null ? {} : { audit: row.audit }),
    }));
  }

  async curriculumUnits(direction: string): Promise<ExportUnit[]> {
    const [unitRows, lessonRows, linkRows] = await Promise.all([
      this.db
        .select()
        .from(units)
        .where(eq(units.direction, direction))
        .orderBy(asc(units.position)),
      this.db.select().from(lessons).orderBy(asc(lessons.position)),
      this.db.select().from(lessonItems).orderBy(asc(lessonItems.position)),
    ]);
    const itemIdsByLesson = new Map<string, string[]>();
    for (const link of linkRows) {
      const bucket = itemIdsByLesson.get(link.lessonId);
      if (bucket === undefined) {
        itemIdsByLesson.set(link.lessonId, [link.itemId]);
      } else {
        bucket.push(link.itemId);
      }
    }
    return unitRows.map((unit) => ({
      title: unit.title,
      lessons: lessonRows
        .filter((lesson) => lesson.unitId === unit.id)
        .map((lesson) => ({
          title: lesson.title,
          itemIds: itemIdsByLesson.get(lesson.id) ?? [],
          ...(lesson.dialogue === null ? {} : { dialogue: lesson.dialogue }),
        })),
    }));
  }

  async morphologyEntries(direction: string): Promise<MorphologyEntry[]> {
    const rows = await this.db
      .select({
        itemId: itemForms.itemId,
        tag: itemForms.tag,
        text: itemForms.text,
        pos: items.pos,
      })
      .from(itemForms)
      .innerJoin(items, eq(itemForms.itemId, items.id))
      .where(eq(items.direction, direction))
      .orderBy(asc(itemForms.itemId), asc(itemForms.tag), asc(itemForms.text));
    const grouped = new Map<
      string,
      { pos: PartOfSpeech | null; forms: WordForm[] }
    >();
    for (const row of rows) {
      const form = { tag: row.tag, text: row.text };
      const bucket = grouped.get(row.itemId);
      if (bucket === undefined) {
        grouped.set(row.itemId, { pos: row.pos, forms: [form] });
      } else {
        bucket.forms.push(form);
      }
    }
    const entries: MorphologyEntry[] = [];
    for (const [itemId, { pos, forms }] of grouped) {
      // The artifact schema requires a pos and a two-form floor; anything
      // thinner cannot ride a valid export and is silently skipped.
      if (pos === null || forms.length < 2) {
        continue;
      }
      entries.push({ itemId, pos, forms });
    }
    return entries;
  }
}
