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
import {
  makeContentSchemas,
  ProvenanceSchema,
  type Item,
} from '@glotty/content';
import {
  resolveDirection,
  type InstanceConfig,
  type ResolvedDirection,
} from '@glotty/language';
import { resolveFlags, type ViewerRole } from '@glotty/config';
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
import type { ReviewQueue, VoteStore } from './review/ports.js';
import type { UserDirectory } from './auth/ports.js';
import type { RecordingStore } from './audio/ports.js';
import type { MorphologyQueries } from './morphology/ports.js';
import type { ExportQueries } from './export/ports.js';

export interface AppDependencies {
  config: ApiConfig;
  /** The resolved product (ADR 0029): owns branding and the direction
   * roster (ADR 0046). */
  instance: InstanceConfig;
  /** The instance's resolved directions (ADR 0046): each pairs the
   * direction's tuning with its language pack, whose canonical
   * validation and script renderings are judgment calls this adapter
   * never makes itself (ADR 0029). */
  directions: readonly ResolvedDirection[];
  items: ItemQueries;
  flagStates: FlagStore;
  auth: Auth;
  userRoles: UserRoles;
  reviews: ReviewEventStore;
  stats: StatsQueries;
  course: CourseQueries;
  account: AccountRights;
  reviewQueue: ReviewQueue;
  /** Community votes over the pending queue (ADR 0040). */
  votes: VoteStore;
  /** Write side used when a draft is approved (ADR 0038); the draft's
   * direction picks the pool it publishes into (ADR 0046). */
  itemWriter: {
    upsertMany(items: readonly Item[], direction: string): Promise<void>;
  };
  userDirectory: UserDirectory;
  recordings: RecordingStore;
  /** Inflected forms per item for morphology drills (ADR 0037). */
  morphology: MorphologyQueries;
  /** Bulk reads behind the public open-data export (ADR 0007/0010). */
  openData: ExportQueries;
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
  instance,
  directions,
  items,
  flagStates,
  auth,
  userRoles,
  reviews,
  stats,
  course,
  account,
  reviewQueue,
  votes,
  itemWriter,
  userDirectory,
  recordings,
  morphology,
  openData,
}: AppDependencies) {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // The sole direction, totally resolved from config (ADR 0046) — the
  // engine still never defaults: a second direction makes this throw
  // until the routes learn to ask.
  const { direction, pack } = resolveDirection(
    { instance, directions },
    undefined,
  );

  // Artifact schemas bound to this instance's language (ADR 0029).
  const {
    ItemSchema,
    ContentArtifactSchema,
    CurriculumArtifactSchema,
    MorphologyArtifactSchema,
  } = makeContentSchemas((text) => pack.validateCanonical(text));

  const RenderedItemSchema = z.object({
    item: ItemSchema,
    /** Scripts derived from canonical text at the edge (ADR 0003),
     * keyed by the pack's script ids. */
    renderings: z.record(z.string(), z.string()),
  });

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

  async function effectiveFlags(
    viewerRole: ViewerRole,
  ): Promise<Record<string, boolean>> {
    const resolved = resolveFlags(
      flagDefinitions,
      await flagStates.getStates(),
      viewerRole,
    );
    return Object.fromEntries(
      Object.entries(resolved).map(([key, flag]) => [key, flag.effective]),
    );
  }

  /** The asking viewer's ring: anonymous without a session, else their role. */
  async function viewerRoleFor(request: {
    url: string;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<ViewerRole> {
    const session = await auth.api.getSession({
      headers: toWebRequest(config, {
        method: 'GET',
        url: request.url,
        headers: request.headers,
      }).headers,
    });
    if (session === null) {
      return 'anonymous';
    }
    return userRoles.getRole(session.user.id);
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
  void app.register((plugin) => {
    const routes = plugin.withTypeProvider<ZodTypeProvider>();

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
              user: z.object({
                id: z.string(),
                email: z.string(),
                role: z.enum(['learner', 'reviewer', 'admin']),
              }),
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
        return {
          user: {
            id: result.user.id,
            email: result.user.email,
            role: await userRoles.getRole(result.user.id),
          },
        };
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
      () => stats.counts(direction.id),
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
      // Ring-gated per viewer (ADR 0025): the same flag can read on for a
      // reviewer and off for an anonymous visitor.
      async (request) => ({
        flags: await effectiveFlags(await viewerRoleFor(request)),
      }),
    );

    routes.put(
      '/admin/flags/:key',
      {
        schema: {
          params: z.object({ key: z.string().min(1) }),
          // targetRole is optional: an omitted ring leaves the stored one.
          body: z.object({
            enabled: z.boolean(),
            targetRole: z.enum(['all', 'reviewer', 'admin']).optional(),
          }),
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
          request.body.targetRole,
        );
        // The admin doing the flip is who this response is resolved for.
        return { flags: await effectiveFlags('admin') };
      },
    );

    routes.post(
      '/contribute',
      {
        schema: {
          body: z.object({
            kind: z.enum(['word', 'phrase', 'sentence']),
            text: z.string().trim().min(1).max(500),
            translations: z
              .array(
                z.object({
                  lang: z.string().min(2).max(11),
                  text: z.string().trim().min(1).max(500),
                }),
              )
              .min(1)
              .max(8),
          }),
          response: {
            202: z.object({ status: z.literal('pending-review') }),
            400: z.object({ message: z.string() }),
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
        // Contributions are open to every learner (ADR 0009); they enter
        // the same review queue AI drafts do (ADR 0038).
        const candidate = ItemSchema.safeParse({
          id: crypto.randomUUID(),
          kind: request.body.kind,
          text: request.body.text,
          translations: request.body.translations,
          notes: [],
          provenance: {
            origin: 'human',
            contributorId: sessionResult.user.id,
          },
        });
        if (!candidate.success) {
          return reply.status(400).send({
            // The pack owns its orthography's name (ADR 0029).
            message: `the text must be written in ${pack.orthographyName}`,
          });
        }
        await reviewQueue.addPending([candidate.data], direction.id);
        return reply.status(202).send({ status: 'pending-review' });
      },
    );

    // Community audio (ADR 0004): fully built, dark until the flag flips.
    // Recordings publish without review (ADR 0008); accents stay diverse.
    routes.post(
      '/items/:id/audio',
      {
        schema: {
          params: z.object({ id: z.uuid() }),
          body: z.object({
            mime: z.enum(['audio/webm', 'audio/ogg', 'audio/mpeg']),
            /** ~1 MiB of audio once decoded — cost caution (ADR 0004). */
            data: z.base64().min(1).max(1_400_000),
          }),
          response: {
            201: z.object({ id: z.uuid() }),
            401: z.object({ message: z.string() }),
            404: z.object({ message: z.string() }),
          },
        },
      },
      async (request, reply) => {
        // Audio is a public capability: gate on whether it is live at all.
        const flags = await effectiveFlags('anonymous');
        if (flags.audio !== true) {
          return reply.status(404).send({ message: 'not found' });
        }
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
        const found = await items.findById(request.params.id);
        if (found === undefined) {
          return reply.status(404).send({ message: 'unknown item' });
        }
        const id = crypto.randomUUID();
        await recordings.add({
          id,
          itemId: found.item.id,
          mime: request.body.mime,
          contributorId: sessionResult.user.id,
          bytes: Buffer.from(request.body.data, 'base64'),
        });
        return reply.status(201).send({ id });
      },
    );

    routes.get(
      '/items/:id/audio',
      {
        schema: {
          params: z.object({ id: z.uuid() }),
          response: {
            200: z.object({
              recordings: z.array(z.object({ id: z.uuid(), mime: z.string() })),
            }),
            404: z.object({ message: z.string() }),
          },
        },
      },
      async (request, reply) => {
        // Audio is a public capability: gate on whether it is live at all.
        const flags = await effectiveFlags('anonymous');
        if (flags.audio !== true) {
          return reply.status(404).send({ message: 'not found' });
        }
        const found = await recordings.listForItem(request.params.id);
        return {
          recordings: found.map(({ id, mime }) => ({ id, mime })),
        };
      },
    );

    // No response schema: the 200 body is raw audio, not JSON.
    routes.get(
      '/audio/:id',
      {
        schema: {
          params: z.object({ id: z.uuid() }),
        },
      },
      async (request, reply) => {
        // Audio is a public capability: gate on whether it is live at all.
        const flags = await effectiveFlags('anonymous');
        if (flags.audio !== true) {
          return reply.status(404).send({ message: 'not found' });
        }
        const recording = await recordings.get(request.params.id);
        if (recording === undefined) {
          return reply.status(404).send({ message: 'unknown recording' });
        }

        return reply
          .header('content-type', recording.mime)
          .send(Buffer.from(recording.bytes));
      },
    );

    routes.get(
      '/admin/review',
      {
        schema: {
          querystring: z.object({
            limit: z.coerce.number().int().min(1).max(100).default(50),
          }),
          response: {
            200: z.object({ pending: z.array(ItemSchema) }),
            401: z.object({ message: z.string() }),
            403: z.object({ message: z.string() }),
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
        // A single Reviewer approval publishes (ADR 0008), so reviewers
        // see the same queue admins do.
        const role = await userRoles.getRole(sessionResult.user.id);
        if (role !== 'reviewer' && role !== 'admin') {
          return reply.status(403).send({ message: 'reviewer role required' });
        }
        return { pending: await reviewQueue.listPending(request.query.limit) };
      },
    );

    routes.post(
      '/admin/review/:id',
      {
        schema: {
          params: z.object({ id: z.uuid() }),
          body: z.object({ decision: z.enum(['approve', 'reject']) }),
          response: {
            200: z.object({ decided: z.enum(['approved', 'rejected']) }),
            401: z.object({ message: z.string() }),
            403: z.object({ message: z.string() }),
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
        const role = await userRoles.getRole(sessionResult.user.id);
        if (role !== 'reviewer' && role !== 'admin') {
          return reply.status(403).send({ message: 'reviewer role required' });
        }
        const decision: 'approved' | 'rejected' =
          request.body.decision === 'approve' ? 'approved' : 'rejected';
        const decided = await reviewQueue.decide(
          request.params.id,
          decision,
          `user:${sessionResult.user.id}`,
        );
        if (decided === undefined) {
          return reply.status(404).send({ message: 'no pending entry' });
        }
        if (decision === 'approved') {
          // The draft publishes into the direction it was queued for.
          await itemWriter.upsertMany([decided.item], decided.direction);
        }
        return { decided: decision };
      },
    );

    // Community voting (ADR 0040): any signed-in learner may vote a
    // pending draft up or down; enough net upvotes publish it like an
    // approval. The threshold is this instance's to set (ADR 0040).
    routes.post(
      '/review/:id/vote',
      {
        schema: {
          params: z.object({ id: z.uuid() }),
          body: z.object({ up: z.boolean() }),
          response: {
            200: z.object({ upvotes: z.number(), downvotes: z.number() }),
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
        const pendingItem = await reviewQueue.findPending(request.params.id);
        if (pendingItem === undefined) {
          return reply.status(404).send({ message: 'no pending entry' });
        }
        const tally = await votes.castVote(
          request.params.id,
          sessionResult.user.id,
          request.body.up,
        );
        if (
          tally.upvotes - tally.downvotes >=
          direction.communityPublishNetVotes
        ) {
          // Publishing mirrors a reviewer approval (ADR 0040); a decide
          // that comes back empty means someone else got there first.
          const decided = await reviewQueue.decide(
            request.params.id,
            'approved',
            'community:vote',
          );
          if (decided !== undefined) {
            await itemWriter.upsertMany([decided.item], decided.direction);
          }
        }
        return tally;
      },
    );

    routes.get(
      '/review/pending',
      {
        schema: {
          querystring: z.object({
            limit: z.coerce.number().int().min(1).max(100).default(50),
          }),
          response: {
            200: z.object({
              pending: z.array(
                z.object({
                  item: ItemSchema,
                  upvotes: z.number(),
                  downvotes: z.number(),
                  myVote: z.boolean().nullable(),
                }),
              ),
            }),
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
        const pendingItems = await reviewQueue.listPending(request.query.limit);
        const tallies = await votes.talliesFor(
          pendingItems.map((item) => item.id),
          sessionResult.user.id,
        );
        return {
          pending: pendingItems.map((item) => ({
            item,
            ...(tallies.get(item.id) ?? {
              upvotes: 0,
              downvotes: 0,
              myVote: null,
            }),
          })),
        };
      },
    );

    routes.get(
      '/admin/users',
      {
        schema: {
          querystring: z.object({
            limit: z.coerce.number().int().min(1).max(200).default(100),
          }),
          response: {
            200: z.object({
              users: z.array(
                z.object({
                  id: z.string(),
                  email: z.string(),
                  name: z.string(),
                  role: z.enum(['learner', 'reviewer', 'admin']),
                  createdAt: z.iso.datetime(),
                }),
              ),
            }),
            401: z.object({ message: z.string() }),
            403: z.object({ message: z.string() }),
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
        const role = await userRoles.getRole(sessionResult.user.id);
        if (role !== 'admin') {
          return reply.status(403).send({ message: 'admin role required' });
        }
        return { users: await userDirectory.listUsers(request.query.limit) };
      },
    );

    routes.put(
      '/admin/users/:id/role',
      {
        schema: {
          params: z.object({ id: z.string().min(1) }),
          body: z.object({ role: z.enum(['learner', 'reviewer', 'admin']) }),
          response: {
            200: z.object({
              id: z.string(),
              role: z.enum(['learner', 'reviewer', 'admin']),
            }),
            401: z.object({ message: z.string() }),
            403: z.object({ message: z.string() }),
            404: NotFoundSchema,
            409: z.object({ message: z.string() }),
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
        const role = await userRoles.getRole(sessionResult.user.id);
        if (role !== 'admin') {
          return reply.status(403).send({ message: 'admin role required' });
        }
        if (request.params.id === sessionResult.user.id) {
          // The last admin locking themselves out is one click away.
          return reply
            .status(409)
            .send({ message: 'you cannot change your own role' });
        }
        const changed = await userDirectory.setRole(
          request.params.id,
          request.body.role,
        );
        if (!changed) {
          return reply.status(404).send({ message: 'user not found' });
        }
        return { id: request.params.id, role: request.body.role };
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
      async () => ({ units: await course.overview(direction.id) }),
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
              /** Intro scene with disclosed provenance (ADR 0012/0039). */
              dialogue: z
                .object({
                  turns: z.array(
                    z.object({
                      speaker: z.string(),
                      text: z.string(),
                      translation: z.string(),
                    }),
                  ),
                  provenance: ProvenanceSchema,
                })
                .optional(),
            }),
            404: NotFoundSchema,
          },
        },
      },
      async (request, reply) => {
        const lesson = await course.lessonItems(
          request.params.id,
          direction.id,
        );
        if (lesson === undefined) {
          return reply.status(404).send({ message: 'lesson not found' });
        }
        return lesson;
      },
    );

    routes.get(
      '/lessons/:id/sentences',
      {
        schema: {
          params: z.object({ id: z.uuid() }),
          response: {
            200: z.object({ sentences: z.array(ItemSchema) }),
            404: NotFoundSchema,
          },
        },
      },
      async (request, reply) => {
        const lesson = await course.lessonItems(
          request.params.id,
          direction.id,
        );
        if (lesson === undefined) {
          return reply.status(404).send({ message: 'lesson not found' });
        }
        const words = lesson.items.map((item) => item.text);
        return {
          sentences: await items.findSentencesContaining(
            direction.id,
            words,
            20,
          ),
        };
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
        items: await items.list(
          direction.id,
          request.query.limit,
          request.query.offset,
        ),
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
        const found = await items.findById(request.params.id);
        if (found === undefined) {
          return reply.status(404).send({ message: 'item not found' });
        }
        // Renderings come from the owning direction's pack (ADR 0046);
        // an item stranded outside the declared roster renders nothing.
        const owning = directions.find(
          (entry) => entry.direction.id === found.direction,
        );
        return {
          item: found.item,
          renderings: Object.fromEntries(
            (owning?.pack.scripts ?? []).map((script) => [
              script.id,
              script.render(found.item.text),
            ]),
          ),
        };
      },
    );

    routes.get(
      '/items/:id/forms',
      {
        schema: {
          params: z.object({ id: z.uuid() }),
          response: {
            // Unknown or formless items answer with an empty list — the
            // paradigm is an attribute of the item, never a resource 404.
            200: z.object({
              forms: z.array(z.object({ tag: z.string(), text: z.string() })),
            }),
          },
        },
      },
      async (request) => ({
        forms: await morphology.formsFor(request.params.id),
      }),
    );

    // Open data export (ADR 0007/0010): the learning content is public
    // and CC BY-SA 4.0 licensed; anyone may take the whole pool, shaped
    // exactly like our own import artifacts. Empty pools 404 rather than
    // emit an artifact the shared schemas would reject.
    const exportEnvelope = {
      license: 'CC-BY-SA-4.0' as const,
      attribution: config.brand.fullName,
    };
    const artifactStamp = () => ({
      schemaVersion: 1 as const,
      createdAt: new Date().toISOString(),
      producer: { name: 'glotty-api', version: '1' },
    });
    const exportResponse = <T extends z.ZodType>(artifact: T) =>
      z.object({
        license: z.literal('CC-BY-SA-4.0'),
        attribution: z.string(),
        artifact,
      });

    routes.get(
      '/export/content',
      {
        schema: {
          response: {
            200: exportResponse(ContentArtifactSchema),
            404: NotFoundSchema,
          },
        },
      },
      async (_request, reply) => {
        const exported = await openData.allItems(direction.id);
        if (exported.length === 0) {
          return reply
            .status(404)
            .send({ message: 'no content to export yet' });
        }
        return {
          ...exportEnvelope,
          artifact: { ...artifactStamp(), items: exported },
        };
      },
    );

    routes.get(
      '/export/curriculum',
      {
        schema: {
          response: {
            200: exportResponse(CurriculumArtifactSchema),
            404: NotFoundSchema,
          },
        },
      },
      async (_request, reply) => {
        const exported = await openData.curriculumUnits(direction.id);
        if (exported.length === 0) {
          return reply
            .status(404)
            .send({ message: 'no curriculum to export yet' });
        }
        return {
          ...exportEnvelope,
          artifact: { ...artifactStamp(), units: exported },
        };
      },
    );

    routes.get(
      '/export/morphology',
      {
        schema: {
          response: {
            200: exportResponse(MorphologyArtifactSchema),
            404: NotFoundSchema,
          },
        },
      },
      async (_request, reply) => {
        const exported = await openData.morphologyEntries(direction.id);
        if (exported.length === 0) {
          return reply
            .status(404)
            .send({ message: 'no morphology to export yet' });
        }
        return {
          ...exportEnvelope,
          artifact: { ...artifactStamp(), entries: exported },
        };
      },
    );
  });

  return app;
}
