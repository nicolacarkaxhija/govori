import { describe, expect, it } from 'vitest';
import { speakerPseudonym } from './speaker-pseudonym.js';

describe('speakerPseudonym', () => {
  it('is stable for the same user', () => {
    expect(speakerPseudonym('user-1')).toBe(speakerPseudonym('user-1'));
  });

  it('differs between users', () => {
    expect(speakerPseudonym('user-1')).not.toBe(speakerPseudonym('user-2'));
  });

  it('never leaks the user id it derives from', () => {
    const id = 'user-1';
    const pseudonym = speakerPseudonym(id);
    expect(pseudonym).not.toBe(id);
    expect(pseudonym).not.toContain(id);
  });
});
