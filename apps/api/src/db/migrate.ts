import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isNull } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type { Db } from './client.js';
import { items, reviewQueue, units } from './schema.js';

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'drizzle',
);

/** Applies pending SQL migrations; used by deploys and integration tests. */
export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder });
}

/**
 * Stamps direction-less content rows with a direction id (ADR 0046).
 * Migrations are static SQL and cannot know a deployment's directions,
 * so each composition root runs this right after migrating, passing its
 * instance's first direction — the only direction any pre-direction row
 * can belong to. Idempotent: rows already stamped are never touched,
 * and adapters treat a NULL direction as invalid from here on.
 */
export async function backfillDirections(
  db: Db,
  directionId: string,
): Promise<void> {
  await db
    .update(items)
    .set({ direction: directionId })
    .where(isNull(items.direction));
  await db
    .update(units)
    .set({ direction: directionId })
    .where(isNull(units.direction));
  await db
    .update(reviewQueue)
    .set({ direction: directionId })
    .where(isNull(reviewQueue.direction));
}
