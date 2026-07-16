import { useCallback, useState } from 'react';

export type Script = 'latin' | 'cyrillic';

const STORAGE_KEY = 'govori.script';

function stored(): Script {
  return localStorage.getItem(STORAGE_KEY) === 'cyrillic'
    ? 'cyrillic'
    : 'latin';
}

/** Display-script preference (ADR 0003): one toggle, persisted, app-wide. */
export function useScript() {
  const [script, setScript] = useState<Script>(stored);
  const toggle = useCallback(() => {
    setScript((current) => {
      const next: Script = current === 'latin' ? 'cyrillic' : 'latin';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);
  return { script, toggle };
}
