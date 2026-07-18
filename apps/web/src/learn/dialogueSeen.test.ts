import { beforeEach, describe, expect, it } from 'vitest';
import { hasSeenDialogue, markDialogueSeen } from './dialogueSeen';

const LESSON = '9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f';
const OTHER = '8b7c6d5e-4f3a-4b2c-9d1e-0f9a8b7c6d5e';

describe('dialogueSeen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts unseen and remembers a marked lesson', () => {
    expect(hasSeenDialogue(LESSON)).toBe(false);
    markDialogueSeen(LESSON);
    expect(hasSeenDialogue(LESSON)).toBe(true);
    expect(hasSeenDialogue(OTHER)).toBe(false);
  });

  it('marks idempotently', () => {
    markDialogueSeen(LESSON);
    markDialogueSeen(LESSON);
    expect(hasSeenDialogue(LESSON)).toBe(true);
  });

  it('survives corrupted storage by starting fresh', () => {
    localStorage.setItem('govori.dialogues-seen.v1', '{not json');
    expect(hasSeenDialogue(LESSON)).toBe(false);
    markDialogueSeen(LESSON);
    expect(hasSeenDialogue(LESSON)).toBe(true);
  });
});
