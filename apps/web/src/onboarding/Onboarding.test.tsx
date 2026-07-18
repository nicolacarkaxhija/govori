import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Onboarding } from './Onboarding';

describe('Onboarding', () => {
  it('walks the two steps: pick a language, then confirm no account is needed', async () => {
    const user = userEvent.setup();
    const setLearnLang = vi.fn();
    const onDone = vi.fn();
    render(
      <Onboarding learnLang="en" setLearnLang={setLearnLang} onDone={onDone} />,
    );

    await user.selectOptions(
      screen.getByLabelText(/Which language do you already speak/),
      'pl',
    );
    expect(setLearnLang).toHaveBeenCalledWith('pl');

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/No account needed/)).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Start learning' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
