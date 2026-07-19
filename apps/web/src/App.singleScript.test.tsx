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

// A build of an instance whose pack writes exactly one script: Settings
// must offer no display-script choice (ADR 0029 — the engine offers
// choices only when the pack actually has them).
vi.mock('./instance', async () => {
  const { renderIn } = await import('@glotty/language');
  const { govoriInstance } = await import('@glotty/instance-govori');
  const { isvPack } = await import('@glotty/pack-isv');
  const pack = { ...isvPack, scripts: isvPack.scripts.slice(0, 1) };
  const sole = { direction: govoriInstance.directions[0], pack };
  return {
    instance: govoriInstance,
    directions: [sole],
    activeDirection: () => sole,
    activePack: () => pack,
    setActiveDirection: () => undefined,
    fallbackLang: () => 'en',
    renderText: (text: string, scriptId: string) =>
      renderIn(pack, scriptId, text),
  };
});

describe('single-script pack', () => {
  it('offers no display-script choice in settings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    const user = userEvent.setup();
    render(<App />);
    // One declared direction: no switcher in the top bar (ADR 0046).
    expect(
      await screen.findByRole('button', { name: 'Start learning' }),
    ).toBeDefined();
    expect(
      screen.queryByRole('button', { name: 'Switch learning direction' }),
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    // Interface and translation languages are always offered; the script
    // choice is not, because the pack writes a single script.
    expect(
      screen.getByRole('combobox', { name: 'Interface language' }),
    ).toBeDefined();
    expect(
      screen.queryByRole('combobox', { name: 'Display script' }),
    ).toBeNull();
  });
});
