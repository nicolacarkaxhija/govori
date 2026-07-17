export interface TransliterateOptions {
  script: 'latin' | 'cyrillic';
}

const COMBINING_ACUTE = '́';

/**
 * Etymological letters fold to the standard orthography per the official
 * simplification table. Folded output is never digraph-eligible: ĺj is
 * l + j (two letters), unlike the true digraph lj.
 */
const ETYMOLOGICAL_TO_STANDARD: ReadonlyMap<string, string> = new Map([
  ['å', 'a'],
  ['ȯ', 'o'],
  ['ė', 'e'],
  ['ę', 'e'],
  ['ų', 'u'],
  ['ć', 'č'],
  ['đ', 'dž'],
  ['ĺ', 'l'],
  ['ľ', 'l'],
  ['ń', 'n'],
  ['ŕ', 'r'],
  ['ś', 's'],
  ['ź', 'z'],
  ['ť', 't'],
  ['ď', 'd'],
]);

/**
 * Bases whose acute-accented forms have no precomposed glyph, so NFC leaves
 * them as base + combining acute. Every other accented base normalizes to a
 * precomposed letter handled by the etymological table.
 */
const ACUTE_BASE_TO_STANDARD: ReadonlyMap<string, string> = new Map([
  ['d', 'd'],
  ['t', 't'],
]);

const LATIN_TO_CYRILLIC: ReadonlyMap<string, string> = new Map([
  ['a', 'а'],
  ['b', 'б'],
  ['c', 'ц'],
  ['č', 'ч'],
  ['d', 'д'],
  ['e', 'е'],
  ['ě', 'є'],
  ['f', 'ф'],
  ['g', 'г'],
  ['h', 'х'],
  ['i', 'и'],
  ['j', 'ј'],
  ['k', 'к'],
  ['l', 'л'],
  ['m', 'м'],
  ['n', 'н'],
  ['o', 'о'],
  ['p', 'п'],
  ['r', 'р'],
  ['s', 'с'],
  ['š', 'ш'],
  ['t', 'т'],
  ['u', 'у'],
  ['v', 'в'],
  ['y', 'ы'],
  ['z', 'з'],
  ['ž', 'ж'],
]);

const DIGRAPH_TO_CYRILLIC: ReadonlyMap<string, string> = new Map([
  ['lj', 'љ'],
  ['nj', 'њ'],
]);

interface Segment {
  folded: string;
  digraphable: boolean;
}

function segmentize(text: string): Segment[] {
  const nfc = text.normalize('NFC');
  const segments: Segment[] = [];
  let i = 0;
  while (i < nfc.length) {
    const char = nfc.charAt(i);
    const lower = char.toLowerCase();
    let folded: string | undefined;
    let consumed = 1;
    if (nfc.charAt(i + 1) === COMBINING_ACUTE) {
      folded = ACUTE_BASE_TO_STANDARD.get(lower);
      if (folded !== undefined) {
        consumed = 2;
      }
    }
    folded ??= ETYMOLOGICAL_TO_STANDARD.get(lower);
    if (folded === undefined) {
      segments.push({ folded: char, digraphable: true });
      i += 1;
    } else {
      segments.push({ folded: restoreCase(char, folded), digraphable: false });
      i += consumed;
    }
  }
  return segments;
}

export function transliterate(
  text: string,
  options: TransliterateOptions,
): string {
  const segments = segmentize(text);
  if (options.script === 'latin') {
    return segments.map((segment) => segment.folded).join('');
  }
  let result = '';
  let consumedByDigraph = false;
  for (const [i, current] of segments.entries()) {
    if (consumedByDigraph) {
      consumedByDigraph = false;
      continue;
    }
    const next = segments[i + 1];
    if (current.digraphable && next?.digraphable) {
      const pair = (current.folded + next.folded).toLowerCase();
      const digraphHit = DIGRAPH_TO_CYRILLIC.get(pair);
      if (digraphHit !== undefined) {
        result += restoreCase(current.folded, digraphHit);
        consumedByDigraph = true;
        continue;
      }
    }
    for (const char of current.folded) {
      const hit = LATIN_TO_CYRILLIC.get(char.toLowerCase());
      result += hit === undefined ? char : restoreCase(char, hit);
    }
  }
  return result;
}

function restoreCase(source: string, mapped: string): string {
  const first = source.charAt(0);
  return first === first.toLowerCase() ? mapped : mapped.toUpperCase();
}

const CANONICAL_LETTERS = 'abcčdeěfghijklmnoprsštuvyzžåȯęųćđĺľńŕśźťďė';

// The combining acute is only canonical after d/t (forms with no precomposed
// glyph); everything else must be a plain alphabet letter, digit, space, or
// common punctuation.
const CANONICAL_PATTERN = new RegExp(
  `^(?:[dtDT]${COMBINING_ACUTE}|[${CANONICAL_LETTERS}${CANONICAL_LETTERS.toUpperCase()}0-9\\s.,!?:;'"«»()\\-–—…%])+$`,
  'u',
);

/**
 * True when the text is valid canonical etymological Latin (ADR 0003):
 * the Interslavic alphabet plus digits, whitespace, and common punctuation.
 * Content schemas reject non-canonical item text at the seam.
 */
export function isCanonical(text: string): boolean {
  return (
    text.trim().length > 0 && CANONICAL_PATTERN.test(text.normalize('NFC'))
  );
}

const CYRILLIC_TO_LATIN: ReadonlyMap<string, string> = new Map(
  [...LATIN_TO_CYRILLIC].map(([latin, cyrillic]) => [cyrillic, latin]),
);

const CYRILLIC_DIGRAPH_TO_LATIN: ReadonlyMap<string, string> = new Map(
  [...DIGRAPH_TO_CYRILLIC].map(([latin, cyrillic]) => [cyrillic, latin]),
);

/**
 * Folds any accepted way of writing an answer — Cyrillic, etymological
 * Latin, standard Latin, or bare-ASCII approximation — into one
 * comparable form: lowercase, diacritic-free, whitespace-collapsed.
 */
export function normalize(text: string): string {
  let latin = '';
  for (const char of text.normalize('NFC')) {
    const lower = char.toLowerCase();
    latin +=
      CYRILLIC_DIGRAPH_TO_LATIN.get(lower) ??
      CYRILLIC_TO_LATIN.get(lower) ??
      char;
  }
  return transliterate(latin, { script: 'latin' })
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}
