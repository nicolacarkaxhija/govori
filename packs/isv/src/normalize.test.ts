import { describe, expect, it } from 'vitest';
import { normalize } from './transliteration.js';

// normalize() folds any accepted way of writing an answer — Cyrillic,
// etymological Latin, standard Latin, or bare-ASCII approximations —
// into one comparable form, so learners are never punished for their
// keyboard (ADR 0003, tolerant answer checking).

describe('normalize', () => {
  it('equates Cyrillic and Latin spellings', () => {
    expect(normalize('коњ')).toBe(normalize('konj'));
    expect(normalize('Чловєк')).toBe(normalize('člověk'));
  });

  it('equates etymological and standard spellings', () => {
    expect(normalize('męso')).toBe(normalize('meso'));
    expect(normalize('vȯlnų')).toBe(normalize('volnu'));
  });

  it('accepts bare-ASCII approximations of diacritics', () => {
    expect(normalize('češka')).toBe(normalize('ceska'));
    expect(normalize('mudrějši')).toBe(normalize('mudrejsi'));
  });

  it('produces the exact folded form', () => {
    // Absolute expectations, so a broken pipeline cannot cancel itself out.
    expect(normalize('  Kako   se maješ ')).toBe('kako se majes');
    expect(normalize('Čĺovêk')).toBe('clovek');
    expect(normalize('КОЊ')).toBe('konj');
    expect(normalize('vȯlnų')).toBe('volnu');
  });

  it('is idempotent', () => {
    expect(normalize(normalize('Čĺovêk коњ'))).toBe(normalize('Čĺovêk коњ'));
  });
});
