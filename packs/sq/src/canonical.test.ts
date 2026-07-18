import { describe, expect, it } from 'vitest';
import { isCanonical } from './orthography.js';

// Canonical item text is standard Albanian (drejtshkrimi i shqipes
// standarde): the 36-letter alphabet — whose 9 digraphs are combinations
// of the 27 single characters, so a character-class check suffices —
// plus whitespace, digits, and common punctuation. Gheg-only spellings
// (â, û) and foreign letters (w) are not canonical and must be rejected
// at the content schema seam.

describe('isCanonical', () => {
  it('accepts standard Albanian text with digraphs and punctuation', () => {
    expect(isCanonical('Përshëndetje! Si jeni?')).toBe(true);
    expect(
      isCanonical('Natën e mirë, gjyshe — gjithçka është në rregull.'),
    ).toBe(true);
    expect(isCanonical('«Nuk quhem Andi» — 100%')).toBe(true);
    expect(isCanonical("S’ka problem; s'ka gjë…")).toBe(true);
    expect(isCanonical('„Mirëdita" (dhe: xham, zhurmë, thikë, çaj)')).toBe(
      true,
    );
  });

  it('rejects Gheg-only accented vowels', () => {
    expect(isCanonical('nâna')).toBe(false);
    expect(isCanonical('me punue â')).toBe(false);
  });

  it('rejects letters outside the Albanian alphabet', () => {
    expect(isCanonical('watt')).toBe(false);
    expect(isCanonical('über')).toBe(false);
    expect(isCanonical('naïve')).toBe(false);
  });

  it('rejects non-Latin scripts', () => {
    expect(isCanonical('шчипе')).toBe(false);
  });

  it('rejects empty and whitespace-only text', () => {
    expect(isCanonical('')).toBe(false);
    expect(isCanonical('   ')).toBe(false);
  });
});
