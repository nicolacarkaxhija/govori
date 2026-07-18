import { describe, expect, it } from 'vitest';
import { ConfigError } from '@glotty/config';
import { loadConfig } from './config.js';

const brand = { shortName: 'Testbrand', fullName: 'Testbrand — Test App' };

describe('loadConfig', () => {
  it('boots on defaults plus the instance brand', () => {
    const config = loadConfig({}, brand);
    expect(config.server.port).toBe(3000);
    expect(config.brand.shortName).toBe('Testbrand');
    expect(config.brand.fullName).toBe('Testbrand — Test App');
  });

  it('lets environment variables override defaults through the prefix', () => {
    const config = loadConfig(
      {
        GLOTTY_SERVER__PORT: '8080',
        GLOTTY_BRAND__SHORT_NAME: 'Hajde',
      },
      brand,
    );
    expect(config.server.port).toBe(8080);
    expect(config.brand.shortName).toBe('Hajde');
  });

  it('fails at boot on invalid values', () => {
    expect(() =>
      loadConfig({ GLOTTY_SERVER__PORT: 'not-a-port' }, brand),
    ).toThrow(ConfigError);
  });

  it('is deeply frozen', () => {
    const config = loadConfig({}, brand);
    expect(Object.isFrozen(config.server)).toBe(true);
  });
});
