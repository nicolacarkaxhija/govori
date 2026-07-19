import { renderIn, resolveDirection } from '@glotty/language';
import { resolveInstance } from './instances';

/**
 * The single entry point handing the running app its instance and pack
 * (ADR 0029): resolved once from VITE_INSTANCE, failing fast when the
 * build was not told which product it is.
 */
const resolved = resolveInstance(import.meta.env.VITE_INSTANCE);

export const instance = resolved.instance;

/**
 * The sole direction, totally resolved from config (ADR 0046) — not a
 * default: a second direction makes this throw until the app carries an
 * explicit direction choice.
 */
const sole = resolveDirection(resolved, undefined);

export const pack = sole.pack;

/** The active direction's translation fallback (ADR 0046). */
export const fallbackLang = sole.direction.fallbackTranslationLang;

/** Renders canonical text in one of the pack's scripts (ADR 0003). */
export function renderText(text: string, scriptId: string): string {
  return renderIn(pack, scriptId, text);
}
