import { describe, expect, it } from 'vitest';
import { renderIn } from '@glotty/language';
import { isvPack } from './index.js';

describe('isvPack', () => {
  it('identifies itself as the isv pack', () => {
    expect(isvPack.id).toBe('isv');
  });

  it('validates canonical etymological Latin and rejects the rest', () => {
    expect(isvPack.validateCanonical('Dobry dėnj!')).toBe(true);
    expect(isvPack.validateCanonical('qwerty')).toBe(false);
    expect(isvPack.validateCanonical('   ')).toBe(false);
  });

  it('normalizes any accepted writing into one comparable form', () => {
    expect(isvPack.normalize('Hlěb')).toBe('hleb');
    expect(isvPack.normalize('хлєб')).toBe('hleb');
    expect(isvPack.normalize('  sųd  ')).toBe('sud');
  });

  describe('stem', () => {
    it('drops the inflectional tail of longer words', () => {
      expect(isvPack.stem('slovniky')).toBe('slovni');
      expect(isvPack.stem('Hlěba')).toBe('hle');
    });

    it('keeps at least three characters of short words', () => {
      expect(isvPack.stem('dom')).toBe('dom');
      expect(isvPack.stem('do')).toBe('do');
    });
  });

  describe('scripts', () => {
    it('offers latin first, then cyrillic', () => {
      expect(isvPack.scripts.map((script) => script.id)).toEqual([
        'latin',
        'cyrillic',
      ]);
      expect(isvPack.scripts.map((script) => script.label)).toEqual([
        'Žž',
        'Жж',
      ]);
    });

    it('renders the standard Latin orthography', () => {
      expect(renderIn(isvPack, 'latin', 'vųzȯl ćuđi')).toBe('vuzol čudži');
    });

    it('renders Cyrillic with digraph awareness', () => {
      expect(renderIn(isvPack, 'cyrillic', 'voľa ljubve')).toBe('вола љубве');
    });
  });
});
