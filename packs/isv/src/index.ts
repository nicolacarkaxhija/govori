import type { LanguagePack, ScriptVariant } from '@glotty/language';
import {
  isCanonical,
  normalize,
  transliterate,
  type TransliterateOptions,
} from '@glotty/transliteration-isv';

/**
 * Loose stem: enough of a headword to recognize its inflected forms.
 * Interslavic inflection mostly changes the last letter or two, so the
 * normalized form minus two characters (never below three) is plenty.
 */
function stem(word: string): string {
  const folded = normalize(word);
  return folded.slice(0, Math.max(3, folded.length - 2));
}

function scriptVariant(
  id: TransliterateOptions['script'],
  label: string,
): ScriptVariant {
  return { id, label, render: (text) => transliterate(text, { script: id }) };
}

/**
 * The Interslavic language pack (ADR 0029): delegates orthography to the
 * transliteration engine (ADR 0003). Latin leads because canonical
 * storage is etymological Latin; Cyrillic derives from it.
 */
export const isvPack: LanguagePack = {
  id: 'isv',
  bcp47: 'isv',
  orthographyName: 'canonical etymological Latin',
  validateCanonical: isCanonical,
  normalize,
  stem,
  scripts: [scriptVariant('latin', 'Žž'), scriptVariant('cyrillic', 'Жж')],
};
