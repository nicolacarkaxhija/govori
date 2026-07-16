import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LearnItem } from '../api/client';
import { LessonView } from './LessonView';

const items: LearnItem[] = [
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000001',
    kind: 'word',
    text: 'voda',
    translations: [{ lang: 'en', text: 'water' }],
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000002',
    kind: 'word',
    text: 'hlěb',
    translations: [{ lang: 'en', text: 'bread' }],
  },
];

const fetchItemsMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({ fetchItems: fetchItemsMock }));

describe('LessonView', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchItemsMock.mockReset();
  });

  it('reports an unreachable server', async () => {
    fetchItemsMock.mockResolvedValue(null);
    render(<LessonView script="latin" onExit={vi.fn()} />);
    expect(await screen.findByText(/unreachable/)).toBeDefined();
  });

  it('walks due items to completion', async () => {
    const user = userEvent.setup();
    fetchItemsMock.mockResolvedValue([items[0]]);
    render(<LessonView script="latin" onExit={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'voda' })).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'water' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/Vse gotovo/)).toBeDefined();
    expect(screen.getByText('1 answered')).toBeDefined();
  });

  it('reports an empty content pool', async () => {
    fetchItemsMock.mockResolvedValue([]);
    render(<LessonView script="latin" onExit={vi.fn()} />);
    expect(await screen.findByText(/No content yet/)).toBeDefined();
  });

  it('lets the learner leave through the back control', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    fetchItemsMock.mockResolvedValue(items);
    render(<LessonView script="latin" onExit={onExit} />);
    await screen.findByRole('heading', { name: 'voda' });
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(onExit).toHaveBeenCalled();
  });
});
