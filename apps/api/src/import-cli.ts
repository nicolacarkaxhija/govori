import { readFile } from 'node:fs/promises';
import { makeContentSchemas } from '@glotty/content';
import { resolveDirection } from '@glotty/language';
import { loadConfig } from './config.js';
import { resolveApiInstance } from './instances.js';
import { createDb } from './db/client.js';
import { backfillDirections, runMigrations } from './db/migrate.js';
import { DrizzleItemRepository } from './content/drizzle-item-repository.js';
import { DrizzleCourse } from './course/drizzle-course.js';
import { DrizzleReviewQueue } from './review/drizzle-review-queue.js';
import { importArtifact } from './content/import-artifact.js';
import { DrizzleMorphologyRepository } from './morphology/drizzle-morphology-repository.js';
import { importMorphologyArtifact } from './morphology/import-morphology.js';

// Composition-root script (ADR 0037):
//   import [--direction <id>] <artifact.json>                  items
//   import [--direction <id>] --curriculum <curriculum.json>   course structure
//   import [--direction <id>] --drafts <drafts.json>           review queue
//   import [--direction <id>] --morphology <morphology.json>   inflected forms
//
// --direction picks the pool an artifact lands in (ADR 0046). A
// single-direction instance may omit it: resolution is then the total
// function of its config — with two or more directions the flag is
// required and never inferred.
const argv = process.argv.slice(2);
const directionFlagAt = argv.indexOf('--direction');
const directionId =
  directionFlagAt === -1 ? undefined : argv[directionFlagAt + 1];
const rest =
  directionFlagAt === -1
    ? argv
    : [...argv.slice(0, directionFlagAt), ...argv.slice(directionFlagAt + 2)];
const mode =
  rest[0] === '--curriculum' ||
  rest[0] === '--drafts' ||
  rest[0] === '--morphology'
    ? rest[0]
    : 'items';
const path = mode === 'items' ? rest[0] : rest[1];
if (
  path === undefined ||
  (directionFlagAt !== -1 && directionId === undefined)
) {
  console.error(
    'usage: import [--direction <id>] [--curriculum|--drafts|--morphology] <artifact.json>',
  );
  process.exit(1);
}

const resolved = resolveApiInstance(process.env.GLOTTY_INSTANCE);
const { instance } = resolved;
const { direction, pack } = resolveDirection(resolved, directionId);
const config = loadConfig(process.env, instance.brand);
const db = createDb(config.db.url);
await runMigrations(db);
// Pre-direction rows can only belong to the instance's first direction
// (ADR 0046); the migration itself is static SQL and cannot know it.
const [firstDirection] = resolved.directions;
if (firstDirection === undefined) {
  throw new Error(`instance '${instance.id}' declares no directions`);
}
await backfillDirections(db, firstDirection.direction.id);

// Artifact schemas bound to the direction's language pack (ADR 0029/0046).
const {
  parseContentArtifact,
  parseCurriculumArtifact,
  parseMorphologyArtifact,
} = makeContentSchemas((text) => pack.validateCanonical(text));

const raw: unknown = JSON.parse(await readFile(path, 'utf-8'));
const itemRepository = new DrizzleItemRepository(db);
if (mode === '--drafts') {
  const artifact = parseContentArtifact(raw);
  const queued = await new DrizzleReviewQueue(db).addPending(
    artifact.items,
    direction.id,
  );
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
  await new DrizzleCourse(db, itemRepository).replaceCurriculum(
    curriculum,
    direction.id,
  );
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
    direction.id,
  );
  console.log(
    `imported ${String(result.imported)} items from ${result.producer} into direction '${direction.id}'`,
  );
}
process.exit(0);
