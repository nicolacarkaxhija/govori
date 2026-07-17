import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseView } from './CourseView';

const fetchCourseMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({ fetchCourse: fetchCourseMock }));

const LESSON_ID = '9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f';

describe('CourseView', () => {
  beforeEach(() => {
    fetchCourseMock.mockReset();
  });

  it('lists units and opens a lesson', async () => {
    fetchCourseMock.mockResolvedValue({
      units: [
        {
          id: '8b7c6d5e-4f3a-4b2c-9d1e-0f9a8b7c6d5e',
          title: 'Jedinica 1',
          lessons: [{ id: LESSON_ID, title: 'Lekcija 1', itemCount: 8 }],
        },
      ],
    });
    const onOpenLesson = vi.fn();
    const user = userEvent.setup();
    render(<CourseView onOpenLesson={onOpenLesson} onExit={vi.fn()} />);
    expect(await screen.findByText('Jedinica 1')).toBeDefined();
    expect(screen.getByText('8 words')).toBeDefined();
    await user.click(screen.getByRole('button', { name: /Lekcija 1/ }));
    expect(onOpenLesson).toHaveBeenCalledWith(LESSON_ID);
  });

  it('reports an unreachable server and empty course', async () => {
    fetchCourseMock.mockResolvedValue(null);
    render(<CourseView onOpenLesson={vi.fn()} onExit={vi.fn()} />);
    expect(await screen.findByText(/unreachable/)).toBeDefined();
    fetchCourseMock.mockResolvedValue({ units: [] });
    render(<CourseView onOpenLesson={vi.fn()} onExit={vi.fn()} />);
    expect(await screen.findByText(/No course yet/)).toBeDefined();
  });
});
