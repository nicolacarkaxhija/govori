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
const fetchSentencesMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchLesson: fetchLessonMock,
  fetchLessonSentences: fetchSentencesMock,
}));

describe('LessonView', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchLessonMock.mockReset();
    fetchSentencesMock.mockReset();
    fetchSentencesMock.mockResolvedValue([]);
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
    expect(screen.getByText('1-day streak')).toBeDefined();
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

describe('LessonView cloze rotation', () => {
  it('offers a cloze after typed when a sentence matches the pool', async () => {
    const user = userEvent.setup();
    fetchLessonMock.mockResolvedValue({ title: 'Lekcija 1', items });
    fetchSentencesMock.mockResolvedValue([
      {
        id: 'bbbbbbbb-0000-4000-8000-000000000009',
        kind: 'sentence',
        text: 'Ja pijų vodų.',
        translations: [{ lang: 'en', text: 'I drink water.' }],
      },
    ]);
    render(
      <LessonView
        lessonId="9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    // choices → typed → cloze; miss the typed answer to keep items due.
    await user.click(await screen.findByRole('button', { name: 'water' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText(/Type it in Interslavic/), 'zzz');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('fill the blank')).toBeDefined();
    expect(screen.getByText('I drink water.')).toBeDefined();
    await user.type(screen.getByLabelText(/Type the missing word/), 'vodu');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Pravilno/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('3 answered')).toBeDefined();
  });
});
