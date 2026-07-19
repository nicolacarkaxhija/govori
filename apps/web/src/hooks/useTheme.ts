import { useCallback, useEffect, useState } from 'react';
import { instance } from '../instance';

export type Theme = 'light' | 'dark';
/** The user's preference: an explicit mode, or deferring to the system. */
export type ThemeChoice = Theme | 'system';

const storageKey = `${instance.id}-theme`;

function readStoredChoice(): ThemeChoice {
  const stored = localStorage.getItem(storageKey);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Colour-theme preference (moved into Settings): light, dark, or follow the
 * system. An explicit choice stamps `[data-theme]` on the root and persists;
 * `system` clears both, letting `prefers-color-scheme` decide. `theme` is the
 * resolved mode currently painting.
 */
export function useTheme(): {
  choice: ThemeChoice;
  theme: Theme;
  setChoice: (choice: ThemeChoice) => void;
} {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStoredChoice);

  useEffect(() => {
    const { documentElement } = document;
    if (choice === 'system') {
      delete documentElement.dataset.theme;
      localStorage.removeItem(storageKey);
    } else {
      documentElement.dataset.theme = choice;
      localStorage.setItem(storageKey, choice);
    }
  }, [choice]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
  }, []);

  return {
    choice,
    theme: choice === 'system' ? systemTheme() : choice,
    setChoice,
  };
}
