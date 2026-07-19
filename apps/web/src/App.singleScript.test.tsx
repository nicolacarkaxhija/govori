import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

beforeEach(() => {
  localStorage.setItem('govori.onboarded', '1');
});

afterEach(() => {
  localStorage.clear();
});

// A build of an instance whose pack writes exactly one script: the
// script toggle must disappear entirely (ADR 0029 — the engine offers
// choices only when the pack actually has them).
vi.mock('./instance', async () => {
  const { renderIn } = await import('@glotty/language');
  const { govoriInstance } = await import('@glotty/instance-govori');
  const { isvPack } = await import('@glotty/pack-isv');
  const pack = { ...isvPack, scripts: isvPack.scripts.slice(0, 1) };
  return {
    instance: govoriInstance,
    pack,
    fallbackLang: 'en',
    renderText: (text: string, scriptId: string) =>
      renderIn(pack, scriptId, text),
  };
});

describe('single-script pack', () => {
  it('renders no script toggle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    render(<App />);
    expect(
      await screen.findByRole('button', { name: 'Switch language' }),
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Switch script' })).toBeNull();
  });
});
