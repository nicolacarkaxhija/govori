import { readFile } from 'node:fs/promises';
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { DrizzleItemRepository } from './content/drizzle-item-repository.js';
import { importArtifact } from './content/import-artifact.js';

// Composition-root script: `pnpm --filter @govori/api import <artifact.json>`
// re-validates the artifact against the shared schemas and imports it
// idempotently (ADR 0037).
const path = process.argv[2];
if (path === undefined) {
  console.error('usage: import <artifact.json>');
  process.exit(1);
}

const config = loadConfig(process.env);
const db = createDb(config.db.url);
await runMigrations(db);

const raw: unknown = JSON.parse(await readFile(path, 'utf-8'));
const result = await importArtifact(raw, new DrizzleItemRepository(db));
console.log(
  `imported ${String(result.imported)} items from ${result.producer}`,
);
process.exit(0);
