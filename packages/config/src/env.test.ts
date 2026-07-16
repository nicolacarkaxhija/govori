import { describe, expect, it } from 'vitest';
import { envSource } from './index.js';

describe('envSource', () => {
  it('converts prefixed variables into a nested partial, lowercasing keys', () => {
    expect(
      envSource(
        {
          GOVORI_SERVER__PORT: '8080',
          GOVORI_BRAND__SHORT_NAME: 'Govori',
          UNRELATED: 'ignored',
        },
        'GOVORI_',
      ),
    ).toEqual({
      server: { port: '8080' },
      brand: { short_name: 'Govori' },
    });
  });

  it('merges sibling variables under one section', () => {
    expect(
      envSource(
        { GOVORI_DB__HOST: 'localhost', GOVORI_DB__PORT: '5432' },
        'GOVORI_',
      ),
    ).toEqual({ db: { host: 'localhost', port: '5432' } });
  });

  it('returns an empty object when nothing matches the prefix', () => {
    expect(envSource({ PATH: '/usr/bin' }, 'GOVORI_')).toEqual({});
  });

  it('ignores variables with undefined values', () => {
    expect(envSource({ GOVORI_SERVER__PORT: undefined }, 'GOVORI_')).toEqual(
      {},
    );
  });
});
