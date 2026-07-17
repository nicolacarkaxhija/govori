import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import en from './en.json';
import isv from './isv.json';
import { translate, useLanguage, type MessageKey } from './index';

describe('catalog completeness (ADR 0013 gate)', () => {
  it('isv covers exactly the keys of en', () => {
    expect(Object.keys(isv).sort()).toEqual(Object.keys(en).sort());
  });

  it('no catalog value is empty', () => {
    for (const catalog of [en, isv]) {
      for (const [key, value] of Object.entries(catalog)) {
        expect(value.trim().length, key).toBeGreaterThan(0);
      }
    }
  });
});

describe('translate', () => {
  it('serves each language and interpolates parameters', () => {
    expect(translate('en', 'check')).toBe('Check');
    expect(translate('isv', 'check')).toBe('Prověri');
    expect(translate('en', 'answered', { count: 3 })).toBe('3 answered');
  });

  it('falls back to English for a missing translation', () => {
    const ghost = 'ghostKey' as MessageKey;
    expect(translate('isv', ghost)).toBe(ghost);
  });
});

describe('useLanguage', () => {
  it('defaults to English and persists the toggle', () => {
    localStorage.clear();
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('en');
    act(() => {
      result.current.toggle();
    });
    expect(result.current.language).toBe('isv');
    expect(localStorage.getItem('govori.lang')).toBe('isv');
  });
});

describe('translate edge branches', () => {
  it('keeps unknown interpolation placeholders intact', () => {
    expect(translate('en', 'answered', {})).toBe('{count} answered');
  });

  it('reads a stored isv preference', () => {
    localStorage.setItem('govori.lang', 'isv');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('isv');
    localStorage.clear();
  });
});
