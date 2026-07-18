import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GrowingCourseBanner } from './GrowingCourseBanner';

describe('GrowingCourseBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('invites contributions and links to the contribute view', async () => {
    const user = userEvent.setup();
    const onContribute = vi.fn();
    render(<GrowingCourseBanner onContribute={onContribute} />);
    expect(screen.getByText(/help it grow/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Contribute' }));
    expect(onContribute).toHaveBeenCalledTimes(1);
  });

  it('dismisses and stays dismissed on the next mount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<GrowingCourseBanner onContribute={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/help it grow/)).toBeNull();
    unmount();
    render(<GrowingCourseBanner onContribute={vi.fn()} />);
    expect(screen.queryByText(/help it grow/)).toBeNull();
  });
});
