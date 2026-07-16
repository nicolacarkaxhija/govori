import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useScript } from './useScript';

describe('useScript', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to latin and toggles with persistence', () => {
    const { result } = renderHook(() => useScript());
    expect(result.current.script).toBe('latin');
    act(() => {
      result.current.toggle();
    });
    expect(result.current.script).toBe('cyrillic');
    expect(localStorage.getItem('govori.script')).toBe('cyrillic');
  });

  it('restores a stored cyrillic preference', () => {
    localStorage.setItem('govori.script', 'cyrillic');
    const { result } = renderHook(() => useScript());
    expect(result.current.script).toBe('cyrillic');
  });
});
