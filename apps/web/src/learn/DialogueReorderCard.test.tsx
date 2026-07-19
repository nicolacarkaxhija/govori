import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LessonDialogue } from '../api/client';
import { DialogueReorderCard } from './DialogueReorderCard';

const dialogue: LessonDialogue = {
  turns: [
    { speaker: 'Ana', text: 'Dobry denj!', translation: 'Good day!' },
    { speaker: 'Boris', text: 'Kako se maješ?', translation: 'How are you?' },
    { speaker: 'Ana', text: 'Dobro, hvala.', translation: 'Fine, thanks.' },
  ],
  provenance: { origin: 'ai-draft' },
};

describe('DialogueReorderCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers every turn in the bank, none placed yet', () => {
    render(
      <DialogueReorderCard
        dialogue={dialogue}
        script="latin"
        onDone={vi.fn()}
      />,
    );
    const bank = screen.getByRole('group', { name: 'Dialogue lines' });
    expect(within(bank).getAllByRole('button')).toHaveLength(3);
    const built = screen.getByRole('group', { name: 'Your dialogue' });
    expect(within(built).queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Check' })).toBeDefined();
  });

  it('confirms the true order and reports success', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(
      <DialogueReorderCard
        dialogue={dialogue}
        script="latin"
        onDone={onDone}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Dobry denj/ }));
    await user.click(screen.getByRole('button', { name: /Kako se maješ/ }));
    await user.click(screen.getByRole('button', { name: /Dobro, hvala/ }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Correct/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onDone).toHaveBeenCalledWith(true);
  });

  it('lets a placed turn go back to the bank', async () => {
    const user = userEvent.setup();
    render(
      <DialogueReorderCard
        dialogue={dialogue}
        script="latin"
        onDone={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Dobry denj/ }));
    const built = screen.getByRole('group', { name: 'Your dialogue' });
    expect(within(built).getAllByRole('button')).toHaveLength(1);
    await user.click(within(built).getByRole('button', { name: /Dobry denj/ }));
    expect(within(built).queryAllByRole('button')).toHaveLength(0);
  });

  it('marks a wrong order and reports failure', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(
      <DialogueReorderCard
        dialogue={dialogue}
        script="latin"
        onDone={onDone}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Kako se maješ/ }));
    await user.click(screen.getByRole('button', { name: /Dobry denj/ }));
    await user.click(screen.getByRole('button', { name: /Dobro, hvala/ }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Not quite/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onDone).toHaveBeenCalledWith(false);
  });
});
