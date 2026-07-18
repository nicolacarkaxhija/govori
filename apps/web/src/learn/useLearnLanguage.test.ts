import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { LEARN_LANGUAGES, useLearnLanguage } from './useLearnLanguage';

describe('useLearnLanguage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers a curated list led by English', () => {
    expect(LEARN_LANGUAGES[0]?.code).toBe('en');
    expect(LEARN_LANGUAGES.map((entry) => entry.code)).toContain('pl');
    expect(LEARN_LANGUAGES.map((entry) => entry.code)).toContain('uk');
    const codes = LEARN_LANGUAGES.map((entry) => entry.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const entry of LEARN_LANGUAGES) {
      expect(entry.name.length).toBeGreaterThan(0);
    }
  });

  it('defaults to English and persists a chosen language', () => {
    const { result } = renderHook(() => useLearnLanguage());
    expect(result.current.learnLang).toBe('en');
    act(() => {
      result.current.setLearnLang('pl');
    });
    expect(result.current.learnLang).toBe('pl');
    expect(localStorage.getItem('govori.learnlang')).toBe('pl');
  });

  it('restores a stored preference', () => {
    localStorage.setItem('govori.learnlang', 'uk');
    const { result } = renderHook(() => useLearnLanguage());
    expect(result.current.learnLang).toBe('uk');
  });

  it('refuses unknown codes, stored or set', () => {
    localStorage.setItem('govori.learnlang', 'xx');
    const { result } = renderHook(() => useLearnLanguage());
    expect(result.current.learnLang).toBe('en');
    act(() => {
      result.current.setLearnLang('yy');
    });
    expect(result.current.learnLang).toBe('en');
    expect(localStorage.getItem('govori.learnlang')).toBe('en');
  });
});
