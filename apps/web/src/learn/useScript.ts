import { useCallback, useEffect, useState } from 'react';
import { hasScriptChoice, nextScript } from '@glotty/language';
import { activePack, instance } from '../instance';

/** A script id from the active pack's `scripts`; plain string at the seams. */
export type Script = string;

const STORAGE_KEY = `${instance.id}.script`;

function stored(): Script {
  const pack = activePack();
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw !== null && pack.scripts.some((entry) => entry.id === raw)
    ? raw
    : (pack.scripts[0]?.id ?? '');
}

/**
 * Display-script preference (ADR 0003): one toggle cycling the active
 * pack's scripts, persisted, app-wide. The pack follows the working
 * direction (ADR 0046), so a direction switch re-reads the preference
 * against the new pack. Packs with fewer than two scripts have no
 * choice to offer — `hasChoice` is false and `toggle` is inert.
 */
export function useScript(directionId?: string) {
  const [script, setScript] = useState<Script>(stored);
  useEffect(() => {
    setScript(stored());
  }, [directionId]);
  const toggle = useCallback(() => {
    setScript((current) => {
      const next = nextScript(activePack(), current)?.id ?? current;
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);
  return {
    script,
    toggle,
    hasChoice: hasScriptChoice(activePack()),
    currentLabel: activePack().scripts.find((entry) => entry.id === script)
      ?.label,
    nextLabel: nextScript(activePack(), script)?.label,
  };
}
