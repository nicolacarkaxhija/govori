import Fastify from 'fastify';
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
import type { ApiConfig } from './config.js';
import type { ItemQueries } from './content/ports.js';

export interface AppDependencies {
  config: ApiConfig;
  items: ItemQueries;
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

/**
 * Builds the HTTP adapter over injected dependencies. Pure of process state:
 * no environment access, no listening — the composition root (main.ts) does
 * that (ADR 0018). Request/response schemas are Zod; the OpenAPI document
 * is generated from them (ADR 0019).
 */
export function buildApp({ config, items }: AppDependencies) {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  void app.register(swagger, {
    openapi: {
      info: {
        title: `${config.brand.shortName} API`,
        version: '0.0.0',
      },
    },
    transform: jsonSchemaTransform,
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
