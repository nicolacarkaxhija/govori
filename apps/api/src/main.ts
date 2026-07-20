import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { resolveApiInstance } from './instances.js';
import { createDb } from './db/client.js';
import { backfillDirections, runMigrations } from './db/migrate.js';
import { DrizzleItemRepository } from './content/drizzle-item-repository.js';
import { DrizzleFlagStore } from './flags/drizzle-flag-store.js';
import { createAuth } from './auth/auth.js';
import { DrizzleUserRoles } from './auth/drizzle-user-roles.js';
import { DrizzleReviewStore } from './reviews/drizzle-review-store.js';
import { DrizzleStats } from './stats/drizzle-stats.js';
import { DrizzleCourse } from './course/drizzle-course.js';
import { DrizzleAccount } from './account/drizzle-account.js';
import { DrizzleReviewQueue } from './review/drizzle-review-queue.js';
import { DrizzleVoteStore } from './review/drizzle-vote-store.js';
import { DrizzleRecordingStore } from './audio/drizzle-recording-store.js';
import { DrizzleMorphologyRepository } from './morphology/drizzle-morphology-repository.js';
import { DrizzleExport } from './export/drizzle-export.js';
import { DrizzleEntitlements } from './entitlements/drizzle-entitlements.js';
import { DrizzleReportStore } from './quality/drizzle-report-store.js';
import { DrizzleQualityQueries } from './quality/drizzle-quality-queries.js';
import { DrizzleGoldenSet } from './golden/drizzle-golden.js';

// Composition root: the only place that touches process state (ADR 0024).
// The instance is a required input — there is no default product (ADR 0029).
const { instance, directions } = resolveApiInstance(
  process.env.GLOTTY_INSTANCE,
);
const config = loadConfig(process.env, instance.brand);
const db = createDb(config.db.url);
await runMigrations(db);
// Pre-direction rows can only belong to the instance's first direction
// (ADR 0046); the migration itself is static SQL and cannot know it.
const [firstDirection] = directions;
if (firstDirection === undefined) {
  throw new Error(`instance '${instance.id}' declares no directions`);
}
await backfillDirections(db, firstDirection.direction.id);
const itemRepository = new DrizzleItemRepository(db);
const app = buildApp({
  config,
  instance,
  directions,
  items: itemRepository,
  flagStates: new DrizzleFlagStore(db),
  auth: createAuth(db, {
    secret: config.auth.secret,
    baseUrl: config.server.baseUrl,
  }),
  userRoles: new DrizzleUserRoles(db),
  userDirectory: new DrizzleUserRoles(db),
  reviews: new DrizzleReviewStore(db),
  stats: new DrizzleStats(db),
  course: new DrizzleCourse(db, itemRepository),
  account: new DrizzleAccount(db),
  reviewQueue: new DrizzleReviewQueue(db),
  votes: new DrizzleVoteStore(db),
  itemWriter: itemRepository,
  recordings: new DrizzleRecordingStore(db),
  morphology: new DrizzleMorphologyRepository(db),
  openData: new DrizzleExport(db),
  entitlements: new DrizzleEntitlements(db),
  reports: new DrizzleReportStore(db),
  quality: new DrizzleQualityQueries(db, itemRepository),
  golden: new DrizzleGoldenSet(db),
});

try {
  await app.listen({ port: config.server.port, host: config.server.host });
} catch (error) {
  console.error(error);
  process.exit(1);
}
