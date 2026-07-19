import { describe, expect, it } from 'vitest';
import { isCanonical } from './orthography.js';

// Canonical item text is basic-Latin English: the 26 unaccented letters
// plus the apostrophe, whitespace, digits, and common punctuation.
// Loanword diacritics and non-Latin scripts are not canonical and must
// be rejected at the content schema seam.

describe('isCanonical', () => {
  it('accepts plain English text with apostrophes and punctuation', () => {
    expect(isCanonical('Good morning! How are you?')).toBe(true);
    expect(isCanonical("Don't worry — it's the teacher's book.")).toBe(true);
    expect(isCanonical('«I am not Andi» — 100%')).toBe(true);
    expect(isCanonical("S’pose so; that's fine…")).toBe(true);
    expect(isCanonical('„Hello" (and: 3 apples, 42%)')).toBe(true);
  });

  it('rejects accented loanword spellings', () => {
    expect(isCanonical('café')).toBe(false);
    expect(isCanonical('naïve')).toBe(false);
    expect(isCanonical('jalapeño')).toBe(false);
  });

  it('rejects letters outside the basic-Latin alphabet', () => {
    expect(isCanonical('përshëndetje')).toBe(false);
    expect(isCanonical('über')).toBe(false);
  });

  it('rejects non-Latin scripts', () => {
    expect(isCanonical('привет')).toBe(false);
  });

  it('rejects empty and whitespace-only text', () => {
    expect(isCanonical('')).toBe(false);
    expect(isCanonical('   ')).toBe(false);
  });
});
