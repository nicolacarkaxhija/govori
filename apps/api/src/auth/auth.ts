import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Db } from '../db/client.js';
import { account, session, user, verification } from '../db/schema.js';

export interface AuthConfig {
  secret: string;
  baseUrl: string;
}

/** Self-hosted auth (ADR 0021): email+password, httpOnly session cookies. */
export function createAuth(db: Db, config: AuthConfig) {
  return betterAuth({
    secret: config.secret,
    baseURL: config.baseUrl,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
