import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LearnItem } from '../api/client';
import { loadEvents } from '../learn/progress';
import { SpeedReviewView } from './SpeedReviewView';

const fetchItemsMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchItems: fetchItemsMock,
}));

const pool: LearnItem[] = [
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    kind: 'word',
    text: 'hlěb',
    translations: [{ lang: 'en', text: 'bread' }],
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000002',
    kind: 'word',
    text: 'voda',
    translations: [{ lang: 'en', text: 'water' }],
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000003',
    kind: 'word',
    text: 'mlěko',
    translations: [{ lang: 'en', text: 'milk' }],
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000004',
    kind: 'word',
    text: 'sųd',
    translations: [{ lang: 'en', text: 'court' }],
  },
];

const byPair: Record<string, string> = {
  hlěb: 'bread',
  voda: 'water',
  mlěko: 'milk',
  sud: 'court',
};

/** Fake timers freeze waitFor, so settle the fetch by flushing microtasks. */
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('SpeedReviewView', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchItemsMock.mockReset().mockResolvedValue(pool);
    // Testing-library drains its microtask queue behind a zero setTimeout
    // and only advances fake timers through a `jest` global — bridge it.
    vi.stubGlobal('jest', {
      advanceTimersByTime: (ms: number) => {
        vi.advanceTimersByTime(ms);
      },
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down and calls time', async () => {
    render(<SpeedReviewView script="latin" learnLang="en" onExit={vi.fn()} />);
    await flush();
    expect(screen.getByText('30 s left')).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('29 s left')).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(29000);
    });
    expect(screen.getByText(/Time is up/)).toBeDefined();
    // Score in the top bar and on the closing panel.
    expect(screen.getAllByText('Boards cleared: 0')).toHaveLength(2);
  });

  it('records grades and counts a cleared board', async () => {
    const user = userEvent.setup({
      delay: null,
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    render(<SpeedReviewView script="latin" learnLang="en" onExit={vi.fn()} />);
    await flush();
    const isvColumn = screen.getByRole('group', { name: 'Interslavic' });
    const words = Array.from(isvColumn.querySelectorAll('button')).map(
      (button) => button.textContent,
    );
    for (const word of words) {
      await user.click(screen.getByRole('button', { name: word }));
      const translation = byPair[word] ?? byPair[word.normalize('NFC')] ?? '';
      await user.click(screen.getByRole('button', { name: translation }));
    }
    expect(screen.getByText('Boards cleared: 1')).toBeDefined();
    expect(loadEvents()).toHaveLength(4);
  });

  it('hides the shrinking bar under reduced motion', async () => {
    const { container, unmount } = render(
      <SpeedReviewView script="latin" learnLang="en" onExit={vi.fn()} />,
    );
    await flush();
    expect(container.querySelector('.speed-bar')).not.toBeNull();
    unmount();

    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: true, media: query })),
    );
    const { container: reduced } = render(
      <SpeedReviewView script="latin" learnLang="en" onExit={vi.fn()} />,
    );
    await flush();
    expect(reduced.querySelector('.speed-bar')).toBeNull();
  });

  it('reports an unreachable server', async () => {
    fetchItemsMock.mockResolvedValue(null);
    render(<SpeedReviewView script="latin" learnLang="en" onExit={vi.fn()} />);
    await flush();
    expect(screen.getByText(/unreachable/)).toBeDefined();
  });

  it('needs a pool that can fill a board', async () => {
    fetchItemsMock.mockResolvedValue(pool.slice(0, 2));
    render(<SpeedReviewView script="latin" learnLang="en" onExit={vi.fn()} />);
    await flush();
    expect(screen.getByText(/unreachable/)).toBeDefined();
  });
});
