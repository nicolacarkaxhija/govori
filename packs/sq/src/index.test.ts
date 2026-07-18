import { describe, expect, it } from 'vitest';
import { hasScriptChoice, renderIn } from '@glotty/language';
import { sqPack } from './index.js';

describe('sqPack', () => {
  it('identifies itself as the sq pack', () => {
    expect(sqPack.id).toBe('sq');
    expect(sqPack.bcp47).toBe('sq');
    expect(sqPack.orthographyName).toBe('standard Albanian orthography');
  });

  it('validates standard Albanian and rejects the rest', () => {
    expect(sqPack.validateCanonical('Natën e mirë!')).toBe(true);
    expect(sqPack.validateCanonical('watt')).toBe(false);
    expect(sqPack.validateCanonical('   ')).toBe(false);
  });

  it('normalizes any accepted writing into one comparable form', () => {
    expect(sqPack.normalize('Përshëndetje')).toBe('pershendetje');
    expect(sqPack.normalize('  Çfarë  ')).toBe('cfare');
  });

  describe('stem', () => {
    it('drops the inflectional tail of longer words', () => {
      expect(sqPack.stem('familja')).toBe('famil');
      expect(sqPack.stem('Përshëndetjet')).toBe('pershendetj');
    });

    it('keeps at least three characters of short words', () => {
      expect(sqPack.stem('nëna')).toBe('nen');
      expect(sqPack.stem('po')).toBe('po');
    });
  });

  describe('scripts', () => {
    it('offers exactly one Latin script, so no script choice exists', () => {
      expect(sqPack.scripts.map((script) => script.id)).toEqual(['latin']);
      expect(sqPack.scripts.map((script) => script.label)).toEqual(['Aa']);
      expect(hasScriptChoice(sqPack)).toBe(false);
    });

    it('renders canonical text unchanged', () => {
      expect(renderIn(sqPack, 'latin', 'Gjithçka është në rregull.')).toBe(
        'Gjithçka është në rregull.',
      );
    });
  });
});
