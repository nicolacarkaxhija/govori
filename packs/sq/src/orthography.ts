/**
 * Standard Albanian orthography (drejtshkrimi i shqipes standarde).
 *
 * The alphabet has 36 letters; its 9 digraphs (dh, gj, ll, nj, rr, sh,
 * th, xh, zh) are combinations of the 27 single characters below, so a
 * character-class check suffices. Notably absent: w, and every accented
 * vowel other than ë — Gheg spellings such as â or û are not canonical
 * and may only survive as contrastive notes, never as item text.
 */
const LETTERS = 'abcçdeëfghijklmnopqrstuvxyz';

/**
 * Running text: alphabet letters plus digits, whitespace, and common
 * punctuation (both ASCII and typographic quotes/dashes).
 */
const CANONICAL_PATTERN = new RegExp(
  `^[${LETTERS}${LETTERS.toUpperCase()}0-9\\s.,!?:;'’"«»„“”()\\-–—…%]+$`,
  'u',
);

/**
 * True when the text is valid standard Albanian orthography: the
 * Albanian alphabet plus digits, whitespace, and common punctuation.
 * Content schemas reject non-canonical item text at the seam.
 */
export function isCanonical(text: string): boolean {
  return (
    text.trim().length > 0 && CANONICAL_PATTERN.test(text.normalize('NFC'))
  );
}

/**
 * Folds any accepted way of typing an answer — the full standard
 * orthography or its bare-ASCII approximation (ë→e, ç→c) — into one
 * comparable form: lowercase, diacritic-free, whitespace-collapsed.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}
