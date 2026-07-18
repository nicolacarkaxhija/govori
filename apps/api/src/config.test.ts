import { describe, expect, it } from 'vitest';
import { ConfigError } from '@glotty/config';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('boots on defaults alone with the Govori brand', () => {
    const config = loadConfig({});
    expect(config.server.port).toBe(3000);
    expect(config.brand.shortName).toBe('Govori');
    expect(config.brand.fullName).toBe('Govori — Interslavic Learning App');
  });

  it('lets environment variables override defaults through the prefix', () => {
    const config = loadConfig({
      GLOTTY_SERVER__PORT: '8080',
      GLOTTY_BRAND__SHORT_NAME: 'Hajde',
    });
    expect(config.server.port).toBe(8080);
    expect(config.brand.shortName).toBe('Hajde');
  });

  it('fails at boot on invalid values', () => {
    expect(() => loadConfig({ GLOTTY_SERVER__PORT: 'not-a-port' })).toThrow(
      ConfigError,
    );
  });

  it('is deeply frozen', () => {
    const config = loadConfig({});
    expect(Object.isFrozen(config.server)).toBe(true);
  });
});
