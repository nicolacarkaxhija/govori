import { describe, expect, it } from 'vitest';
import type { LearnItem } from '../api/client';
import {
  buildAssembly,
  buildChoices,
  buildCloze,
  buildMatching,
  buildReverseChoices,
  checkTyped,
  planNextMode,
  translationFor,
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

describe('translationFor', () => {
  const czysta: LearnItem = {
    id: 'aaaaaaaa-0000-4000-8000-000000000011',
    kind: 'word',
    text: 'čista',
    translations: [
      { lang: 'en', text: 'clean' },
      { lang: 'pl', text: 'czysta' },
    ],
  };

  it('prefers the exact language match', () => {
    expect(translationFor(czysta, 'pl')).toBe('czysta');
    expect(translationFor(czysta, 'en')).toBe('clean');
  });

  it('falls back to English when the language is missing', () => {
    expect(translationFor(czysta, 'ru')).toBe('clean');
  });

  it('falls back to the first translation when English is missing too', () => {
    const noEnglish: LearnItem = {
      ...czysta,
      translations: [{ lang: 'pl', text: 'czysta' }],
    };
    expect(translationFor(noEnglish, 'ru')).toBe('czysta');
  });

  it('is empty for an item with no translations at all', () => {
    expect(translationFor({ ...czysta, translations: [] }, 'pl')).toBe('');
  });
});

const polishItems: LearnItem[] = [
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000021',
    kind: 'word',
    text: 'voda',
    translations: [
      { lang: 'en', text: 'water' },
      { lang: 'pl', text: 'woda' },
    ],
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000022',
    kind: 'word',
    text: 'hlěb',
    translations: [
      { lang: 'en', text: 'bread' },
      { lang: 'pl', text: 'chleb' },
    ],
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000023',
    kind: 'word',
    text: 'mlěko',
    translations: [{ lang: 'en', text: 'milk' }],
  },
];

describe('builders speak the learner language', () => {
  it('buildChoices offers translations in the chosen language', () => {
    const target = polishItems[0];
    if (target === undefined) throw new Error('fixture missing');
    const choices = buildChoices(target, polishItems, 3, 'pl', () => 0.5);
    expect(choices).toContain('woda');
    expect(choices).toContain('chleb');
    // Language gaps fall back to English rather than vanishing.
    expect(choices).toContain('milk');
  });

  it('buildMatching pairs words with the chosen language', () => {
    const pairs = buildMatching(polishItems, 3, 'pl', () => 0.1);
    const translations = pairs.map((pair) => pair.translation);
    expect(translations).toContain('woda');
    expect(translations).toContain('chleb');
    expect(translations).toContain('milk');
  });

  it('buildCloze carries the sentence translation in the chosen language', () => {
    const sentence: LearnItem = {
      id: 'aaaaaaaa-0000-4000-8000-000000000029',
      kind: 'sentence',
      text: 'Ja pijų vodų.',
      translations: [
        { lang: 'en', text: 'I drink water.' },
        { lang: 'pl', text: 'Piję wodę.' },
      ],
    };
    const cloze = buildCloze(sentence, polishItems, 'pl', () => 0);
    expect(cloze?.translation).toBe('Piję wodę.');
  });

  it('buildAssembly carries the sentence translation in the chosen language', () => {
    const sentence: LearnItem = {
      id: 'aaaaaaaa-0000-4000-8000-000000000030',
      kind: 'sentence',
      text: 'Voda je čista.',
      translations: [
        { lang: 'en', text: 'The water is clean.' },
        { lang: 'pl', text: 'Woda jest czysta.' },
      ],
    };
    const built = buildAssembly(sentence, 'pl', () => 0.9);
    expect(built?.translation).toBe('Woda jest czysta.');
  });
});

describe('buildChoices', () => {
  it('includes the correct translation plus unique distractors', () => {
    const target = items.find((i) => i.text === 'voda') ?? items[0];
    if (target === undefined) throw new Error('fixture missing');
    const choices = buildChoices(target, items, 4, 'en', () => 0.5);
    expect(choices).toHaveLength(4);
    expect(choices).toContain('water');
    expect(new Set(choices).size).toBe(4);
  });

  it('is deterministic for a fixed random source', () => {
    const target = items.find((i) => i.text === 'hlěb');
    if (target === undefined) throw new Error('fixture missing');
    const first = buildChoices(target, items, 3, 'en', () => 0.42);
    const second = buildChoices(target, items, 3, 'en', () => 0.42);
    expect(first).toEqual(second);
  });
});

describe('buildReverseChoices', () => {
  it('includes the target word plus unique Interslavic distractors', () => {
    const target = items.find((i) => i.text === 'voda');
    if (target === undefined) throw new Error('fixture missing');
    const choices = buildReverseChoices(target, items, 4, () => 0.5);
    expect(choices).toHaveLength(4);
    expect(choices).toContain('voda');
    expect(new Set(choices).size).toBe(4);
    const texts = items.map((item) => item.text);
    for (const choice of choices) {
      expect(texts).toContain(choice);
    }
  });

  it('is deterministic for a fixed random source', () => {
    const target = items.find((i) => i.text === 'hlěb');
    if (target === undefined) throw new Error('fixture missing');
    const first = buildReverseChoices(target, items, 3, () => 0.42);
    const second = buildReverseChoices(target, items, 3, () => 0.42);
    expect(first).toEqual(second);
  });

  it('caps at the distractors the pool can offer', () => {
    const target = items.find((i) => i.text === 'voda');
    if (target === undefined) throw new Error('fixture missing');
    expect(buildReverseChoices(target, [target], 4, () => 0.5)).toEqual([
      'voda',
    ]);
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
    const pairs = buildMatching(items, 3, 'en', () => 0.1);
    expect(pairs).toHaveLength(3);
    expect(new Set(pairs.map((pair) => pair.itemId)).size).toBe(3);
    for (const pair of pairs) {
      expect(pair.translation.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for a fixed random source', () => {
    expect(buildMatching(items, 4, 'en', () => 0.42)).toEqual(
      buildMatching(items, 4, 'en', () => 0.42),
    );
  });

  it('caps at the pool size', () => {
    expect(buildMatching(items.slice(0, 2), 4, 'en', () => 0.5)).toHaveLength(
      2,
    );
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
    const cloze = buildCloze(sentence, [vodaWord], 'en', () => 0);
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
    const first = buildCloze(sentence, [ja, vodaWord], 'en', () => 0);
    const last = buildCloze(sentence, [ja, vodaWord], 'en', () => 0.99);
    expect(first?.answer).toBe('Ja');
    expect(first?.itemId).toBe(ja.id);
    expect(last?.answer).toBe('vodų');
  });

  it('returns null when no pool word appears in the sentence', () => {
    expect(buildCloze(sentence, [hlebWord], 'en', () => 0)).toBeNull();
  });
});

describe('translated kinds render', () => {
  it('covers phrase and sentence kind labels', async () => {
    const { translate } = await import('../i18n');
    expect(translate('en', 'kindPhrase')).toBe('phrase');
    expect(translate('isv', 'kindSentence')).toBe('rěčenje');
  });
});

describe('buildAssembly', () => {
  const sentence: LearnItem = {
    id: 'cccccccc-0000-4000-8000-000000000009',
    kind: 'sentence',
    text: 'Voda je čista.',
    translations: [{ lang: 'en', text: 'The water is clean.' }],
  };

  it('shuffles the words away from the original order', () => {
    const built = buildAssembly(sentence, 'en', () => 0.9);
    expect(built).not.toBeNull();
    expect(built?.tokens.toSorted()).toEqual(
      ['Voda', 'je', 'čista.'].toSorted(),
    );
    expect(built?.tokens).not.toEqual(['Voda', 'je', 'čista.']);
    expect(built?.answer).toEqual(['Voda', 'je', 'čista.']);
  });

  it('refuses sentences too short to reorder', () => {
    expect(
      buildAssembly({ ...sentence, text: 'Dobry denj.' }, 'en', () => 0.5),
    ).toBeNull();
  });
});

describe('planNextMode', () => {
  const base = {
    poolSize: 3,
    hasCloze: true,
    hasAssembly: true,
    audioOn: false,
    sentenceRounds: 0,
    scriptRounds: 1,
  };

  it('walks recognition into production', () => {
    expect(planNextMode('choices', base)).toBe('typed');
  });

  it('adds matching only when the pool can fill a board', () => {
    expect(planNextMode('typed', { ...base, poolSize: 4 })).toBe('matching');
    expect(planNextMode('typed', base)).toBe('cloze');
  });

  it('alternates cloze and assembly across sentence rounds', () => {
    expect(planNextMode('matching', base)).toBe('cloze');
    expect(planNextMode('matching', { ...base, sentenceRounds: 1 })).toBe(
      'assembly',
    );
    expect(
      planNextMode('matching', {
        ...base,
        sentenceRounds: 1,
        hasAssembly: false,
      }),
    ).toBe('cloze');
    expect(planNextMode('matching', { ...base, hasCloze: false })).toBe(
      'assembly',
    );
  });

  it('turns the direction around after the sentence round', () => {
    expect(planNextMode('cloze', base)).toBe('reverseChoices');
    expect(planNextMode('assembly', base)).toBe('reverseChoices');
    expect(planNextMode('reverseChoices', base)).toBe('reverseTyped');
    expect(planNextMode('reverseTyped', base)).toBe('choices');
  });

  it('goes reverse straight away when sentences run dry', () => {
    const dry = { ...base, hasCloze: false, hasAssembly: false };
    expect(planNextMode('typed', dry)).toBe('reverseChoices');
    expect(planNextMode('matching', dry)).toBe('reverseChoices');
  });

  it('deals one script round after the first sentence round', () => {
    expect(planNextMode('cloze', { ...base, scriptRounds: 0 })).toBe('script');
    expect(planNextMode('assembly', { ...base, scriptRounds: 0 })).toBe(
      'script',
    );
    expect(planNextMode('cloze', base)).toBe('reverseChoices');
    expect(planNextMode('script', base)).toBe('reverseChoices');
    expect(planNextMode('script', { ...base, audioOn: true })).toBe(
      'listening',
    );
  });

  it('slots listening before the reverse pass when audio is live', () => {
    const dry = { ...base, hasCloze: false, hasAssembly: false };
    expect(planNextMode('typed', { ...dry, audioOn: true })).toBe('listening');
    expect(planNextMode('cloze', { ...base, audioOn: true })).toBe('listening');
    expect(planNextMode('assembly', { ...base, audioOn: true })).toBe(
      'listening',
    );
    expect(planNextMode('listening', { ...base, audioOn: true })).toBe(
      'reverseChoices',
    );
  });
});
