import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LearnItem } from '../api/client';
import { loadEvents } from '../learn/progress';
import { entryFor } from './journal';
import { JournalView } from './JournalView';

const fetchItemsMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({ fetchItems: fetchItemsMock }));

const items: LearnItem[] = [
  {
    id: 'cccccccc-0000-4000-8000-000000000001',
    kind: 'word',
    text: 'voda',
    translations: [{ lang: 'en', text: 'water' }],
  },
  {
    id: 'cccccccc-0000-4000-8000-000000000002',
    kind: 'word',
    text: 'hlěb',
    translations: [{ lang: 'en', text: 'bread' }],
  },
  {
    id: 'cccccccc-0000-4000-8000-000000000003',
    kind: 'word',
    text: 'mlěko',
    translations: [{ lang: 'en', text: 'milk' }],
  },
];

describe('JournalView', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchItemsMock.mockReset().mockResolvedValue(items);
  });

  it('shows a daily prompt and suggested due words', async () => {
    render(<JournalView script="latin" learnLang="en" onExit={vi.fn()} />);
    expect(await screen.findByText('water')).toBeDefined();
    expect(screen.getByText('bread')).toBeDefined();
  });

  it('saves the entry and credits a suggested word used in the text', async () => {
    const user = userEvent.setup();
    render(<JournalView script="latin" learnLang="en" onExit={vi.fn()} />);
    await screen.findByText('water');
    await user.type(
      screen.getByLabelText(/Write a few lines/),
      'Dnes ja pil vodu.',
    );
    await user.click(screen.getByRole('button', { name: /Save/ }));
    expect(screen.getByText(/Nice work today/)).toBeDefined();
    expect(entryFor(new Date().toISOString().slice(0, 10))?.text).toContain(
      'vodu',
    );
    const credited = loadEvents().filter(
      (event) => event.itemId === items[0]?.id && event.grade === 'good',
    );
    expect(credited).toHaveLength(1);
  });

  it('does not credit words the entry never used', async () => {
    const user = userEvent.setup();
    render(<JournalView script="latin" learnLang="en" onExit={vi.fn()} />);
    await screen.findByText('water');
    await user.type(screen.getByLabelText(/Write a few lines/), 'Ničto tut.');
    await user.click(screen.getByRole('button', { name: /Save/ }));
    expect(loadEvents()).toHaveLength(0);
  });

  it('still writes when the item feed is unreachable', async () => {
    const user = userEvent.setup();
    fetchItemsMock.mockResolvedValue(null);
    render(<JournalView script="latin" learnLang="en" onExit={vi.fn()} />);
    await user.type(screen.getByLabelText(/Write a few lines/), 'Samo tekst.');
    await user.click(screen.getByRole('button', { name: /Save/ }));
    expect(screen.getByText(/Nice work today/)).toBeDefined();
  });
});
