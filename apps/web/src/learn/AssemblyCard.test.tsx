import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Assembly } from './exercises';
import { AssemblyCard } from './AssemblyCard';

const assembly: Assembly = {
  itemId: 'cccccccc-0000-4000-8000-000000000009',
  tokens: ['čista.', 'Voda', 'je'],
  answer: ['Voda', 'je', 'čista.'],
  translation: 'The water is clean.',
};

describe('AssemblyCard', () => {
  it('assembles the sentence in order and grades well', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <AssemblyCard assembly={assembly} script="latin" onGrade={onGrade} />,
    );
    expect(screen.getByText('The water is clean.')).toBeDefined();
    const bank = screen.getByRole('group', { name: 'Word bank' });
    await user.click(within(bank).getByRole('button', { name: 'Voda' }));
    await user.click(within(bank).getByRole('button', { name: 'je' }));
    await user.click(within(bank).getByRole('button', { name: 'čista.' }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Correct/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('good');
  });

  it('lets a word return to the bank before checking', async () => {
    const user = userEvent.setup();
    render(
      <AssemblyCard assembly={assembly} script="latin" onGrade={vi.fn()} />,
    );
    const bank = screen.getByRole('group', { name: 'Word bank' });
    await user.click(within(bank).getByRole('button', { name: 'Voda' }));
    const built = screen.getByRole('group', { name: 'Your sentence' });
    await user.click(within(built).getByRole('button', { name: 'Voda' }));
    expect(within(bank).getByRole('button', { name: 'Voda' })).toBeDefined();
    expect(within(built).queryByRole('button')).toBeNull();
  });

  it('marks a wrong order and grades again', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <AssemblyCard assembly={assembly} script="latin" onGrade={onGrade} />,
    );
    const bank = screen.getByRole('group', { name: 'Word bank' });
    await user.click(within(bank).getByRole('button', { name: 'je' }));
    await user.click(within(bank).getByRole('button', { name: 'Voda' }));
    await user.click(within(bank).getByRole('button', { name: 'čista.' }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Voda je čista\./)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('again');
  });

  it('renders the bank in Cyrillic when asked', () => {
    render(
      <AssemblyCard assembly={assembly} script="cyrillic" onGrade={vi.fn()} />,
    );
    const bank = screen.getByRole('group', { name: 'Word bank' });
    expect(within(bank).getByRole('button', { name: 'Вода' })).toBeDefined();
  });
});
