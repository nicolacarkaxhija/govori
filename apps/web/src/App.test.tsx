import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

// Onboarding is a first-run gate (ADR 0045); these suites exercise the
// returning-user shell, so mark onboarding done before each render.
beforeEach(() => {
  localStorage.setItem('govori.onboarded', '1');
});

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

  it('sets an explicit colour theme from settings and persists it', async () => {
    stubOfflineApi();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Theme' }),
      'dark',
    );
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

describe('practice hub', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('govori.onboarded', '1');
  });

  it('opens weak-word practice and returns home', async () => {
    stubOfflineApi();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Weak words' }));
    expect(await screen.findByText(/No weak words yet/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(
      await screen.findByRole('button', { name: 'Start learning' }),
    ).toBeDefined();
  });

  it('starts a speed review from the home screen', async () => {
    const items = ['voda', 'hlěb', 'mlěko', 'sųd'].map((text, index) => ({
      id: `aaaaaaaa-0000-4000-8000-00000000001${String(index)}`,
      kind: 'word',
      text,
      translations: [{ lang: 'en', text: `t-${text}` }],
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn((input: URL | RequestInfo) => {
        const url = input instanceof Request ? input.url : String(input);
        const body = url.includes('/items')
          ? { items }
          : url.includes('/meta')
            ? { brand: { shortName: 'Govori', fullName: 'Govori' } }
            : null;
        return Promise.resolve(
          new Response(JSON.stringify(body), { status: body ? 200 : 404 }),
        );
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Speed review' }));
    expect(await screen.findByText('30 s left')).toBeDefined();
  });

  it('runs common-word practice over the frequency list', async () => {
    const items = [
      {
        id: 'aaaaaaaa-0000-4000-8000-000000000001',
        kind: 'word',
        text: 'voda',
        translations: [{ lang: 'en', text: 'water' }],
      },
      {
        id: 'aaaaaaaa-0000-4000-8000-000000000002',
        kind: 'word',
        text: 'hlěb',
        translations: [{ lang: 'en', text: 'bread' }],
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: URL | RequestInfo) => {
        const url = input instanceof Request ? input.url : String(input);
        const body = url.includes('/items')
          ? { items }
          : url.includes('/meta')
            ? { brand: { shortName: 'Govori', fullName: 'Govori' } }
            : null;
        return Promise.resolve(
          new Response(JSON.stringify(body), { status: body ? 200 : 404 }),
        );
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Common words' }));
    expect(await screen.findByRole('heading', { name: 'voda' })).toBeDefined();
  });
});

describe('community review entry', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('govori.onboarded', '1');
  });

  it('hides the contribute and community links from signed-out users', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'sign in' }), {
          status: 401,
        }),
      ),
    );
    render(<App />);
    await screen.findByRole('button', { name: 'Start learning' });
    const footer = within(screen.getByRole('contentinfo'));
    expect(
      footer.queryByRole('button', { name: 'Community review' }),
    ).toBeNull();
    expect(footer.queryByRole('button', { name: 'Contribute' })).toBeNull();
  });

  it('opens the voting queue from the footer once signed in', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: URL | RequestInfo) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url.includes('/me')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                user: { id: 'u1', email: 'a@b.co', role: 'learner' },
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'sign in' }), { status: 401 }),
        );
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    const link = await screen.findByRole('button', {
      name: 'Community review',
    });
    await user.click(link);
    expect(await screen.findByText('Sign in to vote.')).toBeDefined();
  });
});

describe('first-run onboarding', () => {
  beforeEach(() => {
    localStorage.removeItem('govori.onboarded');
  });

  it('gates the first visit and lands home once completed', async () => {
    stubOfflineApi();
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText('Welcome')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Start learning' }));
    expect(
      await screen.findByRole('button', { name: 'Start learning' }),
    ).toBeDefined();
    expect(localStorage.getItem('govori.onboarded')).toBe('1');
  });
});

describe('learning language picker', () => {
  it('persists the chosen translation language from settings', async () => {
    stubOfflineApi();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    const picker = screen.getByRole('combobox', {
      name: 'Translation language',
    });
    await user.selectOptions(picker, 'pl');
    expect(localStorage.getItem('govori.learnlang')).toBe('pl');
    expect(
      screen.getByRole('option', { name: 'Polski', selected: true }),
    ).toBeDefined();
  });
});

describe('ui language', () => {
  it('switches the interface language from settings', async () => {
    stubOfflineApi();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeDefined();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Interface language' }),
      'isv',
    );
    expect(localStorage.getItem('govori.lang')).toBe('isv');
    expect(screen.getByRole('heading', { name: 'Nastrojenja' })).toBeDefined();
  });
});
