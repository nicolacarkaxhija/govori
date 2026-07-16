export interface TransliterateOptions {
  script: 'latin' | 'cyrillic';
}

const LATIN_TO_CYRILLIC: ReadonlyMap<string, string> = new Map([
  ['lj', 'љ'],
  ['nj', 'њ'],
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

const ETYMOLOGICAL_TO_STANDARD: ReadonlyMap<string, string> = new Map([
  ['å', 'a'],
  ['ę', 'e'],
  ['ų', 'u'],
  ['ć', 'č'],
  ['đ', 'dž'],
  ['ĺ', 'l'],
  ['ń', 'n'],
  ['ŕ', 'r'],
  ['ś', 's'],
  ['ź', 'z'],
  ['ť', 't'],
  ['ď', 'd'],
]);

function foldToStandard(text: string): string {
  let result = '';
  for (const char of text) {
    const folded = ETYMOLOGICAL_TO_STANDARD.get(char.toLowerCase());
    result += folded === undefined ? char : restoreCase(char, folded);
  }
  return result;
}

export function transliterate(
  text: string,
  options: TransliterateOptions,
): string {
  const standard = foldToStandard(text);
  if (options.script === 'latin') {
    return standard;
  }
  let result = '';
  let i = 0;
  while (i < standard.length) {
    const digraph = standard.slice(i, i + 2);
    const digraphHit = LATIN_TO_CYRILLIC.get(digraph.toLowerCase());
    if (digraph.length === 2 && digraphHit !== undefined) {
      result += restoreCase(digraph, digraphHit);
      i += 2;
      continue;
    }
    const char = standard.charAt(i);
    const charHit = LATIN_TO_CYRILLIC.get(char.toLowerCase());
    result += charHit === undefined ? char : restoreCase(char, charHit);
    i += 1;
  }
  return result;
}

function restoreCase(source: string, mapped: string): string {
  const first = source.charAt(0);
  return first === first.toLowerCase() ? mapped : mapped.toUpperCase();
}
