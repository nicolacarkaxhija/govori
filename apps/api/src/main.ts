import { buildApp } from './app.js';
import { loadConfig } from './config.js';

// Composition root: the only place that touches process state (ADR 0024).
const config = loadConfig(process.env);
const app = buildApp({ config });

try {
  await app.listen({ port: config.server.port, host: config.server.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
