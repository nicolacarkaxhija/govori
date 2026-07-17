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

describe('course navigation', () => {
  it('walks home to course to lesson', async () => {
    const user = userEvent.setup();
    const course = {
      units: [
        {
          id: '8b7c6d5e-4f3a-4b2c-9d1e-0f9a8b7c6d5e',
          title: 'Jedinica 1',
          lessons: [
            {
              id: '9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f',
              title: 'Lekcija 1',
              itemCount: 1,
            },
          ],
        },
      ],
    };
    const lesson = {
      title: 'Lekcija 1',
      items: [
        {
          id: 'aaaaaaaa-0000-4000-8000-000000000001',
          kind: 'word',
          text: 'voda',
          translations: [{ lang: 'en', text: 'water' }],
        },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: URL | RequestInfo) => {
        const url = input instanceof Request ? input.url : String(input);
        const body = url.includes('/course')
          ? course
          : url.includes('/lessons/')
            ? lesson
            : url.includes('/meta')
              ? {
                  brand: {
                    shortName: 'Govori',
                    fullName: 'Govori — Interslavic Learning App',
                  },
                }
              : null;
        return Promise.resolve(
          new Response(JSON.stringify(body), { status: body ? 200 : 404 }),
        );
      }),
    );
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Start learning' }),
    );
    await user.click(await screen.findByRole('button', { name: /Lekcija 1/ }));
    expect(await screen.findByRole('heading', { name: 'voda' })).toBeDefined();
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(await screen.findByText('Jedinica 1')).toBeDefined();
  });
});

describe('account entry', () => {
  it('opens the account view from the top bar', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 401 })),
    );
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    expect(
      await screen.findByRole('button', { name: 'Create account' }),
    ).toBeDefined();
  });
});

describe('ui language', () => {
  it('toggles between English and Interslavic', async () => {
    stubOfflineApi();
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('Learn Interslavic')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByText('Uči se medžuslovjansky')).toBeDefined();
    expect(localStorage.getItem('govori.lang')).toBe('isv');
    await user.click(screen.getByRole('button', { name: 'Prěključi jezyk' }));
    expect(screen.getByText('Learn Interslavic')).toBeDefined();
  });
});
