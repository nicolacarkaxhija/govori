import { describe, expect, it } from 'vitest';
import { govoriInstance } from './index.js';

// The parity gate (ADR 0013), parametrized over this instance's catalog
// set: every offered uiLanguage ships a complete, non-empty catalog.
describe('govori catalogs', () => {
  const anchorLanguage = govoriInstance.uiLanguages[0] ?? '';
  const anchor = govoriInstance.catalogs[anchorLanguage] ?? {};
  const anchorKeys = Object.keys(anchor).sort();

  it('ships a catalog for every offered ui language', () => {
    for (const language of govoriInstance.uiLanguages) {
      expect(govoriInstance.catalogs[language], language).toBeDefined();
    }
  });

  it('keeps every catalog key-complete against the anchor', () => {
    for (const language of govoriInstance.uiLanguages) {
      expect(
        Object.keys(govoriInstance.catalogs[language] ?? {}).sort(),
        language,
      ).toEqual(anchorKeys);
    }
  });

  it('keeps keys sorted for reviewable Weblate-friendly diffs', () => {
    for (const language of govoriInstance.uiLanguages) {
      const keys = Object.keys(govoriInstance.catalogs[language] ?? {});
      expect(keys, language).toEqual([...keys].sort());
    }
  });

  it('has no empty catalog value', () => {
    for (const language of govoriInstance.uiLanguages) {
      for (const [key, value] of Object.entries(
        govoriInstance.catalogs[language] ?? {},
      )) {
        expect(value.trim().length, `${language}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('declares one direction whose fallback rides the offered rosters', () => {
    expect(
      govoriInstance.directions.map((direction) => direction.packId),
    ).toEqual(['isv']);
    for (const direction of govoriInstance.directions) {
      expect(govoriInstance.uiLanguages).toContain(
        direction.fallbackTranslationLang,
      );
      expect(
        govoriInstance.learnLanguages.map((entry) => entry.code),
      ).toContain(direction.fallbackTranslationLang);
    }
  });
});
