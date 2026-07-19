import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Production } from './exercises';
import { ProductionCard } from './ProductionCard';

const fetchMeMock = vi.hoisted(() => vi.fn());
const contributeMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchMe: fetchMeMock,
  contribute: contributeMock,
}));

const production: Production = {
  words: [
    { itemId: '1', text: 'voda', translation: 'water' },
    { itemId: '2', text: 'hlěb', translation: 'bread' },
  ],
};

describe('ProductionCard', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMeMock.mockReset().mockResolvedValue(null);
    contributeMock.mockReset();
  });

  it('shows the prompted words with their translations', () => {
    render(
      <ProductionCard
        production={production}
        script="latin"
        lang="en"
        onGrade={vi.fn()}
      />,
    );
    expect(screen.getByText('water')).toBeDefined();
    expect(screen.getByText('bread')).toBeDefined();
  });

  it('accepts a canonical sentence that uses every word, then self-grades', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <ProductionCard
        production={production}
        script="latin"
        lang="en"
        onGrade={onGrade}
      />,
    );
    await user.type(screen.getByLabelText(/Write a sentence/), 'voda i hlěb');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Pravilno/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onGrade).toHaveBeenCalledWith('good');
  });

  it('flags a sentence that misses a prompted word', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <ProductionCard
        production={production}
        script="latin"
        lang="en"
        onGrade={onGrade}
      />,
    );
    await user.type(screen.getByLabelText(/Write a sentence/), 'voda');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Use every prompted word/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Practise again' }));
    expect(onGrade).toHaveBeenCalledWith('again');
  });

  it('hides the community-review button when signed out', async () => {
    const user = userEvent.setup();
    render(
      <ProductionCard
        production={production}
        script="latin"
        lang="en"
        onGrade={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/Write a sentence/), 'voda i hlěb');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(
      screen.queryByRole('button', { name: /community review/ }),
    ).toBeNull();
  });
});

describe('ProductionCard signed in', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMeMock.mockReset().mockResolvedValue({
      user: { id: 'u1', email: 'a@b.co', role: 'learner' },
    });
    contributeMock.mockReset().mockResolvedValue('accepted');
  });

  it('offers community review and submits the sentence', async () => {
    const user = userEvent.setup();
    render(
      <ProductionCard
        production={production}
        script="latin"
        lang="pl"
        onGrade={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/Write a sentence/), 'voda i hlěb');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    const submit = await screen.findByRole('button', {
      name: /community review/,
    });
    expect(submit.hasAttribute('disabled')).toBe(true);
    await user.type(
      screen.getByLabelText(/English translation/),
      'water and bread',
    );
    await user.click(submit);
    expect(contributeMock).toHaveBeenCalledWith(
      'sentence',
      'voda i hlěb',
      [{ lang: 'pl', text: 'water and bread' }],
      'isv',
    );
    expect(await screen.findByText(/reviewer will look/)).toBeDefined();
  });
});
