import { describe, expect, it } from 'vitest';
import {
  hasScriptChoice,
  nextScript,
  renderIn,
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

describe('resolveInstance', () => {
  const pack = makePack([upper]);
  const fake: InstanceConfig = {
    id: 'fakeapp',
    brand: {
      shortName: 'Fake',
      fullName: 'Fake — App',
      description: 'A test instance.',
    },
    packId: 'fake',
    uiLanguages: ['en'],
    fallbackTranslationLang: 'en',
    communityPublishNetVotes: 3,
    learnLanguages: [{ code: 'en', name: 'English' }],
    catalogs: { en: { check: 'Check' } },
  };
  const registry = { instances: { fakeapp: fake }, packs: { fake: pack } };

  it('resolves a known instance with its pack', () => {
    const resolved = resolveInstance(registry, 'fakeapp', 'THE_VAR');
    expect(resolved.instance.id).toBe('fakeapp');
    expect(resolved.pack.id).toBe('fake');
  });

  it('fails fast when the id is unset, naming the variable', () => {
    for (const id of [undefined, '']) {
      expect(() => resolveInstance(registry, id, 'THE_VAR')).toThrow(
        /THE_VAR is not set; known instances: fakeapp/,
      );
    }
  });

  it('fails fast on an unknown instance id', () => {
    expect(() => resolveInstance(registry, 'nope', 'THE_VAR')).toThrow(
      /unknown instance 'nope'; known instances: fakeapp/,
    );
  });

  it('fails fast when the instance names an unknown pack', () => {
    const broken = {
      instances: { fakeapp: { ...fake, packId: 'ghost' } },
      packs: registry.packs,
    };
    expect(() => resolveInstance(broken, 'fakeapp', 'THE_VAR')).toThrow(
      /instance 'fakeapp' names unknown pack 'ghost'/,
    );
  });
});
