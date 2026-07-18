import { useCallback, useState } from 'react';

export interface LearnLanguage {
  /** BCP 47 language code as served in item translations. */
  code: string;
  /** The language's own name, shown untranslated in the picker. */
  name: string;
}

/**
 * Curated learner languages (L1): the most common codes in the corpus,
 * each under its native name. Items missing a language fall back to
 * English via translationFor.
 */
export const LEARN_LANGUAGES: readonly LearnLanguage[] = [
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
];

const STORAGE_KEY = 'govori.learnlang';

function isKnown(code: string): boolean {
  return LEARN_LANGUAGES.some((entry) => entry.code === code);
}

function stored(): string {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw !== null && isKnown(raw) ? raw : 'en';
}

/** Learning-language preference: one picker, persisted, app-wide. */
export function useLearnLanguage() {
  const [learnLang, setState] = useState<string>(stored);
  const setLearnLang = useCallback((code: string) => {
    const next = isKnown(code) ? code : 'en';
    localStorage.setItem(STORAGE_KEY, next);
    setState(next);
  }, []);
  return { learnLang, setLearnLang };
}
