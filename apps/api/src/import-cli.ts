import { readFile } from 'node:fs/promises';
import { parseCurriculumArtifact } from '@govori/content';
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { DrizzleItemRepository } from './content/drizzle-item-repository.js';
import { DrizzleCourse } from './course/drizzle-course.js';
import { importArtifact } from './content/import-artifact.js';

// Composition-root script (ADR 0037):
//   import <artifact.json>                 items
//   import --curriculum <curriculum.json>  course structure
const isCurriculum = process.argv[2] === '--curriculum';
const path = isCurriculum ? process.argv[3] : process.argv[2];
if (path === undefined) {
  console.error('usage: import [--curriculum] <artifact.json>');
  process.exit(1);
}

const config = loadConfig(process.env);
const db = createDb(config.db.url);
await runMigrations(db);

const raw: unknown = JSON.parse(await readFile(path, 'utf-8'));
const itemRepository = new DrizzleItemRepository(db);
if (isCurriculum) {
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
  const result = await importArtifact(raw, itemRepository);
  console.log(
    `imported ${String(result.imported)} items from ${result.producer}`,
  );
}
process.exit(0);
