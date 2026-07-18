import { describe, expect, it } from 'vitest';
import {
  hasScriptChoice,
  nextScript,
  renderIn,
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
