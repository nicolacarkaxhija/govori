import { describe, expect, it } from 'vitest';
import {
  hasScriptChoice,
  nextScript,
  renderIn,
  resolveDirection,
  resolveInstance,
  type InstanceConfig,
  type LanguagePack,
} from './index.js';

const upper = {
  id: 'upper',
  label: 'AA',
  render: (text: string) => text.toUpperCase(),
};
const quoted = {
  id: 'quoted',
  label: '«A»',
  render: (text: string) => `«${text}»`,
};

function makePack(scripts: LanguagePack['scripts']): LanguagePack {
  return {
    id: 'fake',
    bcp47: 'zxx',
    orthographyName: 'fake canonical spelling',
    validateCanonical: (text) => text.length > 0,
    normalize: (text) => text.toLowerCase(),
    stem: (word) => word.slice(0, 3),
    scripts,
  };
}

describe('renderIn', () => {
  it('renders through the script matching the id', () => {
    expect(renderIn(makePack([upper, quoted]), 'quoted', 'dom')).toBe('«dom»');
  });

  it('falls back to the canonical text for an unknown script id', () => {
    expect(renderIn(makePack([upper]), 'missing', 'dom')).toBe('dom');
  });
});

describe('hasScriptChoice', () => {
  it('is false without an alternative script', () => {
    expect(hasScriptChoice(makePack([]))).toBe(false);
    expect(hasScriptChoice(makePack([upper]))).toBe(false);
  });

  it('is true from two scripts on', () => {
    expect(hasScriptChoice(makePack([upper, quoted]))).toBe(true);
  });
});

describe('nextScript', () => {
  it('cycles to the following script and wraps around', () => {
    const pack = makePack([upper, quoted]);
    expect(nextScript(pack, 'upper')?.id).toBe('quoted');
    expect(nextScript(pack, 'quoted')?.id).toBe('upper');
  });

  it('starts from the first script when the id is unknown', () => {
    expect(nextScript(makePack([upper, quoted]), 'missing')?.id).toBe('upper');
  });

  it('is undefined for a pack without scripts', () => {
    expect(nextScript(makePack([]), 'upper')).toBeUndefined();
  });
});

const pack = makePack([upper]);
const otherPack = { ...makePack([quoted]), id: 'other' };
const forth = {
  id: 'forth',
  packId: 'fake',
  label: 'Fakish',
  fallbackTranslationLang: 'en',
  communityPublishNetVotes: 3,
};
const back = {
  id: 'back',
  packId: 'other',
  label: 'Otherish',
  fallbackTranslationLang: 'zz',
  communityPublishNetVotes: 5,
};
const fake: InstanceConfig = {
  id: 'fakeapp',
  brand: {
    shortName: 'Fake',
    fullName: 'Fake — App',
    description: 'A test instance.',
  },
  directions: [forth],
  uiLanguages: ['en'],
  learnLanguages: [{ code: 'en', name: 'English' }],
  catalogs: { en: { check: 'Check' } },
};
// Two known instances, so the "known instances" listing must join with
// a separator — a one-entry list cannot tell ', ' from ''.
const registry = {
  instances: { fakeapp: fake, otherapp: { ...fake, id: 'otherapp' } },
  packs: { fake: pack, other: otherPack },
};

describe('resolveInstance', () => {
  it('resolves a known instance with its directions and their packs', () => {
    const resolved = resolveInstance(registry, 'fakeapp', 'THE_VAR');
    expect(resolved.instance.id).toBe('fakeapp');
    expect(resolved.directions.map((entry) => entry.direction.id)).toEqual([
      'forth',
    ]);
    expect(resolved.directions.map((entry) => entry.pack.id)).toEqual(['fake']);
  });

  it('resolves every direction of a two-way instance, in order', () => {
    const twoWay = {
      instances: { fakeapp: { ...fake, directions: [forth, back] } },
      packs: registry.packs,
    };
    const resolved = resolveInstance(twoWay, 'fakeapp', 'THE_VAR');
    expect(resolved.directions.map((entry) => entry.pack.id)).toEqual([
      'fake',
      'other',
    ]);
  });

  it('fails fast when the id is unset, naming the variable', () => {
    for (const id of [undefined, '']) {
      expect(() => resolveInstance(registry, id, 'THE_VAR')).toThrow(
        'THE_VAR is not set; known instances: fakeapp, otherapp',
      );
    }
  });

  it('fails fast on an unknown instance id', () => {
    expect(() => resolveInstance(registry, 'nope', 'THE_VAR')).toThrow(
      "unknown instance 'nope'; known instances: fakeapp, otherapp",
    );
  });

  it('fails fast on an instance without directions', () => {
    const empty = {
      instances: { fakeapp: { ...fake, directions: [] } },
      packs: registry.packs,
    };
    expect(() => resolveInstance(empty, 'fakeapp', 'THE_VAR')).toThrow(
      /instance 'fakeapp' declares no directions/,
    );
  });

  it('fails fast on duplicate direction ids', () => {
    const doubled = {
      instances: { fakeapp: { ...fake, directions: [forth, forth] } },
      packs: registry.packs,
    };
    expect(() => resolveInstance(doubled, 'fakeapp', 'THE_VAR')).toThrow(
      /instance 'fakeapp' declares duplicate direction 'forth'/,
    );
  });

  it('fails fast when a direction names an unknown pack', () => {
    const broken = {
      instances: {
        fakeapp: { ...fake, directions: [{ ...forth, packId: 'ghost' }] },
      },
      packs: registry.packs,
    };
    expect(() => resolveInstance(broken, 'fakeapp', 'THE_VAR')).toThrow(
      /direction 'forth' of instance 'fakeapp' names unknown pack 'ghost'/,
    );
  });
});

describe('resolveDirection', () => {
  // Built lazily inside each test: fixtures resolved at collection time
  // would turn every resolveInstance mutant static and unattributable.
  const oneWay = () => resolveInstance(registry, 'fakeapp', 'THE_VAR');
  const twoWay = () =>
    resolveInstance(
      {
        instances: { fakeapp: { ...fake, directions: [forth, back] } },
        packs: registry.packs,
      },
      'fakeapp',
      'THE_VAR',
    );

  it('resolves a named direction with its pack', () => {
    const resolved = resolveDirection(twoWay(), 'back');
    expect(resolved.direction.id).toBe('back');
    expect(resolved.pack.id).toBe('other');
  });

  it('totally resolves an omitted id over a single direction', () => {
    // Not a default: the one declared direction is the only answer the
    // config permits, so omission loses no information (ADR 0046).
    for (const id of [undefined, '']) {
      expect(resolveDirection(oneWay(), id).direction.id).toBe('forth');
    }
  });

  it('demands an id as soon as a second direction exists', () => {
    for (const id of [undefined, '']) {
      expect(() => resolveDirection(twoWay(), id)).toThrow(
        'direction is required; known directions: forth, back',
      );
    }
  });

  it('rejects an unknown direction id', () => {
    expect(() => resolveDirection(twoWay(), 'sideways')).toThrow(
      "unknown direction 'sideways'; known directions: forth, back",
    );
  });

  it('rejects an omitted id over no directions at all', () => {
    const none = { instance: fake, directions: [] };
    expect(() => resolveDirection(none, undefined)).toThrow(
      /direction is required; known directions: $/,
    );
  });
});
