import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { DrizzleItemRepository } from './content/drizzle-item-repository.js';
import { DrizzleFlagStore } from './flags/drizzle-flag-store.js';
import { createAuth } from './auth/auth.js';

// Composition root: the only place that touches process state (ADR 0024).
const config = loadConfig(process.env);
const db = createDb(config.db.url);
await runMigrations(db);
const app = buildApp({
  config,
  items: new DrizzleItemRepository(db),
  flagStates: new DrizzleFlagStore(db),
  auth: createAuth(db, {
    secret: config.auth.secret,
    baseUrl: config.server.baseUrl,
  }),
});

try {
  await app.listen({ port: config.server.port, host: config.server.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
