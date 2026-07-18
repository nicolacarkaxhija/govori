import { describe, expect, it } from 'vitest';
import { isCanonical } from './transliteration.js';

// Canonical item text is etymological Latin (ADR 0003): standard +
// etymological letters, combining-acute d́/t́, whitespace, digits, and
// common punctuation. Anything else — Cyrillic, foreign letters — is not
// canonical and must be rejected at the content schema seam.

describe('isCanonical', () => {
  it('accepts etymological Latin text with punctuation', () => {
    expect(isCanonical('Na vȯzvyšenosti ovca, ktora ne iměla vȯlnų!')).toBe(
      true,
    );
    expect(isCanonical('T́ma, i korenje revenja počęli råsteńje…')).toBe(true);
    expect(isCanonical('«Boli mně sŕdce» — 100%')).toBe(true);
  });

  it('rejects Cyrillic text', () => {
    expect(isCanonical('коњ')).toBe(false);
  });

  it('rejects letters outside the Interslavic alphabet', () => {
    expect(isCanonical('quick')).toBe(false);
    expect(isCanonical('www')).toBe(false);
    expect(isCanonical('taxi')).toBe(false);
  });

  it('rejects empty and whitespace-only text', () => {
    expect(isCanonical('')).toBe(false);
    expect(isCanonical('   ')).toBe(false);
  });
});
