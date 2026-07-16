import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { normalize, transliterate } from './index.js';

// Property tests: invariants that must hold for every representable input,
// not just curated examples.

const ALPHABET = [
  'abcčdeěfghijklmnoprsštuvyzž',
  'åȯęųćđĺńŕśźťď',
  'ABCČDEĚLNSŽ',
  'аеєжљњчшы',
  ' .,?!-1230',
].join('');

const isvChars = fc.constantFrom('lj', 'nj', ...Array.from(ALPHABET));

const isvText = fc.string({ unit: isvChars, maxLength: 40 });

describe('transliteration invariants', () => {
  it('script conversion never changes the normalized meaning', () => {
    fc.assert(
      fc.property(isvText, (text) => {
        expect(normalize(transliterate(text, { script: 'cyrillic' }))).toBe(
          normalize(text),
        );
      }),
    );
  });

  it('folding to standard Latin is idempotent', () => {
    fc.assert(
      fc.property(isvText, (text) => {
        const once = transliterate(text, { script: 'latin' });
        expect(transliterate(once, { script: 'latin' })).toBe(once);
      }),
    );
  });

  it('normalize is idempotent', () => {
    fc.assert(
      fc.property(isvText, (text) => {
        expect(normalize(normalize(text))).toBe(normalize(text));
      }),
    );
  });

  it('transliterating to Cyrillic twice equals once', () => {
    fc.assert(
      fc.property(isvText, (text) => {
        const once = transliterate(text, { script: 'cyrillic' });
        expect(transliterate(once, { script: 'cyrillic' })).toBe(once);
      }),
    );
  });
});
