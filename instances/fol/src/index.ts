import type { InstanceConfig } from '@glotty/language';
import { de } from './catalogs/de.js';
import { en } from './catalogs/en.js';
import { it } from './catalogs/it.js';
import { sq } from './catalogs/sq.js';
import { tr } from './catalogs/tr.js';

/**
 * The English catalog is the developer-authored key inventory: it anchors
 * the MessageKey type at build time. That is a developer artifact, not a
 * runtime preference — at runtime the engine falls back to this
 * instance's first uiLanguage, whatever it is.
 */
export type MessageKey = keyof typeof en;

/**
 * The Fol instance (ADR 0029/0044): working brand for the Albanian
 * product, pending a community poll. Everything the engine must never
 * hardcode — branding, catalog set, learner-language roster, fallback
 * language — lives here.
 */
export const folInstance: InstanceConfig = {
  id: 'fol',
  brand: {
    shortName: 'Fol',
    fullName: 'Fol — Learn Albanian',
    description:
      'Learn Albanian (shqip) free: a community-driven course with real dictionary vocabulary, spaced repetition, and standard Albanian with Gheg variant notes.',
  },
  packId: 'sq',
  uiLanguages: ['en', 'sq', 'de', 'it', 'tr'],
  fallbackTranslationLang: 'en',
  /**
   * Curated learner languages (L1): the languages of the Albanian
   * diaspora and its neighbours, each under its native name.
   */
  learnLanguages: [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
  ],
  catalogs: { de, en, it, sq, tr },
};
