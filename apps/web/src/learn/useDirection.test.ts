import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDirection } from './useDirection';

// A two-direction instance seam: the hook must cycle through the
// declared roster and persist the switch through setActiveDirection
// (ADR 0046).

const state = vi.hoisted(() => {
  const makeEntry = (id: string, label: string) => ({
    direction: {
      id,
      packId: id,
      label,
      fallbackTranslationLang: 'en',
      communityPublishNetVotes: 1,
    },
    pack: { id },
  });
  const forth = makeEntry('forth', 'Forthish');
  const back = makeEntry('back', 'Backish');
  return { forth, back, active: forth, sets: [] as string[] };
});

vi.mock('../instance', () => ({
  directions: [state.forth, state.back],
  activeDirection: () => state.active,
  setActiveDirection: (id: string) => {
    state.sets.push(id);
    state.active = id === 'back' ? state.back : state.forth;
  },
}));

describe('useDirection', () => {
  beforeEach(() => {
    state.active = state.forth;
    state.sets.length = 0;
  });

  it('offers the choice with the native labels', () => {
    const { result } = renderHook(() => useDirection());
    expect(result.current.hasChoice).toBe(true);
    expect(result.current.directionId).toBe('forth');
    expect(result.current.currentLabel).toBe('Forthish');
    expect(result.current.nextLabel).toBe('Backish');
  });

  it('cycles through the roster and wraps around, persisting each hop', () => {
    const { result } = renderHook(() => useDirection());
    act(() => {
      result.current.cycle();
    });
    expect(result.current.directionId).toBe('back');
    expect(result.current.nextLabel).toBe('Forthish');
    act(() => {
      result.current.cycle();
    });
    expect(result.current.directionId).toBe('forth');
    expect(state.sets).toEqual(['back', 'forth']);
  });
});
