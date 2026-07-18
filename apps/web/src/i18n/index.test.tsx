import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { instance } from '../instance';
import { translate, useLanguage, type MessageKey } from './index';

// Key parity itself is gated inside each instance package (ADR 0013);
// here the engine only checks it serves whatever set the instance ships.
describe('catalogs come from the instance', () => {
  it('offers at least one ui language with a catalog', () => {
    expect(instance.uiLanguages.length).toBeGreaterThan(0);
    for (const language of instance.uiLanguages) {
      expect(instance.catalogs[language]).toBeDefined();
    }
  });
});

describe('translate', () => {
  it('serves each of the instance languages and interpolates', () => {
    expect(translate('en', 'check')).toBe('Check');
    expect(translate('isv', 'check')).toBe('Prověri');
    expect(translate('en', 'answered', { count: 3 })).toBe('3 answered');
  });

  it('falls back to the anchor catalog, then the key itself', () => {
    const ghost = 'ghostKey' as MessageKey;
    expect(translate('isv', ghost)).toBe(ghost);
    expect(translate('nope', 'check')).toBe('Check');
  });
});

describe('useLanguage', () => {
  it('starts on the first instance language and persists the cycle', () => {
    localStorage.clear();
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('en');
    expect(result.current.next).toBe('isv');
    act(() => {
      result.current.toggle();
    });
    expect(result.current.language).toBe('isv');
    expect(result.current.next).toBe('en');
    expect(localStorage.getItem('govori.lang')).toBe('isv');
  });
});

describe('translate edge branches', () => {
  it('keeps unknown interpolation placeholders intact', () => {
    expect(translate('en', 'answered', {})).toBe('{count} answered');
  });

  it('reads a stored isv preference and refuses unknown ones', () => {
    localStorage.setItem('govori.lang', 'isv');
    expect(renderHook(() => useLanguage()).result.current.language).toBe('isv');
    localStorage.setItem('govori.lang', 'tlh');
    expect(renderHook(() => useLanguage()).result.current.language).toBe('en');
    localStorage.clear();
  });
});
