import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { instance } from '../instance';
import type { MessageKey } from '../instances';

export type Language = string;
export type { MessageKey };

const { catalogs, uiLanguages } = instance;

// The instance's first uiLanguage anchors runtime fallback for missing
// translations; the MessageKey type anchor is a separate, build-time
// concern (see instances.ts).
const anchor: Readonly<Partial<Record<string, string>>> =
  catalogs[uiLanguages[0] ?? ''] ?? {};

/** Flat Weblate-friendly catalogs (ADR 0013), served by the instance. */
export function translate(
  language: Language,
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  const template = catalogs[language]?.[key] ?? anchor[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

const STORAGE_KEY = `${instance.id}.lang`;

function stored(): Language {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw !== null && uiLanguages.includes(raw)
    ? raw
    : (uiLanguages[0] ?? 'und');
}

function following(current: Language): Language {
  const index = uiLanguages.indexOf(current);
  return uiLanguages[(index + 1) % uiLanguages.length] ?? current;
}

/** UI-language preference: cycles the instance's languages, persisted. */
export function useLanguage() {
  const [language, setLanguage] = useState<Language>(stored);
  const toggle = useCallback(() => {
    setLanguage((current) => {
      const next = following(current);
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);
  return { language, toggle, next: following(language) };
}

const LanguageContext = createContext<Language>(uiLanguages[0] ?? 'und');

export function LanguageProvider({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}) {
  return (
    <LanguageContext.Provider value={language}>
      {children}
    </LanguageContext.Provider>
  );
}

/** The component-side accessor: `const t = useT()` then `t('check')`. */
export function useT() {
  const language = useContext(LanguageContext);
  return useCallback(
    (key: MessageKey, params: Record<string, string | number> = {}) =>
      translate(language, key, params),
    [language],
  );
}
