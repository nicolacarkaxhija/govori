import type { InstanceConfig } from '@glotty/language';
import { en } from './catalogs/en.js';
import { isv } from './catalogs/isv.js';

/**
 * The English catalog is the developer-authored key inventory: it anchors
 * the MessageKey type at build time. That is a developer artifact, not a
 * runtime preference — at runtime the engine falls back to this
 * instance's first uiLanguage, whatever it is.
 */
export type MessageKey = keyof typeof en;

/**
 * The Govori instance (ADR 0029/0031): working brand for the Interslavic
 * product. Everything the engine must never hardcode — branding, catalog
 * set, learner-language roster, fallback language — lives here.
 */
export const govoriInstance: InstanceConfig = {
  id: 'govori',
  brand: {
    shortName: 'Govori',
    fullName: 'Govori — Interslavic Learning App',
    description:
      'Learn Interslavic (medžuslovjansky) free: a community-driven course with real dictionary vocabulary, spaced repetition, and Latin or Cyrillic script.',
  },
  /**
   * A single-direction product by declaration (ADR 0046): Govori
   * teaches Interslavic, full stop. The engine resolves this direction
   * totally, so no switcher ever renders.
   */
  directions: [
    {
      id: 'isv',
      packId: 'isv',
      label: 'Medžuslovjansky',
      fallbackTranslationLang: 'en',
      /** A small, close-knit community: three net upvotes publish (ADR 0040). */
      communityPublishNetVotes: 3,
    },
  ],
  uiLanguages: ['en', 'isv'],
  /**
   * Curated learner languages (L1): the most common codes in the corpus,
   * each under its native name.
   */
  learnLanguages: [
    { code: 'en', name: 'English' },
    { code: 'pl', name: 'Polski' },
    { code: 'ru', name: 'Русский' },
    { code: 'uk', name: 'Українська' },
    { code: 'cs', name: 'Čeština' },
    { code: 'sk', name: 'Slovenčina' },
    { code: 'bg', name: 'Български' },
    { code: 'sr', name: 'Srpski' },
    { code: 'hr', name: 'Hrvatski' },
    { code: 'sl', name: 'Slovenščina' },
    { code: 'mk', name: 'Македонски' },
    { code: 'be', name: 'Беларуская' },
  ],
  catalogs: { en, isv },
};
