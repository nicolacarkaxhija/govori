import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

describe('buildApp', () => {
  it('serves a health check', async () => {
    const app = buildApp({ config: loadConfig({}) });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('exposes the instance brand for the client shell', async () => {
    const app = buildApp({
      config: loadConfig({ GOVORI_BRAND__SHORT_NAME: 'Hajde' }),
    });
    const response = await app.inject({ method: 'GET', url: '/meta' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      brand: {
        shortName: 'Hajde',
        fullName: 'Govori — Interslavic Learning App',
      },
    });
    await app.close();
  });
});
