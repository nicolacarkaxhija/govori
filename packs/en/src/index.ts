import type { LanguagePack } from '@glotty/language';
import { isCanonical, normalize } from './orthography.js';

/**
 * Loose stem: enough of a headword to recognize its inflected forms.
 * English inflection (plural -s/-es, -ed, -ing with doubled finals)
 * mostly grows the tail, so the normalized form minus two characters
 * (never below three) recognizes the family without a full lemmatizer.
 */
function stem(word: string): string {
  const folded = normalize(word);
  return folded.slice(0, Math.max(3, folded.length - 2));
}

/**
 * The basic-Latin English language pack (ADR 0029/0042): one Latin
 * script, so canonical text renders as itself and the engine hides
 * every script choice.
 */
export const enPack: LanguagePack = {
  id: 'en',
  bcp47: 'en',
  orthographyName: 'plain English spelling',
  validateCanonical: isCanonical,
  normalize,
  stem,
  scripts: [{ id: 'latin', label: 'Aa', render: (text) => text }],
};
