import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { isCanonical, normalize } from './orthography.js';

// Property tests: invariants that must hold for every representable input,
// not just curated examples.

const ALPHABET = [
  'abcdefghijklmnopqrstuvwxyz',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  " .,?!-'1230",
].join('');

const enChars = fc.constantFrom('th', 'sh', "n't", ...Array.from(ALPHABET));

const enText = fc.string({ unit: enChars, maxLength: 40 });

describe('orthography invariants', () => {
  it('normalize is idempotent', () => {
    fc.assert(
      fc.property(enText, (text) => {
        expect(normalize(normalize(text))).toBe(normalize(text));
      }),
    );
  });

  it('normalize leaves only bare lowercase letters, digits, spaces', () => {
    fc.assert(
      fc.property(enText, (text) => {
        const folded = normalize(text);
        expect(folded).toBe(folded.toLowerCase());
        expect(/^[a-z0-9 ]*$/.test(folded)).toBe(true);
        expect(folded.includes('  ')).toBe(false);
      }),
    );
  });

  it('normalize equates a text with its apostrophe-free approximation', () => {
    fc.assert(
      fc.property(enText, (text) => {
        const bare = text.replaceAll("'", '').replaceAll('’', '');
        expect(normalize(bare)).toBe(normalize(text));
      }),
    );
  });

  it('accepts every non-blank text drawn from the canonical set', () => {
    fc.assert(
      fc.property(enText, (text) => {
        expect(isCanonical(text)).toBe(text.trim().length > 0);
      }),
    );
  });
});
