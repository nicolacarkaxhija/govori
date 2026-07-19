import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LearnItem } from '../api/client';
import { MorphologyCard } from './MorphologyCard';

const fetchFormsMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchForms: fetchFormsMock,
}));

const item: LearnItem = {
  id: 'bbbbbbbb-0000-4000-8000-000000000001',
  kind: 'word',
  text: 'dom',
  translations: [{ lang: 'en', text: 'house' }],
};

describe('MorphologyCard', () => {
  beforeEach(() => {
    fetchFormsMock.mockReset().mockResolvedValue([
      { tag: 'pl', text: 'domy' },
      { tag: 'xx-unknown', text: 'doma' },
    ]);
  });

  it('bows out for items without drillable forms', async () => {
    fetchFormsMock.mockResolvedValue([{ tag: 'xx-unknown', text: 'doma' }]);
    const onUnavailable = vi.fn();
    render(
      <MorphologyCard
        item={item}
        script="latin"
        lang="en"
        onGrade={vi.fn()}
        onUnavailable={onUnavailable}
      />,
    );
    await vi.waitFor(() => {
      expect(onUnavailable).toHaveBeenCalledTimes(1);
    });
  });

  it('grades a tolerant typed form', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <MorphologyCard
        item={item}
        script="latin"
        lang="en"
        onGrade={onGrade}
        onUnavailable={vi.fn()}
      />,
    );
    expect(await screen.findByText(/plural/)).toBeDefined();
    expect(screen.getByText('dom')).toBeDefined();
    await user.type(screen.getByLabelText(/plural/), 'domy');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Correct/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('good');
  });

  it('marks a wrong form and grades again', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <MorphologyCard
        item={item}
        script="latin"
        lang="en"
        onGrade={onGrade}
        onUnavailable={vi.fn()}
      />,
    );
    await screen.findByText(/plural/);
    await user.type(screen.getByLabelText(/plural/), 'domov');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/domy/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('again');
  });
});
