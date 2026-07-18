import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Course } from '../api/client';
import { loadChecked, mondayOf } from './weeklyPlan';
import { WeeklyPlanView } from './WeeklyPlanView';

const fetchCourseMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({ fetchCourse: fetchCourseMock }));

const course: Course = {
  units: [
    {
      id: 'dddddddd-0000-4000-8000-000000000001',
      title: 'Pozdravy',
      lessons: [],
    },
    {
      id: 'dddddddd-0000-4000-8000-000000000002',
      title: 'Čísla',
      lessons: [],
    },
  ],
};

describe('WeeklyPlanView', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchCourseMock.mockReset().mockResolvedValue(course);
  });

  it('lays out Mon–Fri tasks and a weekend rest note', async () => {
    render(<WeeklyPlanView onExit={vi.fn()} />);
    expect(await screen.findByText('Monday')).toBeDefined();
    expect(screen.getByText('Friday')).toBeDefined();
    expect(screen.getAllByText(/Rest/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Answer 20 reviews').length).toBeGreaterThan(0);
  });

  it('drafts a study task from the picked interest unit', async () => {
    render(<WeeklyPlanView onExit={vi.fn()} />);
    expect(await screen.findAllByText('Study Pozdravy')).toBeDefined();
  });

  it('persists a checked task for the week', async () => {
    const user = userEvent.setup();
    render(<WeeklyPlanView onExit={vi.fn()} />);
    await screen.findByText('Monday');
    const [firstCheckbox] = screen.getAllByRole('checkbox');
    if (firstCheckbox === undefined) {
      throw new Error('no task checkboxes rendered');
    }
    await user.click(firstCheckbox);
    expect(loadChecked(mondayOf()).length).toBe(1);
  });
});
