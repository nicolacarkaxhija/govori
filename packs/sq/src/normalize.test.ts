import { describe, expect, it } from 'vitest';
import { normalize } from './orthography.js';

// normalize() folds any accepted way of typing an answer — the full
// standard orthography or its bare-ASCII approximation without ë/ç —
// into one comparable form, so learners are never punished for their
// keyboard (ADR 0003, tolerant answer checking).

describe('normalize', () => {
  it('equates full orthography and bare-ASCII approximations', () => {
    expect(normalize('pershendetje')).toBe(normalize('përshëndetje'));
    expect(normalize('cfare')).toBe(normalize('çfarë'));
    expect(normalize('faleminderit')).toBe(normalize('faleminderit'));
  });

  it('produces the exact folded form', () => {
    // Absolute expectations, so a broken pipeline cannot cancel itself out.
    expect(normalize('Përshëndetje')).toBe('pershendetje');
    expect(normalize('Çfarë')).toBe('cfare');
    expect(normalize('  Natën   e  mirë ')).toBe('naten e mire');
    expect(normalize('GJYSHE')).toBe('gjyshe');
  });

  it('folds decomposed diacritics like precomposed ones', () => {
    expect(normalize('përshëndetje')).toBe('pershendetje');
    expect(normalize('çaj')).toBe('caj');
  });

  it('is idempotent', () => {
    expect(normalize(normalize('Çfarë të re?'))).toBe(
      normalize('Çfarë të re?'),
    );
  });
});
