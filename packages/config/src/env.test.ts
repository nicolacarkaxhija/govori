import { describe, expect, it } from 'vitest';
import { envSource } from './index.js';

describe('envSource', () => {
  it('converts prefixed variables into a nested partial, camelizing keys', () => {
    expect(
      envSource(
        {
          GLOTTY_SERVER__PORT: '8080',
          GLOTTY_BRAND__SHORT_NAME: 'Govori',
          UNRELATED: 'ignored',
        },
        'GLOTTY_',
      ),
    ).toEqual({
      server: { port: '8080' },
      brand: { shortName: 'Govori' },
    });
  });

  it('merges sibling variables under one section', () => {
    expect(
      envSource(
        { GLOTTY_DB__HOST: 'localhost', GLOTTY_DB__PORT: '5432' },
        'GLOTTY_',
      ),
    ).toEqual({ db: { host: 'localhost', port: '5432' } });
  });

  it('returns an empty object when nothing matches the prefix', () => {
    expect(envSource({ PATH: '/usr/bin' }, 'GLOTTY_')).toEqual({});
  });

  it('ignores variables with undefined values', () => {
    expect(envSource({ GLOTTY_SERVER__PORT: undefined }, 'GLOTTY_')).toEqual(
      {},
    );
  });
});
