import type { LanguagePack } from '@glotty/language';
import { isCanonical, normalize } from './orthography.js';

/**
 * Loose stem: enough of a headword to recognize its inflected forms.
 * Albanian inflection (definiteness suffixes, plural endings, person
 * endings) mostly changes the last letter or two, so the normalized
 * form minus two characters (never below three) is plenty.
 */
function stem(word: string): string {
  const folded = normalize(word);
  return folded.slice(0, Math.max(3, folded.length - 2));
}

/**
 * The Standard Albanian language pack (ADR 0029/0042): one Latin
 * script, so canonical text renders as itself and the engine hides
 * every script choice. Gheg variants are contrastive notes, never
 * canonical item text.
 */
export const sqPack: LanguagePack = {
  id: 'sq',
  bcp47: 'sq',
  orthographyName: 'standard Albanian orthography',
  validateCanonical: isCanonical,
  normalize,
  stem,
  scripts: [{ id: 'latin', label: 'Aa', render: (text) => text }],
};
