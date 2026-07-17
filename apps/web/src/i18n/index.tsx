import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import en from './en.json';
import isv from './isv.json';

export type Language = 'en' | 'isv';
export type MessageKey = keyof typeof en;

const catalogs: Record<Language, Partial<Record<MessageKey, string>>> = {
  en,
  isv,
};

/** Flat Weblate-friendly catalogs (ADR 0013); English is the fallback. */
export function translate(
  language: Language,
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  const template = catalogs[language][key] ?? catalogs.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

const STORAGE_KEY = 'govori.lang';

function stored(): Language {
  return localStorage.getItem(STORAGE_KEY) === 'isv' ? 'isv' : 'en';
}

/** UI-language preference: one toggle, persisted, app-wide. */
export function useLanguage() {
  const [language, setLanguage] = useState<Language>(stored);
  const toggle = useCallback(() => {
    setLanguage((current) => {
      const next: Language = current === 'en' ? 'isv' : 'en';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);
  return { language, toggle };
}

const LanguageContext = createContext<Language>('en');

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
