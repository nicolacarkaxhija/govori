import { count, eq } from 'drizzle-orm';
import type { Item } from '@govori/content';
import type { Db } from '../db/client.js';
import { contrastiveNotes, items, translations } from '../db/schema.js';
import type { ItemRepository } from './ports.js';

/** Postgres adapter for the item port (ADR 0020). */
export class DrizzleItemRepository implements ItemRepository {
  constructor(private readonly db: Db) {}

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
          })
          .onConflictDoUpdate({
            target: items.id,
            set: {
              kind: item.kind,
              text: item.text,
              provenance: item.provenance,
              audit: item.audit ?? null,
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
