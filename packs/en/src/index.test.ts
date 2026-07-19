import { describe, expect, it } from 'vitest';
import { hasScriptChoice, renderIn } from '@glotty/language';
import { enPack } from './index.js';

describe('enPack', () => {
  it('identifies itself as the en pack', () => {
    expect(enPack.id).toBe('en');
    expect(enPack.bcp47).toBe('en');
    expect(enPack.orthographyName).toBe('plain English spelling');
  });

  it('validates basic-Latin English and rejects the rest', () => {
    expect(enPack.validateCanonical("Don't worry!")).toBe(true);
    expect(enPack.validateCanonical('café')).toBe(false);
    expect(enPack.validateCanonical('   ')).toBe(false);
  });

  it('normalizes any accepted writing into one comparable form', () => {
    expect(enPack.normalize("Don't")).toBe('dont');
    expect(enPack.normalize('  Hello  ')).toBe('hello');
  });

  describe('stem', () => {
    it('drops the inflectional tail of longer words', () => {
      expect(enPack.stem('teachers')).toBe('teache');
      expect(enPack.stem('Running')).toBe('runni');
    });

    it('keeps at least three characters of short words', () => {
      expect(enPack.stem('cats')).toBe('cat');
      expect(enPack.stem('go')).toBe('go');
    });
  });

  describe('scripts', () => {
    it('offers exactly one Latin script, so no script choice exists', () => {
      expect(enPack.scripts.map((script) => script.id)).toEqual(['latin']);
      expect(enPack.scripts.map((script) => script.label)).toEqual(['Aa']);
      expect(hasScriptChoice(enPack)).toBe(false);
    });

    it('renders canonical text unchanged', () => {
      expect(renderIn(enPack, 'latin', "Everything's in order.")).toBe(
        "Everything's in order.",
      );
    });
  });
});
