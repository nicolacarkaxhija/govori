import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ItemSchema } from '@govori/content';
import { transliterate } from '@govori/transliteration';
import { resolveFlags } from '@govori/config';
import type { Auth } from './auth/auth.js';
import type { ApiConfig } from './config.js';
import type { ItemQueries } from './content/ports.js';
import { flagDefinitions } from './flags/definitions.js';
import type { FlagStore } from './flags/ports.js';
import type { UserRoles } from './auth/ports.js';
import type { ReviewEventStore } from './reviews/ports.js';
import type { StatsQueries } from './stats/ports.js';
import type { CourseQueries } from './course/ports.js';
import type { AccountRights } from './account/ports.js';

export interface AppDependencies {
  config: ApiConfig;
  items: ItemQueries;
  flagStates: FlagStore;
  auth: Auth;
  userRoles: UserRoles;
  reviews: ReviewEventStore;
  stats: StatsQueries;
  course: CourseQueries;
  account: AccountRights;
}

/** Bridges Fastify's raw request to the Web Request better-auth consumes. */
export function toWebRequest(
  config: ApiConfig,
  raw: {
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
    body?: unknown;
  },
): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(raw.headers)) {
    if (typeof value === 'string') {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(key, entry);
      }
    }
  }
  return new Request(new URL(raw.url, config.server.baseUrl), {
    method: raw.method,
    headers,
    ...(raw.body === undefined || raw.method === 'GET'
      ? {}
      : { body: JSON.stringify(raw.body) }),
  });
}

const RenderedItemSchema = z.object({
  item: ItemSchema,
  /** Scripts derived from canonical text at the edge (ADR 0003). */
  renderings: z.object({
    latin: z.string(),
    cyrillic: z.string(),
  }),
});

const NotFoundSchema = z.object({ message: z.string() });

const ReviewEventSchema = z.object({
  id: z.uuid(),
  itemId: z.uuid(),
  reviewedAt: z.iso.datetime(),
  grade: z.enum(['again', 'hard', 'good', 'easy']),
});

/**
 * Builds the HTTP adapter over injected dependencies. Pure of process state:
 * no environment access, no listening — the composition root (main.ts) does
 * that (ADR 0018). Request/response schemas are Zod; the OpenAPI document
 * is generated from them (ADR 0019).
 */
export function buildApp({
  config,
  items,
  flagStates,
  auth,
  userRoles,
  reviews,
  stats,
  course,
  account,
}: AppDependencies) {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  void app.register(cors, {
    origin: config.server.corsOrigins,
    credentials: true,
  });

  void app.register(swagger, {
    openapi: {
      info: {
        title: `${config.brand.shortName} API`,
        version: '0.0.0',
      },
    },
    transform: jsonSchemaTransform,
  });

  async function effectiveFlags(): Promise<Record<string, boolean>> {
    const resolved = resolveFlags(
      flagDefinitions,
      await flagStates.getStates(),
    );
    return Object.fromEntries(
      Object.entries(resolved).map(([key, flag]) => [key, flag.effective]),
    );
  }

  // better-auth owns everything under /api/auth (ADR 0021).
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      const response = await auth.handler(
        toWebRequest(config, {
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body,
        }),
      );
      reply.status(response.status);
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });
      return reply.send(await response.text());
    },
  });

  // Routes live in a child plugin so the OpenAPI onRoute hook, installed
  // when the swagger plugin loads, sees every registration.
  void app.register((instance) => {
    const routes = instance.withTypeProvider<ZodTypeProvider>();

    routes.get('/health', () => ({ status: 'ok' }));

    routes.get('/meta', () => ({
      brand: {
        shortName: config.brand.shortName,
        fullName: config.brand.fullName,
      },
    }));

    routes.get('/openapi.json', { schema: { hide: true } }, () =>
      app.swagger(),
    );

    routes.get(
      '/me',
      {
        schema: {
          response: {
            200: z.object({
              user: z.object({ id: z.string(), email: z.string() }),
            }),
            401: z.object({ message: z.string() }),
          },
        },
      },
      async (request, reply) => {
        const webRequest = toWebRequest(config, {
          method: 'GET',
          url: '/me',
          headers: request.headers,
        });
        const result = await auth.api.getSession({
          headers: webRequest.headers,
        });
        if (result === null) {
          return reply.status(401).send({ message: 'not signed in' });
        }
        return { user: { id: result.user.id, email: result.user.email } };
      },
    );

    routes.get(
      '/me/export',
      {
        schema: {
          response: {
            200: z.object({
              user: z.object({
                id: z.string(),
                email: z.string(),
                name: z.string(),
                role: z.string(),
                createdAt: z.string(),
              }),
              reviews: z.array(ReviewEventSchema),
            }),
            401: z.object({ message: z.string() }),
            404: NotFoundSchema,
          },
        },
      },
      async (request, reply) => {
        const sessionResult = await auth.api.getSession({
          headers: toWebRequest(config, {
            method: 'GET',
            url: request.url,
            headers: request.headers,
          }).headers,
        });
        if (sessionResult === null) {
          return reply.status(401).send({ message: 'not signed in' });
        }
        const bundle = await account.exportData(sessionResult.user.id);
        if (bundle === undefined) {
          return reply.status(404).send({ message: 'account not found' });
        }
        return bundle;
      },
    );

    routes.delete(
      '/me',
      {
        schema: {
          response: {
            204: z.null(),
            401: z.object({ message: z.string() }),
          },
        },
      },
      async (request, reply) => {
        const sessionResult = await auth.api.getSession({
          headers: toWebRequest(config, {
            method: 'GET',
            url: request.url,
            headers: request.headers,
          }).headers,
        });
        if (sessionResult === null) {
          return reply.status(401).send({ message: 'not signed in' });
        }
        await account.deleteAccount(sessionResult.user.id);
        return reply.status(204).send(null);
      },
    );

    routes.get(
      '/stats',
      {
        schema: {
          response: {
            200: z.object({
              items: z.number(),
              translations: z.number(),
              reviews: z.number(),
              learners: z.number(),
            }),
          },
        },
      },
      () => stats.counts(),
    );

    routes.get(
      '/flags',
      {
        schema: {
          response: {
            200: z.object({ flags: z.record(z.string(), z.boolean()) }),
          },
        },
      },
      async () => ({ flags: await effectiveFlags() }),
    );

    routes.put(
      '/admin/flags/:key',
      {
        schema: {
          params: z.object({ key: z.string().min(1) }),
          body: z.object({ enabled: z.boolean() }),
          response: {
            200: z.object({ flags: z.record(z.string(), z.boolean()) }),
            401: z.object({ message: z.string() }),
            403: z.object({ message: z.string() }),
            404: z.object({ message: z.string() }),
          },
        },
      },
      async (request, reply) => {
        const webRequest = toWebRequest(config, {
          method: 'GET',
          url: request.url,
          headers: request.headers,
        });
        const sessionResult = await auth.api.getSession({
          headers: webRequest.headers,
        });
        if (sessionResult === null) {
          return reply.status(401).send({ message: 'not signed in' });
        }
        const role = await userRoles.getRole(sessionResult.user.id);
        if (role !== 'admin') {
          return reply.status(403).send({ message: 'admin role required' });
        }
        if (!(request.params.key in flagDefinitions)) {
          return reply.status(404).send({ message: 'unknown flag' });
        }
        await flagStates.setFlag(
          request.params.key,
          request.body.enabled,
          `user:${sessionResult.user.id}`,
        );
        return { flags: await effectiveFlags() };
      },
    );

    routes.post(
      '/sync/reviews',
      {
        schema: {
          body: z.object({ events: z.array(ReviewEventSchema).max(1000) }),
          response: {
            200: z.object({ received: z.number(), stored: z.number() }),
            401: z.object({ message: z.string() }),
          },
        },
      },
      async (request, reply) => {
        const sessionResult = await auth.api.getSession({
          headers: toWebRequest(config, {
            method: 'GET',
            url: request.url,
            headers: request.headers,
          }).headers,
        });
        if (sessionResult === null) {
          return reply.status(401).send({ message: 'not signed in' });
        }
        const stored = await reviews.addAll(
          sessionResult.user.id,
          request.body.events,
        );
        return { received: request.body.events.length, stored };
      },
    );

    routes.get(
      '/sync/reviews',
      {
        schema: {
          querystring: z.object({ since: z.iso.datetime().optional() }),
          response: {
            200: z.object({ events: z.array(ReviewEventSchema) }),
            401: z.object({ message: z.string() }),
          },
        },
      },
      async (request, reply) => {
        const sessionResult = await auth.api.getSession({
          headers: toWebRequest(config, {
            method: 'GET',
            url: request.url,
            headers: request.headers,
          }).headers,
        });
        if (sessionResult === null) {
          return reply.status(401).send({ message: 'not signed in' });
        }
        return {
          events: await reviews.listSince(
            sessionResult.user.id,
            request.query.since,
          ),
        };
      },
    );

    routes.get(
      '/course',
      {
        schema: {
          response: {
            200: z.object({
              units: z.array(
                z.object({
                  id: z.uuid(),
                  title: z.string(),
                  lessons: z.array(
                    z.object({
                      id: z.uuid(),
                      title: z.string(),
                      itemCount: z.number(),
                    }),
                  ),
                }),
              ),
            }),
          },
        },
      },
      async () => ({ units: await course.overview() }),
    );

    routes.get(
      '/lessons/:id',
      {
        schema: {
          params: z.object({ id: z.uuid() }),
          response: {
            200: z.object({
              title: z.string(),
              items: z.array(ItemSchema),
            }),
            404: NotFoundSchema,
          },
        },
      },
      async (request, reply) => {
        const lesson = await course.lessonItems(request.params.id);
        if (lesson === undefined) {
          return reply.status(404).send({ message: 'lesson not found' });
        }
        return lesson;
      },
    );

    routes.get(
      '/items',
      {
        schema: {
          querystring: z.object({
            limit: z.coerce.number().int().min(1).max(100).default(20),
            offset: z.coerce.number().int().min(0).default(0),
          }),
          response: { 200: z.object({ items: z.array(ItemSchema) }) },
        },
      },
      async (request) => ({
        items: await items.list(request.query.limit, request.query.offset),
      }),
    );

    routes.get(
      '/items/:id',
      {
        schema: {
          params: z.object({ id: z.uuid() }),
          response: { 200: RenderedItemSchema, 404: NotFoundSchema },
        },
      },
      async (request, reply) => {
        const item = await items.findById(request.params.id);
        if (item === undefined) {
          return reply.status(404).send({ message: 'item not found' });
        }
        return {
          item,
          renderings: {
            latin: transliterate(item.text, { script: 'latin' }),
            cyrillic: transliterate(item.text, { script: 'cyrillic' }),
          },
        };
      },
    );
  });

  return app;
}
