import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

function stubReachableApi(shortName: string, fullName: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ brand: { shortName, fullName } }),
      }),
    ),
  );
}

function stubOfflineApi(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('offline'))),
  );
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  );
});

describe('App', () => {
  it('renders the local brand and tagline when the API is offline', async () => {
    stubOfflineApi();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Govori' })).toBeTruthy();
    expect(screen.getByText('Learn Interslavic')).toBeTruthy();
  });

  it('prefers the brand served by the API when it is reachable', async () => {
    stubReachableApi('Besěda', 'Besěda — Interslavic Learning App');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Besěda' })).toBeTruthy();
  });

  it('toggles the colour theme and persists the choice', async () => {
    stubOfflineApi();
    const user = userEvent.setup();
    render(<App />);
    const button = screen.getByRole('button', { name: /theme/i });
    await user.click(button);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('govori-theme')).toBe('dark');
  });

  it('names the open licences in the footer', () => {
    stubOfflineApi();
    render(<App />);
    expect(screen.getByText(/AGPL/)).toBeTruthy();
    expect(screen.getByText(/CC BY-SA/)).toBeTruthy();
  });
});
