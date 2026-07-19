/**
 * Basic-Latin English orthography.
 *
 * Canonical item text is plain dictionary English: the 26 unaccented
 * Latin letters plus the apostrophe (don't, teacher's). Loanword
 * diacritics (café, naïve) are not canonical — the unaccented spelling
 * is the stored form, exactly as basic learner dictionaries print it.
 */
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Running text: basic-Latin letters plus digits, whitespace, and common
 * punctuation (both ASCII and typographic quotes/dashes).
 */
const CANONICAL_PATTERN = new RegExp(
  `^[${LETTERS}${LETTERS.toUpperCase()}0-9\\s.,!?:;'’"«»„“”()\\-–—…%]+$`,
  'u',
);

/**
 * True when the text is valid basic-Latin English: unaccented letters,
 * apostrophes, digits, whitespace, and common punctuation. Content
 * schemas reject non-canonical item text at the seam.
 */
export function isCanonical(text: string): boolean {
  return (
    text.trim().length > 0 && CANONICAL_PATTERN.test(text.normalize('NFC'))
  );
}

/**
 * Folds any accepted way of typing an answer into one comparable form:
 * lowercase, diacritic-free, punctuation-free (so "dont" matches
 * "don't"), whitespace-collapsed.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^a-z0-9\s]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}
