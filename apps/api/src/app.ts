import Fastify, { type FastifyInstance } from 'fastify';
import type { ApiConfig } from './config.js';

export interface AppDependencies {
  config: ApiConfig;
}

/**
 * Builds the HTTP adapter over injected dependencies. Pure of process state:
 * no environment access, no listening — the composition root (main.ts) does
 * that (ADR 0018).
 */
export function buildApp({ config }: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/health', () => ({ status: 'ok' }));

  app.get('/meta', () => ({
    brand: {
      shortName: config.brand.shortName,
      fullName: config.brand.fullName,
    },
  }));

  return app;
}
