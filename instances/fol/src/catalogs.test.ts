import { describe, expect, it } from 'vitest';
import { folInstance } from './index.js';

// The parity gate (ADR 0013), parametrized over this instance's catalog
// set: every offered uiLanguage ships a complete, non-empty catalog.
describe('fol catalogs', () => {
  const anchorLanguage = folInstance.uiLanguages[0] ?? '';
  const anchor = folInstance.catalogs[anchorLanguage] ?? {};
  const anchorKeys = Object.keys(anchor).sort();

  it('offers all five ui languages, english first', () => {
    expect(folInstance.uiLanguages).toEqual(['en', 'sq', 'de', 'it', 'tr']);
  });

  it('ships a catalog for every offered ui language', () => {
    for (const language of folInstance.uiLanguages) {
      expect(folInstance.catalogs[language], language).toBeDefined();
    }
  });

  it('keeps every catalog key-complete against the anchor', () => {
    for (const language of folInstance.uiLanguages) {
      expect(
        Object.keys(folInstance.catalogs[language] ?? {}).sort(),
        language,
      ).toEqual(anchorKeys);
    }
  });

  it('keeps keys sorted for reviewable Weblate-friendly diffs', () => {
    for (const language of folInstance.uiLanguages) {
      const keys = Object.keys(folInstance.catalogs[language] ?? {});
      expect(keys, language).toEqual([...keys].sort());
    }
  });

  it('has no empty catalog value', () => {
    for (const language of folInstance.uiLanguages) {
      for (const [key, value] of Object.entries(
        folInstance.catalogs[language] ?? {},
      )) {
        expect(value.trim().length, `${language}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('declares both directions whose fallbacks ride the offered rosters', () => {
    // Albanian first (the product's primary), English for Albanian
    // speakers beside it (ADR 0046).
    expect(folInstance.directions.map((direction) => direction.packId)).toEqual(
      ['sq', 'en'],
    );
    expect(
      folInstance.directions.map(
        (direction) => direction.fallbackTranslationLang,
      ),
    ).toEqual(['en', 'sq']);
    expect(folInstance.directions.map((direction) => direction.label)).toEqual([
      'Shqip',
      'English',
    ]);
    for (const direction of folInstance.directions) {
      expect(folInstance.uiLanguages).toContain(
        direction.fallbackTranslationLang,
      );
      expect(folInstance.learnLanguages.map((entry) => entry.code)).toContain(
        direction.fallbackTranslationLang,
      );
    }
  });
});
