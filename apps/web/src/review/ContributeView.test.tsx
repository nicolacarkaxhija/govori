import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContributeView } from './ContributeView';

const contributeMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({ contribute: contributeMock }));

describe('ContributeView', () => {
  beforeEach(() => {
    contributeMock.mockReset();
  });

  it('sends a canonical suggestion and confirms', async () => {
    const user = userEvent.setup();
    contributeMock.mockResolvedValue('accepted');
    render(<ContributeView onExit={vi.fn()} onSignIn={vi.fn()} />);
    await user.type(screen.getByLabelText(/Interslavic/), 'sněg');
    await user.type(screen.getByLabelText(/English translation/), 'snow');
    await user.click(screen.getByRole('button', { name: 'Send for review' }));
    expect(contributeMock).toHaveBeenCalledWith(
      'word',
      'sněg',
      [{ lang: 'en', text: 'snow' }],
      'isv',
    );
    expect(await screen.findByText(/reviewer will look/)).toBeDefined();
  });

  it('blocks non-canonical text before the network', async () => {
    const user = userEvent.setup();
    render(<ContributeView onExit={vi.fn()} onSignIn={vi.fn()} />);
    await user.type(screen.getByLabelText(/Interslavic/), 'снег');
    await user.type(screen.getByLabelText(/English translation/), 'snow');
    await user.click(screen.getByRole('button', { name: 'Send for review' }));
    expect(contributeMock).not.toHaveBeenCalled();
    expect(screen.getByText(/canonical etymological Latin/)).toBeDefined();
  });

  it('offers sign-in when the server says unauthenticated', async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn();
    contributeMock.mockResolvedValue('unauthenticated');
    render(<ContributeView onExit={vi.fn()} onSignIn={onSignIn} />);
    await user.type(screen.getByLabelText(/Interslavic/), 'voda');
    await user.type(screen.getByLabelText(/English translation/), 'water');
    await user.click(screen.getByRole('button', { name: 'Send for review' }));
    expect(await screen.findByText('Sign in to contribute.')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});

describe('ContributeView failure copy', () => {
  it('reports a network failure', async () => {
    const user = userEvent.setup();
    contributeMock.mockResolvedValue('failed');
    render(<ContributeView onExit={vi.fn()} onSignIn={vi.fn()} />);
    await user.type(screen.getByLabelText(/Interslavic/), 'voda');
    await user.type(screen.getByLabelText(/English translation/), 'water');
    await user.click(screen.getByRole('button', { name: 'Send for review' }));
    expect(await screen.findByText(/Sending failed/)).toBeDefined();
  });
});

describe('ContributeView licensing', () => {
  it('states the CC BY-SA terms next to the submit button', () => {
    render(<ContributeView onExit={vi.fn()} onSignIn={vi.fn()} />);
    expect(screen.getByText(/keeps this course free to share/)).toBeDefined();
  });
});
