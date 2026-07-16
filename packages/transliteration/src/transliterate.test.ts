import { describe, expect, it } from 'vitest';
import { transliterate } from './index.js';

// Expected values are taken from the official Interslavic orthography
// correspondence tables (interslavic.fun/learn/orthography), not computed.

describe('transliterate to Cyrillic', () => {
  it('maps single standard Latin letters', () => {
    expect(transliterate('dom', { script: 'cyrillic' })).toBe('дом');
  });

  it('maps the digraphs lj and nj to single Cyrillic letters', () => {
    expect(transliterate('ljubov', { script: 'cyrillic' })).toBe('љубов');
    expect(transliterate('njega', { script: 'cyrillic' })).toBe('њега');
  });

  it('preserves letter case, including cased digraphs', () => {
    expect(transliterate('Dom', { script: 'cyrillic' })).toBe('Дом');
    expect(transliterate('Ljubov', { script: 'cyrillic' })).toBe('Љубов');
    expect(transliterate('LJUBOV', { script: 'cyrillic' })).toBe('ЉУБОВ');
  });
});

describe('etymological orthography folds to standard', () => {
  it('folds etymological letters when targeting standard Latin', () => {
    expect(transliterate('męso', { script: 'latin' })).toBe('meso');
    expect(transliterate('sųd', { script: 'latin' })).toBe('sud');
    expect(transliterate('råzum', { script: 'latin' })).toBe('razum');
    expect(transliterate('đ', { script: 'latin' })).toBe('dž');
    expect(transliterate('ćuťś', { script: 'latin' })).toBe('čuts');
  });

  it('folds before mapping when targeting Cyrillic', () => {
    expect(transliterate('męso', { script: 'cyrillic' })).toBe('месо');
  });

  it('keeps standard letters intact when targeting standard Latin', () => {
    expect(transliterate('sěver čita žabu', { script: 'latin' })).toBe(
      'sěver čita žabu',
    );
  });
});

describe('non-alphabet characters', () => {
  it('passes whitespace, punctuation, and digits through unchanged', () => {
    expect(transliterate('Kako se maješ? 100%', { script: 'cyrillic' })).toBe(
      'Како се мајеш? 100%',
    );
  });
});
