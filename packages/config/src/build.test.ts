import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildConfig, ConfigError } from './index.js';

const schema = z.object({
  server: z.object({
    port: z.coerce.number().int().min(1).max(65535),
    baseUrl: z.url(),
  }),
  brand: z.object({
    shortName: z.string().min(1),
    fullName: z.string().min(1),
  }),
});

const defaults = {
  server: { port: 3000, baseUrl: 'http://localhost:3000' },
  brand: { shortName: 'Govori', fullName: 'Govori — Interslavic Learning App' },
};

describe('buildConfig', () => {
  it('parses defaults into a typed config', () => {
    const config = buildConfig(schema, [defaults]);
    expect(config.server.port).toBe(3000);
    expect(config.brand.shortName).toBe('Govori');
  });

  it('lets later sources override earlier ones, deep-merged per key', () => {
    const config = buildConfig(schema, [
      defaults,
      { server: { port: '8080' } },
    ]);
    expect(config.server.port).toBe(8080);
    expect(config.server.baseUrl).toBe('http://localhost:3000');
    expect(config.brand.fullName).toBe('Govori — Interslavic Learning App');
  });

  it('fails fast with the offending path when validation fails', () => {
    expect(() =>
      buildConfig(schema, [defaults, { server: { port: 'not-a-port' } }]),
    ).toThrow(ConfigError);
    expect(() =>
      buildConfig(schema, [defaults, { server: { port: 'not-a-port' } }]),
    ).toThrow(/server\.port/);
  });

  it('fails fast when a required key is missing entirely', () => {
    expect(() => buildConfig(schema, [{ server: { port: 1 } }])).toThrow(
      ConfigError,
    );
  });

  it('returns a deeply frozen object', () => {
    const config = buildConfig(schema, [defaults]);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.server)).toBe(true);
    expect(() => {
      (config.server as { port: number }).port = 9999;
    }).toThrow(TypeError);
  });

  it('keeps a null override as a null value through merge and freeze', () => {
    const nullableSchema = z.object({
      box: z.object({ inner: z.number() }).nullable(),
    });
    const config = buildConfig(nullableSchema, [
      { box: { inner: 1 } },
      { box: null },
    ]);
    expect(config.box).toBe(null);
  });

  it('replaces, rather than merges, when only one side is a plain object', () => {
    class NonPlain {
      readonly b = 2;
    }
    const strictSchema = z.object({ meta: z.strictObject({ b: z.number() }) });
    const config = buildConfig(strictSchema, [
      { meta: { a: 1 } },
      { meta: new NonPlain() },
    ]);
    expect(config.meta).toEqual({ b: 2 });
  });

  it('takes the overriding scalar when it replaces an object branch', () => {
    const portSchema = z.object({ port: z.number() });
    const config = buildConfig(portSchema, [
      { port: { nested: 1 } },
      { port: 8080 },
    ]);
    expect(config.port).toBe(8080);
  });

  it('joins multiple validation issues with a semicolon separator', () => {
    let message = '';
    try {
      buildConfig(schema, [{}]);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('server');
    expect(message).toContain('brand');
    expect(message).toContain('; ');
  });
});

describe('ConfigError', () => {
  it('reports a stable name for diagnostics and logs', () => {
    expect(new ConfigError('boom').name).toBe('ConfigError');
  });
});
