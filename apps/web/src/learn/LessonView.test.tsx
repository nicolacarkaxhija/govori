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

const fetchLessonMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({ fetchLesson: fetchLessonMock }));

describe('LessonView', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchLessonMock.mockReset();
  });

  it('reports an unreachable server', async () => {
    fetchLessonMock.mockResolvedValue(null);
    render(
      <LessonView
        lessonId="9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    expect(await screen.findByText(/unreachable/)).toBeDefined();
  });

  it('walks due items to completion', async () => {
    const user = userEvent.setup();
    fetchLessonMock.mockResolvedValue({
      title: 'Lekcija 1',
      items: [items[0]],
    });
    render(
      <LessonView
        lessonId="9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'voda' })).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'water' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/Vse gotovo/)).toBeDefined();
    expect(screen.getByText('1 answered')).toBeDefined();
  });

  it('lets the learner leave through the back control', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    fetchLessonMock.mockResolvedValue({ title: 'Lekcija 1', items });
    render(
      <LessonView
        lessonId="9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f"
        script="latin"
        onExit={onExit}
      />,
    );
    await screen.findByRole('heading', { name: 'voda' });
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(onExit).toHaveBeenCalled();
  });
});
