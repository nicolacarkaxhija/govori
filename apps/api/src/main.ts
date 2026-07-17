import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { DrizzleItemRepository } from './content/drizzle-item-repository.js';
import { DrizzleFlagStore } from './flags/drizzle-flag-store.js';
import { createAuth } from './auth/auth.js';
import { DrizzleUserRoles } from './auth/drizzle-user-roles.js';
import { DrizzleReviewStore } from './reviews/drizzle-review-store.js';
import { DrizzleStats } from './stats/drizzle-stats.js';
import { DrizzleCourse } from './course/drizzle-course.js';
import { DrizzleAccount } from './account/drizzle-account.js';
import { DrizzleReviewQueue } from './review/drizzle-review-queue.js';

// Composition root: the only place that touches process state (ADR 0024).
const config = loadConfig(process.env);
const db = createDb(config.db.url);
await runMigrations(db);
const itemRepository = new DrizzleItemRepository(db);
const app = buildApp({
  config,
  items: itemRepository,
  flagStates: new DrizzleFlagStore(db),
  auth: createAuth(db, {
    secret: config.auth.secret,
    baseUrl: config.server.baseUrl,
  }),
  userRoles: new DrizzleUserRoles(db),
  reviews: new DrizzleReviewStore(db),
  stats: new DrizzleStats(db),
  course: new DrizzleCourse(db, itemRepository),
  account: new DrizzleAccount(db),
  reviewQueue: new DrizzleReviewQueue(db),
  itemWriter: itemRepository,
});

try {
  await app.listen({ port: config.server.port, host: config.server.host });
} catch (error) {
  console.error(error);
  process.exit(1);
}
