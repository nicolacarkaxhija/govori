import { describe, expect, it } from 'vitest';
import { transliterate } from './index.js';

// Oracle fixtures: Schleicher's fable in Interslavic, taken from the test
// snapshots of the MIT-licensed community library
// https://github.com/medzuslovjansky/js-utils (src/transliterate).
// Input is etymological Latin; expected output is the standard Cyrillic
// ("isv-Cyrl") rendering produced by that library.

const FABLE: readonly (readonly [latin: string, cyrillic: string])[] = [
  [
    'Na vȯzvyšenosti ovca, ktora ne iměla vȯlnų, uviděla konjev.',
    'На возвышености овца, ктора не имєла волну, увидєла коњев.',
  ],
  [
    'Pŕvy tęgal tęžky voz, vtory nosil veliko brěmę, tretji brzo vozil mųža.',
    'Првы тегал тежкы воз, вторы носил велико брєме, третји брзо возил мужа.',
  ],
  [
    '«Boli mně sŕdce, kȯgda viđų, kako člověk vladaje konjami.»',
    '«Боли мнє срдце, когда виджу, како чловєк владаје коњами.»',
  ],
  [
    'mųž, gospodaŕ, bere tvojų vȯlnų, da by iměl dlja sebe teplo paĺto.',
    'муж, господар, бере твоју волну, да бы имєл дља себе тепло палто.',
  ],
  [
    'Uslyšavši to, ovca izběgla v råvninų.',
    'Услышавши то, овца избєгла в равнину.',
  ],
  [
    'T́ma, i korenje revenja počęli råsteńje, a slugi pověděli krålju o veseĺju.',
    'Тма, и корење ревења почели растенје, а слуги повєдєли краљу о веселју.',
  ],
];

describe('oracle: js-utils Schleicher fable fixtures', () => {
  it.each(FABLE)('%s → Cyrillic matches the oracle', (latin, cyrillic) => {
    expect(transliterate(latin, { script: 'cyrillic' })).toBe(cyrillic);
  });

  it('distinguishes the lj digraph from folded ĺ + j', () => {
    expect(transliterate('kralju', { script: 'cyrillic' })).toBe('краљу');
    expect(transliterate('veseĺju', { script: 'cyrillic' })).toBe('веселју');
  });
});
