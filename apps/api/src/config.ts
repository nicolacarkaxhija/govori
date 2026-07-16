import { z } from 'zod';
import { buildConfig, envSource } from '@govori/config';

/** Deployment configuration schema for the API (ADR 0024). */
const configSchema = z.object({
  server: z.object({
    port: z.coerce.number().int().min(1).max(65535),
    host: z.string().min(1),
    baseUrl: z.url(),
  }),
  brand: z.object({
    shortName: z.string().min(1),
    fullName: z.string().min(1),
  }),
  db: z.object({
    url: z.string().min(1),
  }),
  auth: z.object({
    secret: z.string().min(32),
  }),
});

export type ApiConfig = ReturnType<typeof loadConfig>;

const defaults = {
  server: {
    port: 3000,
    host: '0.0.0.0',
    baseUrl: 'http://localhost:3000',
  },
  brand: {
    shortName: 'Govori',
    fullName: 'Govori — Interslavic Learning App',
  },
  db: {
    url: 'postgres://govori:govori@localhost:5432/govori',
  },
  auth: {
    // Development-only fallback; production deploys override via env.
    secret: 'govori-dev-secret-never-use-in-production!',
  },
};

/**
 * Composition-root helper: defaults overridden by `GOVORI_`-prefixed
 * environment variables. Fails fast on anything invalid.
 */
export function loadConfig(env: Readonly<Record<string, string | undefined>>) {
  return buildConfig(configSchema, [defaults, envSource(env, 'GOVORI_')]);
}
