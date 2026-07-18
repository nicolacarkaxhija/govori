import { useCallback, useState } from 'react';
import { hasScriptChoice, nextScript } from '@glotty/language';
import { instance, pack } from '../instance';

/** A script id from the pack's `scripts`; plain string at the seams. */
export type Script = string;

const STORAGE_KEY = `${instance.id}.script`;

const defaultScript = pack.scripts[0]?.id ?? '';

function stored(): Script {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw !== null && pack.scripts.some((entry) => entry.id === raw)
    ? raw
    : defaultScript;
}

/**
 * Display-script preference (ADR 0003): one toggle cycling the pack's
 * scripts, persisted, app-wide. Packs with fewer than two scripts have
 * no choice to offer — `hasChoice` is false and `toggle` is inert.
 */
export function useScript() {
  const [script, setScript] = useState<Script>(stored);
  const toggle = useCallback(() => {
    setScript((current) => {
      const next = nextScript(pack, current)?.id ?? current;
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);
  return {
    script,
    toggle,
    hasChoice: hasScriptChoice(pack),
    currentLabel: pack.scripts.find((entry) => entry.id === script)?.label,
    nextLabel: nextScript(pack, script)?.label,
  };
}
