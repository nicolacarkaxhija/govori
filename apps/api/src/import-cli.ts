import { readFile } from 'node:fs/promises';
import { makeContentSchemas } from '@glotty/content';
import { loadConfig } from './config.js';
import { resolveApiInstance } from './instances.js';
import { createDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { DrizzleItemRepository } from './content/drizzle-item-repository.js';
import { DrizzleCourse } from './course/drizzle-course.js';
import { DrizzleReviewQueue } from './review/drizzle-review-queue.js';
import { importArtifact } from './content/import-artifact.js';
import { DrizzleMorphologyRepository } from './morphology/drizzle-morphology-repository.js';
import { importMorphologyArtifact } from './morphology/import-morphology.js';

// Composition-root script (ADR 0037):
//   import <artifact.json>                  items
//   import --curriculum <curriculum.json>   course structure
//   import --drafts <drafts.json>           review queue (ADR 0038)
//   import --morphology <morphology.json>   inflected forms
const mode =
  process.argv[2] === '--curriculum' ||
  process.argv[2] === '--drafts' ||
  process.argv[2] === '--morphology'
    ? process.argv[2]
    : 'items';
const path = mode === 'items' ? process.argv[2] : process.argv[3];
if (path === undefined) {
  console.error(
    'usage: import [--curriculum|--drafts|--morphology] <artifact.json>',
  );
  process.exit(1);
}

const { instance, pack } = resolveApiInstance(process.env.GLOTTY_INSTANCE);
const config = loadConfig(process.env, instance.brand);
const db = createDb(config.db.url);
await runMigrations(db);

// Artifact schemas bound to the instance's language pack (ADR 0029).
const {
  parseContentArtifact,
  parseCurriculumArtifact,
  parseMorphologyArtifact,
} = makeContentSchemas((text) => pack.validateCanonical(text));

const raw: unknown = JSON.parse(await readFile(path, 'utf-8'));
const itemRepository = new DrizzleItemRepository(db);
if (mode === '--drafts') {
  const artifact = parseContentArtifact(raw);
  const queued = await new DrizzleReviewQueue(db).addPending(artifact.items);
  console.log(
    `queued ${String(queued)} of ${String(artifact.items.length)} drafts for review`,
  );
} else if (mode === '--morphology') {
  const result = await importMorphologyArtifact(
    raw,
    new DrizzleMorphologyRepository(db),
    parseMorphologyArtifact,
  );
  console.log(
    `morphology: ${String(result.entries)} paradigms, ${String(result.forms)} forms from ${result.producer}`,
  );
} else if (mode === '--curriculum') {
  const curriculum = parseCurriculumArtifact(raw);
  await new DrizzleCourse(db, itemRepository).replaceCurriculum(curriculum);
  const lessons = curriculum.units.reduce(
    (total, unit) => total + unit.lessons.length,
    0,
  );
  console.log(
    `curriculum: ${String(curriculum.units.length)} units, ${String(lessons)} lessons`,
  );
} else {
  const result = await importArtifact(
    raw,
    itemRepository,
    parseContentArtifact,
  );
  console.log(
    `imported ${String(result.imported)} items from ${result.producer}`,
  );
}
process.exit(0);
