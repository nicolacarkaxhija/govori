import { asc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { itemForms } from '../db/schema.js';
import type {
  MorphologyEntry,
  MorphologyQueries,
  MorphologyRepository,
  WordForm,
} from './ports.js';

/** Postgres adapter for the morphology ports (ADR 0020). */
export class DrizzleMorphologyRepository
  implements MorphologyRepository, MorphologyQueries
{
  constructor(private readonly db: Db) {}

  async replaceForItems(entries: readonly MorphologyEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    // Delete-then-insert per item id in one transaction: reimports replace
    // paradigms wholesale, so stale forms can never linger. Chunked bulk
    // statements keep a 175k-form artifact well under the parameter limit.
    const CHUNK = 200;
    await this.db.transaction(async (tx) => {
      for (let start = 0; start < entries.length; start += CHUNK) {
        const chunk = entries.slice(start, start + CHUNK);
        await tx.delete(itemForms).where(
          inArray(
            itemForms.itemId,
            chunk.map((entry) => entry.itemId),
          ),
        );
        // Duplicate {tag, text} pairs inside one paradigm collapse into
        // the primary key rather than failing the whole import.
        await tx
          .insert(itemForms)
          .values(
            chunk.flatMap((entry) =>
              entry.forms.map((form) => ({
                itemId: entry.itemId,
                tag: form.tag,
                text: form.text,
              })),
            ),
          )
          .onConflictDoNothing();
      }
    });
  }

  async formsFor(itemId: string): Promise<WordForm[]> {
    const rows = await this.db
      .select()
      .from(itemForms)
      .where(eq(itemForms.itemId, itemId))
      .orderBy(asc(itemForms.tag), asc(itemForms.text));
    return rows.map(({ tag, text }) => ({ tag, text }));
  }
}
