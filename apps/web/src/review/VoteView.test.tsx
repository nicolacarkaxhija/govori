import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PendingVote } from '../api/client';
import { VoteView } from './VoteView';

const fetchPendingVotesMock = vi.hoisted(() => vi.fn());
const castVoteMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchPendingVotes: fetchPendingVotesMock,
  castVote: castVoteMock,
}));

const entry: PendingVote = {
  item: {
    id: 'cccccccc-0000-4000-8000-000000000001',
    kind: 'sentence',
    text: 'Ja pijų vodų.',
    translations: [{ lang: 'en', text: 'I drink water.' }],
  },
  upvotes: 2,
  downvotes: 1,
  myVote: null,
};

describe('VoteView', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchPendingVotesMock.mockReset();
    castVoteMock.mockReset();
  });

  it('lists drafts with their text, translation, and tallies', async () => {
    fetchPendingVotesMock.mockResolvedValue([entry]);
    render(<VoteView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />);
    expect(await screen.findByText('Ja piju vodu.')).toBeDefined();
    expect(screen.getByText('I drink water.')).toBeDefined();
    expect(screen.getByRole('button', { name: /Vote for.*2/ })).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Vote against.*1/ }),
    ).toBeDefined();
  });

  it('renders the draft in the chosen script', async () => {
    fetchPendingVotesMock.mockResolvedValue([entry]);
    render(<VoteView script="cyrillic" onExit={vi.fn()} onSignIn={vi.fn()} />);
    expect(await screen.findByText('Ја пију воду.')).toBeDefined();
  });

  it('casts a vote and takes the tallies from the response', async () => {
    fetchPendingVotesMock.mockResolvedValue([entry]);
    castVoteMock.mockResolvedValue({ upvotes: 3, downvotes: 1 });
    const user = userEvent.setup();
    render(<VoteView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />);
    const up = await screen.findByRole('button', { name: /Vote for/ });
    await user.click(up);
    expect(castVoteMock).toHaveBeenCalledWith(entry.item.id, true);
    expect(
      await screen.findByRole('button', { name: /Vote for.*3/ }),
    ).toBeDefined();
    // The fresh vote is reflected on the button state.
    expect(
      screen.getByRole('button', { name: /Vote for.*3/ }).dataset.state,
    ).toBe('correct');
  });

  it('marks an existing vote on arrival', async () => {
    fetchPendingVotesMock.mockResolvedValue([{ ...entry, myVote: false }]);
    render(<VoteView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />);
    const down = await screen.findByRole('button', { name: /Vote against/ });
    expect(down.dataset.state).toBe('incorrect');
  });

  it('keeps the old tallies when the vote does not land', async () => {
    fetchPendingVotesMock.mockResolvedValue([entry]);
    castVoteMock.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<VoteView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: /Vote for/ }));
    expect(
      screen.getByRole('button', { name: /Vote for.*2/ }).dataset.state,
    ).toBe('open');
  });

  it('asks signed-out visitors to sign in', async () => {
    fetchPendingVotesMock.mockResolvedValue('unauthenticated');
    const onSignIn = vi.fn();
    const user = userEvent.setup();
    render(<VoteView script="latin" onExit={vi.fn()} onSignIn={onSignIn} />);
    expect(await screen.findByText('Sign in to vote.')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalled();
  });

  it('reports an unreachable queue', async () => {
    fetchPendingVotesMock.mockResolvedValue(null);
    render(<VoteView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />);
    expect(await screen.findByText(/unreachable right now/)).toBeDefined();
  });

  it('celebrates an empty queue', async () => {
    fetchPendingVotesMock.mockResolvedValue([]);
    render(<VoteView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />);
    expect(
      await screen.findByText('Nothing is waiting for votes.'),
    ).toBeDefined();
  });

  it('lets the visitor leave through the back control', async () => {
    fetchPendingVotesMock.mockResolvedValue([]);
    const onExit = vi.fn();
    const user = userEvent.setup();
    render(<VoteView script="latin" onExit={onExit} onSignIn={vi.fn()} />);
    await screen.findByText('Nothing is waiting for votes.');
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(onExit).toHaveBeenCalled();
  });
});

describe('VoteView vote grouping', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchPendingVotesMock.mockReset();
    castVoteMock.mockReset();
  });

  it('scopes tallies per draft', async () => {
    const second: PendingVote = {
      item: {
        id: 'cccccccc-0000-4000-8000-000000000002',
        kind: 'word',
        text: 'sněg',
        translations: [{ lang: 'en', text: 'snow' }],
      },
      upvotes: 0,
      downvotes: 0,
      myVote: null,
    };
    fetchPendingVotesMock.mockResolvedValue([entry, second]);
    castVoteMock.mockResolvedValue({ upvotes: 1, downvotes: 0 });
    const user = userEvent.setup();
    render(<VoteView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />);
    const rows = await screen.findAllByRole('listitem');
    const secondRow = rows[1];
    if (secondRow === undefined) throw new Error('missing row');
    await user.click(
      within(secondRow).getByRole('button', { name: /Vote for/ }),
    );
    expect(castVoteMock).toHaveBeenCalledWith(second.item.id, true);
    expect(
      within(secondRow).getByRole('button', { name: /Vote for.*1/ }),
    ).toBeDefined();
    // The first draft's tallies are untouched.
    expect(screen.getByRole('button', { name: /Vote for.*2/ })).toBeDefined();
  });
});
