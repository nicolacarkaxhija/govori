import { describe, expect, it } from 'vitest';
import type { LearnItem } from '../api/client';
import {
  buildChoices,
  buildCloze,
  buildMatching,
  checkTyped,
} from './exercises';

const items: LearnItem[] = [
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    kind: 'word',
    text: 'voda',
    translations: [{ lang: 'en', text: 'water' }],
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000002',
    kind: 'word',
    text: 'hlěb',
    translations: [{ lang: 'en', text: 'bread' }],
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000003',
    kind: 'word',
    text: 'mlěko',
    translations: [{ lang: 'en', text: 'milk' }],
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000004',
    kind: 'word',
    text: 'sųd',
    translations: [{ lang: 'en', text: 'court' }],
  },
];

describe('buildChoices', () => {
  it('includes the correct translation plus unique distractors', () => {
    const target = items.find((i) => i.text === 'voda') ?? items[0];
    if (target === undefined) throw new Error('fixture missing');
    const choices = buildChoices(target, items, 4, () => 0.5);
    expect(choices).toHaveLength(4);
    expect(choices).toContain('water');
    expect(new Set(choices).size).toBe(4);
  });

  it('is deterministic for a fixed random source', () => {
    const target = items.find((i) => i.text === 'hlěb');
    if (target === undefined) throw new Error('fixture missing');
    const first = buildChoices(target, items, 3, () => 0.42);
    const second = buildChoices(target, items, 3, () => 0.42);
    expect(first).toEqual(second);
  });
});

describe('checkTyped', () => {
  it('accepts tolerant spellings across scripts and diacritics', () => {
    expect(checkTyped('hlěb', 'hleb')).toBe(true);
    expect(checkTyped('hlěb', 'хлєб')).toBe(true);
    expect(checkTyped('hlěb', '  HLEB ')).toBe(true);
    expect(checkTyped('sųd', 'sud')).toBe(true);
  });

  it('rejects genuinely wrong answers', () => {
    expect(checkTyped('hlěb', 'voda')).toBe(false);
    expect(checkTyped('hlěb', '')).toBe(false);
  });
});

describe('buildMatching', () => {
  it('picks distinct items with their translations', () => {
    const pairs = buildMatching(items, 3, () => 0.1);
    expect(pairs).toHaveLength(3);
    expect(new Set(pairs.map((pair) => pair.itemId)).size).toBe(3);
    for (const pair of pairs) {
      expect(pair.translation.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for a fixed random source', () => {
    expect(buildMatching(items, 4, () => 0.42)).toEqual(
      buildMatching(items, 4, () => 0.42),
    );
  });

  it('caps at the pool size', () => {
    expect(buildMatching(items.slice(0, 2), 4, () => 0.5)).toHaveLength(2);
  });
});

describe('buildCloze', () => {
  const vodaWord: LearnItem = {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    kind: 'word',
    text: 'voda',
    translations: [{ lang: 'en', text: 'water' }],
  };
  const hlebWord: LearnItem = {
    id: 'aaaaaaaa-0000-4000-8000-000000000002',
    kind: 'word',
    text: 'hlěb',
    translations: [{ lang: 'en', text: 'bread' }],
  };
  const sentence: LearnItem = {
    id: 'aaaaaaaa-0000-4000-8000-000000000009',
    kind: 'sentence',
    text: 'Ja pijų vodų every dėnj.',
    translations: [{ lang: 'en', text: 'I drink water every day.' }],
  };

  it('blanks a token that matches a pool word, tolerantly', () => {
    const cloze = buildCloze(sentence, [vodaWord], () => 0);
    expect(cloze).toEqual({
      itemId: vodaWord.id,
      before: 'Ja pijų ',
      answer: 'vodų',
      after: ' every dėnj.',
      translation: 'I drink water every day.',
    });
  });

  it('picks deterministically among several matches', () => {
    const ja: LearnItem = {
      id: 'aaaaaaaa-0000-4000-8000-000000000008',
      kind: 'word',
      text: 'ja',
      translations: [{ lang: 'en', text: 'I' }],
    };
    const first = buildCloze(sentence, [ja, vodaWord], () => 0);
    const last = buildCloze(sentence, [ja, vodaWord], () => 0.99);
    expect(first?.answer).toBe('Ja');
    expect(first?.itemId).toBe(ja.id);
    expect(last?.answer).toBe('vodų');
  });

  it('returns null when no pool word appears in the sentence', () => {
    expect(buildCloze(sentence, [hlebWord], () => 0)).toBeNull();
  });
});
