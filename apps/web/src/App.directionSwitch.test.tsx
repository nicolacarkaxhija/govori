import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

beforeEach(() => {
  localStorage.setItem('govori.onboarded', '1');
});

afterEach(() => {
  localStorage.clear();
});

// A build of an instance hosting two directions: the topbar must offer
// the switcher (ADR 0046), cycle the working direction, and follow the
// active pack — here from a two-script pack to a single-script one, so
// the script toggle disappears with the switch.
const state = vi.hoisted(() => ({
  activeId: 'isv',
  sets: [] as string[],
}));

vi.mock('./instance', async () => {
  const { renderIn } = await import('@glotty/language');
  const { govoriInstance } = await import('@glotty/instance-govori');
  const { isvPack } = await import('@glotty/pack-isv');
  const { sqPack } = await import('@glotty/pack-sq');
  const forth = {
    direction: {
      id: 'isv',
      packId: 'isv',
      label: 'Medžuslovjansky',
      fallbackTranslationLang: 'en',
      communityPublishNetVotes: 3,
    },
    pack: isvPack,
  };
  const back = {
    direction: {
      id: 'sq',
      packId: 'sq',
      label: 'Shqip',
      fallbackTranslationLang: 'en',
      communityPublishNetVotes: 5,
    },
    pack: sqPack,
  };
  const active = () => (state.activeId === 'sq' ? back : forth);
  return {
    instance: govoriInstance,
    directions: [forth, back],
    activeDirection: active,
    activePack: () => active().pack,
    setActiveDirection: (id: string) => {
      state.sets.push(id);
      state.activeId = id;
    },
    fallbackLang: () => active().direction.fallbackTranslationLang,
    renderText: (text: string, scriptId: string) =>
      renderIn(active().pack, scriptId, text),
  };
});

describe('two-direction shell', () => {
  it('offers the switcher and follows the active pack across a switch', async () => {
    state.activeId = 'isv';
    state.sets.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    const user = userEvent.setup();
    render(<App />);
    const switcher = await screen.findByRole('button', {
      name: 'Switch learning direction',
    });
    expect(switcher.textContent).toBe('Medžuslovjansky → Shqip');
    // The isv pack writes two scripts, so Settings offers the script choice.
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(
      screen.getByRole('combobox', { name: 'Display script' }),
    ).toBeDefined();
    await user.click(screen.getByRole('button', { name: '← Back' }));

    await user.click(
      screen.getByRole('button', { name: 'Switch learning direction' }),
    );
    expect(state.sets).toEqual(['sq']);
    const switched = await screen.findByRole('button', {
      name: 'Switch learning direction',
    });
    expect(switched.textContent).toBe('Shqip → Medžuslovjansky');
    // The sq pack writes a single script: no script choice remains.
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(
      screen.queryByRole('combobox', { name: 'Display script' }),
    ).toBeNull();
  });
});
