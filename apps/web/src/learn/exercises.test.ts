import { describe, expect, it } from 'vitest';
import type { LearnItem } from '../api/client';
import { activePack } from '../instance';
import {
  buildAssembly,
  buildChoices,
  buildCloze,
  buildMatching,
  buildProduction,
  buildReverseChoices,
  checkProduction,
  checkTyped,
  excludeBronzeDistractors,
  planNextMode,
  scrambleOrder,
  translationFor,
} from './exercises';

// The suite runs a govori build, whose sole direction's pack is stable.
const pack = activePack();

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
    expect(translationFor(czysta, 'pl', 'en')).toBe('czysta');
    expect(translationFor(czysta, 'en', 'en')).toBe('clean');
  });

  it('falls back to the given fallback language when missing', () => {
    expect(translationFor(czysta, 'ru', 'en')).toBe('clean');
  });

  it('falls back to the first translation when the fallback misses too', () => {
    const noEnglish: LearnItem = {
      ...czysta,
      translations: [{ lang: 'pl', text: 'czysta' }],
    };
    expect(translationFor(noEnglish, 'ru', 'en')).toBe('czysta');
  });

  it('is empty for an item with no translations at all', () => {
    expect(translationFor({ ...czysta, translations: [] }, 'pl', 'en')).toBe(
      '',
    );
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
    const choices = buildChoices(target, polishItems, 3, 'pl', 'en', () => 0.5);
    expect(choices).toContain('woda');
    expect(choices).toContain('chleb');
    // Language gaps fall back to English rather than vanishing.
    expect(choices).toContain('milk');
  });

  it('buildMatching pairs words with the chosen language', () => {
    const pairs = buildMatching(polishItems, 3, 'pl', 'en', () => 0.1);
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
    const cloze = buildCloze(pack, sentence, polishItems, 'pl', 'en', () => 0);
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
    const built = buildAssembly(sentence, 'pl', 'en', () => 0.9);
    expect(built?.translation).toBe('Woda jest czysta.');
  });
});

describe('buildChoices', () => {
  it('includes the correct translation plus unique distractors', () => {
    const target = items.find((i) => i.text === 'voda') ?? items[0];
    if (target === undefined) throw new Error('fixture missing');
    const choices = buildChoices(target, items, 4, 'en', 'en', () => 0.5);
    expect(choices).toHaveLength(4);
    expect(choices).toContain('water');
    expect(new Set(choices).size).toBe(4);
  });

  it('is deterministic for a fixed random source', () => {
    const target = items.find((i) => i.text === 'hlěb');
    if (target === undefined) throw new Error('fixture missing');
    const first = buildChoices(target, items, 3, 'en', 'en', () => 0.42);
    const second = buildChoices(target, items, 3, 'en', 'en', () => 0.42);
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

describe('data-quality gating (ADR 0051)', () => {
  const gold: LearnItem = {
    id: 'aaaaaaaa-0000-4000-8000-0000000000a1',
    kind: 'word',
    text: 'voda',
    translations: [{ lang: 'en', text: 'water' }],
    attestation: 'gold',
  };
  const silver: LearnItem = {
    id: 'aaaaaaaa-0000-4000-8000-0000000000a2',
    kind: 'word',
    text: 'hlěb',
    translations: [{ lang: 'en', text: 'bread' }],
    attestation: 'silver',
  };
  const bronze: LearnItem = {
    id: 'aaaaaaaa-0000-4000-8000-0000000000a3',
    kind: 'word',
    text: 'mlěko',
    translations: [{ lang: 'en', text: 'milk' }],
    attestation: 'bronze',
  };
  const untiered: LearnItem = {
    id: 'aaaaaaaa-0000-4000-8000-0000000000a4',
    kind: 'word',
    text: 'sųd',
    translations: [{ lang: 'en', text: 'court' }],
  };

  describe('excludeBronzeDistractors', () => {
    it('drops bronze items but keeps gold, silver, and untiered ones', () => {
      expect(
        excludeBronzeDistractors([gold, silver, bronze, untiered]),
      ).toEqual([gold, silver, untiered]);
    });

    it('keeps a bronze target while still dropping other bronze items', () => {
      const otherBronze: LearnItem = {
        id: 'aaaaaaaa-0000-4000-8000-0000000000a5',
        kind: 'word',
        text: 's150',
        translations: [{ lang: 'en', text: 'window' }],
        attestation: 'bronze',
      };
      expect(excludeBronzeDistractors([bronze, otherBronze], bronze)).toEqual([
        bronze,
      ]);
    });
  });

  describe('buildChoices', () => {
    it('never offers a bronze translation as a distractor', () => {
      // Bronze is the only other pool item, so the round falls back to a
      // single choice rather than surfacing the low-confidence gloss.
      const choices = buildChoices(
        gold,
        [gold, bronze],
        4,
        'en',
        'en',
        () => 0.5,
      );
      expect(choices).toEqual(['water']);
      expect(choices).not.toContain('milk');
    });

    it('still draws gold and silver distractors', () => {
      const choices = buildChoices(
        untiered,
        [untiered, gold, silver],
        4,
        'en',
        'en',
        () => 0.5,
      );
      expect(choices).toContain('water');
      expect(choices).toContain('bread');
    });

    it('still draws untiered distractors (undefined is neutral)', () => {
      const choices = buildChoices(
        gold,
        [gold, untiered],
        4,
        'en',
        'en',
        () => 0.5,
      );
      expect(choices).toContain('court');
    });

    it('offers a bronze target its own correct answer', () => {
      const choices = buildChoices(
        bronze,
        [bronze, gold],
        4,
        'en',
        'en',
        () => 0.5,
      );
      expect(choices).toContain('milk');
    });
  });

  describe('buildReverseChoices', () => {
    it('never offers a bronze word as a distractor', () => {
      const choices = buildReverseChoices(gold, [gold, bronze], 4, () => 0.5);
      expect(choices).toEqual(['voda']);
      expect(choices).not.toContain('mlěko');
    });

    it('still draws gold and silver distractors', () => {
      const choices = buildReverseChoices(
        untiered,
        [untiered, gold, silver],
        4,
        () => 0.5,
      );
      expect(choices).toContain('voda');
      expect(choices).toContain('hlěb');
    });
  });

  describe('buildMatching', () => {
    it('never seats a bronze item on the board', () => {
      const pairs = buildMatching(
        [gold, silver, bronze],
        3,
        'en',
        'en',
        () => 0.1,
      );
      expect(pairs.map((pair) => pair.itemId)).not.toContain(bronze.id);
      expect(pairs.map((pair) => pair.target)).not.toContain('mlěko');
    });

    it('caps at the non-bronze items when bronze is the only filler', () => {
      const pairs = buildMatching([gold, bronze], 4, 'en', 'en', () => 0.5);
      expect(pairs).toHaveLength(1);
      expect(pairs[0]?.itemId).toBe(gold.id);
    });
  });
});

describe('checkTyped', () => {
  it('accepts tolerant spellings across scripts and diacritics', () => {
    expect(checkTyped(pack.normalize, 'hlěb', 'hleb')).toBe(true);
    expect(checkTyped(pack.normalize, 'hlěb', 'хлєб')).toBe(true);
    expect(checkTyped(pack.normalize, 'hlěb', '  HLEB ')).toBe(true);
    expect(checkTyped(pack.normalize, 'sųd', 'sud')).toBe(true);
  });

  it('rejects genuinely wrong answers', () => {
    expect(checkTyped(pack.normalize, 'hlěb', 'voda')).toBe(false);
    expect(checkTyped(pack.normalize, 'hlěb', '')).toBe(false);
  });
});

describe('buildMatching', () => {
  it('picks distinct items with their translations', () => {
    const pairs = buildMatching(items, 3, 'en', 'en', () => 0.1);
    expect(pairs).toHaveLength(3);
    expect(new Set(pairs.map((pair) => pair.itemId)).size).toBe(3);
    for (const pair of pairs) {
      expect(pair.translation.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for a fixed random source', () => {
    expect(buildMatching(items, 4, 'en', 'en', () => 0.42)).toEqual(
      buildMatching(items, 4, 'en', 'en', () => 0.42),
    );
  });

  it('caps at the pool size', () => {
    expect(
      buildMatching(items.slice(0, 2), 4, 'en', 'en', () => 0.5),
    ).toHaveLength(2);
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
    const cloze = buildCloze(pack, sentence, [vodaWord], 'en', 'en', () => 0);
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
    const first = buildCloze(
      pack,
      sentence,
      [ja, vodaWord],
      'en',
      'en',
      () => 0,
    );
    const last = buildCloze(
      pack,
      sentence,
      [ja, vodaWord],
      'en',
      'en',
      () => 0.99,
    );
    expect(first?.answer).toBe('Ja');
    expect(first?.itemId).toBe(ja.id);
    expect(last?.answer).toBe('vodų');
  });

  it('returns null when no pool word appears in the sentence', () => {
    expect(
      buildCloze(pack, sentence, [hlebWord], 'en', 'en', () => 0),
    ).toBeNull();
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
    const built = buildAssembly(sentence, 'en', 'en', () => 0.9);
    expect(built).not.toBeNull();
    expect(built?.tokens.toSorted()).toEqual(
      ['Voda', 'je', 'čista.'].toSorted(),
    );
    expect(built?.tokens).not.toEqual(['Voda', 'je', 'čista.']);
    expect(built?.answer).toEqual(['Voda', 'je', 'čista.']);
  });

  it('refuses sentences too short to reorder', () => {
    expect(
      buildAssembly(
        { ...sentence, text: 'Dobry denj.' },
        'en',
        'en',
        () => 0.5,
      ),
    ).toBeNull();
  });
});

describe('scrambleOrder', () => {
  it('permutes every index and never starts solved', () => {
    for (const seed of [0.1, 0.35, 0.5, 0.75, 0.9]) {
      const order = scrambleOrder(4, () => seed);
      expect(order.toSorted((a, b) => a - b)).toEqual([0, 1, 2, 3]);
      expect(order).not.toEqual([0, 1, 2, 3]);
    }
  });

  it('is deterministic for a fixed random source', () => {
    expect(scrambleOrder(5, () => 0.42)).toEqual(scrambleOrder(5, () => 0.42));
  });

  it('handles the degenerate sizes', () => {
    expect(scrambleOrder(0, () => 0.5)).toEqual([]);
    expect(scrambleOrder(1, () => 0.5)).toEqual([0]);
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
    scriptCount: 2,
    morphologyRounds: 0,
    productionRounds: 1,
    hasProduction: false,
  };

  it('never deals a script round when the pack has a single script', () => {
    const modes = [
      'choices',
      'typed',
      'matching',
      'cloze',
      'assembly',
      'listening',
      'reverseChoices',
      'reverseTyped',
      'script',
      'morphology',
    ] as const;
    for (const mode of modes) {
      for (const scriptRounds of [0, 1]) {
        expect(
          planNextMode(mode, { ...base, scriptRounds, scriptCount: 1 }),
        ).not.toBe('script');
      }
    }
  });

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
    expect(planNextMode('reverseTyped', base)).toBe('morphology');
    expect(planNextMode('reverseTyped', { ...base, morphologyRounds: 1 })).toBe(
      'choices',
    );
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

describe('planNextMode morphology round', () => {
  const base = {
    poolSize: 3,
    hasCloze: false,
    hasAssembly: false,
    audioOn: false,
    sentenceRounds: 0,
    scriptRounds: 1,
    scriptCount: 2,
    morphologyRounds: 0,
    productionRounds: 1,
    hasProduction: false,
  };

  it('slots one morphology round after the reverse pass', () => {
    expect(planNextMode('reverseTyped', base)).toBe('morphology');
    expect(planNextMode('reverseTyped', { ...base, morphologyRounds: 1 })).toBe(
      'choices',
    );
    expect(planNextMode('morphology', base)).toBe('choices');
  });
});

describe('planNextMode production round', () => {
  const base = {
    poolSize: 3,
    hasCloze: false,
    hasAssembly: false,
    audioOn: false,
    sentenceRounds: 0,
    scriptRounds: 1,
    scriptCount: 2,
    morphologyRounds: 1,
    productionRounds: 0,
    hasProduction: true,
  };

  it('slots one production round after morphology when the pool allows', () => {
    expect(planNextMode('morphology', base)).toBe('production');
    expect(planNextMode('morphology', { ...base, hasProduction: false })).toBe(
      'choices',
    );
    expect(planNextMode('morphology', { ...base, productionRounds: 1 })).toBe(
      'choices',
    );
  });

  it('reaches production straight from the reverse pass once morphology is spent', () => {
    expect(planNextMode('reverseTyped', base)).toBe('production');
    expect(planNextMode('reverseTyped', { ...base, morphologyRounds: 0 })).toBe(
      'morphology',
    );
  });

  it('returns to recognition after the production round', () => {
    expect(planNextMode('production', base)).toBe('choices');
  });
});

describe('buildProduction', () => {
  it('picks three due words when the pool is rich enough', () => {
    const built = buildProduction(items, 'en', 'en', () => 0);
    expect(built).not.toBeNull();
    expect(built?.words).toHaveLength(3);
    expect(built?.words[0]?.translation.length).toBeGreaterThan(0);
  });

  it('picks two words from a two-word pool', () => {
    const built = buildProduction(items.slice(0, 2), 'en', 'en', () => 0);
    expect(built?.words).toHaveLength(2);
  });

  it('returns null when the pool cannot spare two words', () => {
    expect(buildProduction(items.slice(0, 1), 'en', 'en')).toBeNull();
  });
});

describe('checkProduction', () => {
  const words = [
    { itemId: '1', text: 'voda', translation: 'water' },
    { itemId: '2', text: 'hlěb', translation: 'bread' },
  ];

  it('passes canonical text that uses every prompted word', () => {
    expect(checkProduction(pack, 'voda i hlěb', words)).toBe(true);
  });

  it('matches inflected forms by stem', () => {
    expect(checkProduction(pack, 'vodou s hlěbom', words)).toBe(true);
  });

  it('fails when a prompted word is missing', () => {
    expect(checkProduction(pack, 'voda', words)).toBe(false);
  });

  it('fails non-canonical text before checking words', () => {
    expect(checkProduction(pack, 'вода и хлеб', words)).toBe(false);
  });

  it('fails empty input', () => {
    expect(checkProduction(pack, '   ', words)).toBe(false);
  });
});
