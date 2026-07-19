import { useCallback, useState } from 'react';
import { fallbackLang, instance } from '../instance';

/**
 * Learner languages (L1) come from the instance (ADR 0029): the roster
 * and the fallback are audience decisions, never the engine's.
 */
export const LEARN_LANGUAGES = instance.learnLanguages;

const STORAGE_KEY = `${instance.id}.learnlang`;

function isKnown(code: string): boolean {
  return LEARN_LANGUAGES.some((entry) => entry.code === code);
}

function stored(): string {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw !== null && isKnown(raw) ? raw : fallbackLang;
}

/** Learning-language preference: one picker, persisted, app-wide. */
export function useLearnLanguage() {
  const [learnLang, setState] = useState<string>(stored);
  const setLearnLang = useCallback((code: string) => {
    const next = isKnown(code) ? code : fallbackLang;
    localStorage.setItem(STORAGE_KEY, next);
    setState(next);
  }, []);
  return { learnLang, setLearnLang };
}
