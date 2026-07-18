import { useCallback, useEffect, useState } from 'react';
import { instance } from '../instance';

export type Theme = 'light' | 'dark';

const storageKey = `${instance.id}-theme`;

function readStoredTheme(): Theme | null {
  const stored = localStorage.getItem(storageKey);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [override, setOverride] = useState<Theme | null>(readStoredTheme);

  useEffect(() => {
    const { documentElement } = document;
    if (override === null) {
      delete documentElement.dataset.theme;
      localStorage.removeItem(storageKey);
    } else {
      documentElement.dataset.theme = override;
      localStorage.setItem(storageKey, override);
    }
  }, [override]);

  const toggle = useCallback(() => {
    setOverride((current) =>
      (current ?? systemTheme()) === 'dark' ? 'light' : 'dark',
    );
  }, []);

  return { theme: override ?? systemTheme(), toggle };
}
