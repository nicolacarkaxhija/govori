import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('ExerciseCard reverse direction', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('prompts with the translation and offers Interslavic words', () => {
    render(
      <ExerciseCard
        item={target}
        pool={pool}
        script="latin"
        mode="reverseChoices"
        onGrade={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'bread' })).toBeDefined();
    expect(screen.getByRole('group', { name: 'Interslavic' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'hlěb' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'voda' })).toBeDefined();
  });

  it('renders the word choices in the selected script', () => {
    render(
      <ExerciseCard
        item={target}
        pool={pool}
        script="cyrillic"
        mode="reverseChoices"
        onGrade={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'хлєб' })).toBeDefined();
  });

  it('grades picking the right word as good after continue', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <ExerciseCard
        item={target}
        pool={pool}
        script="latin"
        mode="reverseChoices"
        onGrade={onGrade}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'hlěb' }));
    expect(screen.getByText(/Pravilno/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('good');
  });

  it('grades picking a distractor as again and reveals the answer', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <ExerciseCard
        item={target}
        pool={pool}
        script="latin"
        mode="reverseChoices"
        onGrade={onGrade}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'voda' }));
    expect(screen.getByText(/Ne sovsěm/)).toBeDefined();
    expect(screen.getByText('bread')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('again');
  });

  it('accepts a typed Interslavic answer for the shown translation', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <ExerciseCard
        item={target}
        pool={pool}
        script="latin"
        mode="reverseTyped"
        onGrade={onGrade}
      />,
    );
    expect(screen.getByRole('heading', { name: 'bread' })).toBeDefined();
    await user.type(screen.getByLabelText(/Type it in Interslavic/), 'хлєб');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Pravilno/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('good');
  });
});

describe('ExerciseCard learner language', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const polishTarget: LearnItem = {
    id: 'aaaaaaaa-0000-4000-8000-000000000011',
    kind: 'word',
    text: 'hlěb',
    translations: [
      { lang: 'en', text: 'bread' },
      { lang: 'pl', text: 'chleb' },
    ],
  };
  const polishPool: LearnItem[] = [
    polishTarget,
    {
      id: 'aaaaaaaa-0000-4000-8000-000000000012',
      kind: 'word',
      text: 'voda',
      translations: [
        { lang: 'en', text: 'water' },
        { lang: 'pl', text: 'woda' },
      ],
    },
    {
      id: 'aaaaaaaa-0000-4000-8000-000000000013',
      kind: 'word',
      text: 'mlěko',
      translations: [{ lang: 'en', text: 'milk' }],
    },
  ];

  it('offers choices in the learner language with English gap fallback', async () => {
    const user = userEvent.setup();
    render(
      <ExerciseCard
        item={polishTarget}
        pool={polishPool}
        script="latin"
        mode="choices"
        lang="pl"
        onGrade={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'woda' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'milk' })).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'chleb' }));
    expect(screen.getByText(/Pravilno/)).toBeDefined();
    expect(screen.getByText(/= chleb/)).toBeDefined();
  });

  it('prompts the reverse round with the learner language', () => {
    render(
      <ExerciseCard
        item={polishTarget}
        pool={polishPool}
        script="latin"
        mode="reverseChoices"
        lang="pl"
        onGrade={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'chleb' })).toBeDefined();
  });
});

describe('ExerciseCard contrastive notes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const noted: LearnItem = {
    id: 'aaaaaaaa-0000-4000-8000-000000000031',
    kind: 'word',
    text: 'čista',
    translations: [
      { lang: 'en', text: 'clean' },
      { lang: 'pl', text: 'czysta' },
    ],
    notes: [{ sourceLang: 'pl', text: 'čista ≈ czysta' }],
  };

  it('shows a note matching the learner language after answering', async () => {
    const user = userEvent.setup();
    render(
      <ExerciseCard
        item={noted}
        pool={[noted, ...pool]}
        script="latin"
        mode="choices"
        lang="pl"
        onGrade={vi.fn()}
      />,
    );
    expect(screen.queryByText('čista ≈ czysta')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'czysta' }));
    expect(screen.getByText('čista ≈ czysta')).toBeDefined();
  });

  it('keeps quiet when no note matches the learner language', async () => {
    const user = userEvent.setup();
    render(
      <ExerciseCard
        item={noted}
        pool={[noted, ...pool]}
        script="latin"
        mode="choices"
        onGrade={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'clean' }));
    expect(screen.queryByText('čista ≈ czysta')).toBeNull();
  });
});
