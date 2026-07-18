import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LearnItem } from '../api/client';
import { MatchingCard } from './MatchingCard';

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

describe('MatchingCard', () => {
  it('completes with good grades when every match is right first try', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<MatchingCard pool={pool} script="latin" onComplete={onComplete} />);
    const isvColumn = screen.getByRole('group', { name: 'Interslavic' });
    const words = Array.from(isvColumn.querySelectorAll('button')).map(
      (button) => button.textContent,
    );
    for (const word of words) {
      await user.click(screen.getByRole('button', { name: word }));
      const translation = byPair[word] ?? byPair[word.normalize('NFC')] ?? '';
      await user.click(screen.getByRole('button', { name: translation }));
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
    const results = onComplete.mock.calls[0]?.[0] as {
      itemId: string;
      grade: string;
    }[];
    expect(results).toHaveLength(4);
    expect(results.every((result) => result.grade === 'good')).toBe(true);
  });

  it('marks missed pairs for relearning', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<MatchingCard pool={pool} script="latin" onComplete={onComplete} />);
    // Deliberately wrong first: hlěb → water.
    await user.click(screen.getByRole('button', { name: 'hlěb' }));
    await user.click(screen.getByRole('button', { name: 'water' }));
    const isvColumn = screen.getByRole('group', { name: 'Interslavic' });
    const words = Array.from(isvColumn.querySelectorAll('button')).map(
      (button) => button.textContent,
    );
    for (const word of words) {
      await user.click(screen.getByRole('button', { name: word }));
      await user.click(
        screen.getByRole('button', { name: byPair[word] ?? '' }),
      );
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
    const results = onComplete.mock.calls[0]?.[0] as {
      itemId: string;
      grade: string;
    }[];
    const again = results.filter((result) => result.grade === 'again');
    expect(again.map((result) => result.itemId).sort()).toEqual([
      'aaaaaaaa-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000000002',
    ]);
  });
});

describe('MatchingCard learner language', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('labels the translation column in the learner language', () => {
    const polishPool: LearnItem[] = pool.map((item, index) => ({
      ...item,
      translations:
        index === 0
          ? item.translations
          : [...item.translations, { lang: 'pl', text: `pl-${item.text}` }],
    }));
    render(
      <MatchingCard
        pool={polishPool}
        script="latin"
        lang="pl"
        onComplete={vi.fn()}
      />,
    );
    const column = screen.getByRole('group', { name: 'translations' });
    const labels = Array.from(column.querySelectorAll('button')).map(
      (button) => button.textContent,
    );
    expect(labels).toContain('pl-voda');
    // The first item has no Polish translation: English fills the gap.
    expect(labels).toContain('bread');
  });
});
