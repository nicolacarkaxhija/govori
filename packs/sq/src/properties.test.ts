import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { isCanonical, normalize } from './orthography.js';

// Property tests: invariants that must hold for every representable input,
// not just curated examples.

const ALPHABET = [
  'abcçdeëfghijklmnopqrstuvxyz',
  'ABCÇDEËGJLLNJRRSHTHXH',
  ' .,?!-1230',
].join('');

const sqChars = fc.constantFrom('gj', 'sh', 'të', ...Array.from(ALPHABET));

const sqText = fc.string({ unit: sqChars, maxLength: 40 });

describe('orthography invariants', () => {
  it('normalize is idempotent', () => {
    fc.assert(
      fc.property(sqText, (text) => {
        expect(normalize(normalize(text))).toBe(normalize(text));
      }),
    );
  });

  it('normalize never leaves a diacritic or an uppercase letter', () => {
    fc.assert(
      fc.property(sqText, (text) => {
        const folded = normalize(text);
        expect(folded).toBe(folded.toLowerCase());
        expect(folded.includes('ë')).toBe(false);
        expect(folded.includes('ç')).toBe(false);
      }),
    );
  });

  it('normalize equates a text with its ascii approximation', () => {
    fc.assert(
      fc.property(sqText, (text) => {
        const ascii = text.replaceAll('ë', 'e').replaceAll('ç', 'c');
        expect(normalize(ascii)).toBe(normalize(text));
      }),
    );
  });

  it('accepts every non-blank text drawn from the canonical set', () => {
    fc.assert(
      fc.property(sqText, (text) => {
        expect(isCanonical(text)).toBe(text.trim().length > 0);
      }),
    );
  });
});
