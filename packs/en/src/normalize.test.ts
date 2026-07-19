import { describe, expect, it } from 'vitest';
import { normalize } from './orthography.js';

// normalize() folds any accepted way of typing an answer — with or
// without apostrophes, stray accents, or ragged spacing — into one
// comparable form, so learners are never punished for their keyboard
// (ADR 0003, tolerant answer checking).

describe('normalize', () => {
  it('equates apostrophized and bare spellings', () => {
    expect(normalize('dont')).toBe(normalize("don't"));
    expect(normalize('it’s')).toBe(normalize('its'));
    expect(normalize('hello')).toBe(normalize('hello'));
  });

  it('produces the exact folded form', () => {
    // Absolute expectations, so a broken pipeline cannot cancel itself out.
    expect(normalize("Don't worry!")).toBe('dont worry');
    expect(normalize('Good  morning,  teacher')).toBe('good morning teacher');
    expect(normalize('  HELLO   there ')).toBe('hello there');
    expect(normalize('3 apples — 42%')).toBe('3 apples 42');
  });

  it('folds typed accents to their bare letters', () => {
    expect(normalize('café')).toBe('cafe');
    expect(normalize('naïve')).toBe('naive');
  });

  it('is idempotent', () => {
    expect(normalize(normalize("What's new?"))).toBe(normalize("What's new?"));
  });
});
