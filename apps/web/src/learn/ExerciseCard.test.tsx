import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LearnItem } from '../api/client';
import { ExerciseCard } from './ExerciseCard';

const target: LearnItem = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  kind: 'word',
  text: 'hlěb',
  translations: [{ lang: 'en', text: 'bread' }],
};

const pool: LearnItem[] = [
  target,
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
];

describe('ExerciseCard', () => {
  it('renders the prompt in the selected script', () => {
    const { rerender } = render(
      <ExerciseCard
        item={target}
        pool={pool}
        script="latin"
        mode="choices"
        onGrade={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'hlěb' })).toBeDefined();
    rerender(
      <ExerciseCard
        item={target}
        pool={pool}
        script="cyrillic"
        mode="choices"
        onGrade={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'хлєб' })).toBeDefined();
  });

  it('grades a correct choice as good after continue', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <ExerciseCard
        item={target}
        pool={pool}
        script="latin"
        mode="choices"
        onGrade={onGrade}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'bread' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('good');
  });

  it('grades a wrong choice as again and reveals the answer', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <ExerciseCard
        item={target}
        pool={pool}
        script="latin"
        mode="choices"
        onGrade={onGrade}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'water' }));
    expect(screen.getByText(/Ne sovsěm/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('again');
  });

  it('locks the card once answered', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <ExerciseCard
        item={target}
        pool={pool}
        script="latin"
        mode="choices"
        onGrade={onGrade}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'bread' }));
    await user.click(screen.getByRole('button', { name: 'water' }));
    expect(screen.getAllByText(/Pravilno/)).toHaveLength(1);
  });

  it('accepts tolerant typed answers', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <ExerciseCard
        item={target}
        pool={pool}
        script="latin"
        mode="typed"
        onGrade={onGrade}
      />,
    );
    await user.type(screen.getByLabelText(/Type it in Interslavic/), 'hleb');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Pravilno/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('good');
  });
});
