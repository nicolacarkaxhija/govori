import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PendingRecording } from '../api/client';
import { AudioReviewView } from './AudioReviewView';

const fetchPendingAudioMock = vi.hoisted(() => vi.fn());
const castAudioVoteMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchPendingAudio: fetchPendingAudioMock,
  castAudioVote: castAudioVoteMock,
  recordingUrl: (id: string) => `https://api.test/audio/${id}`,
}));

class FakeAudio {
  static playedSrc: string | null = null;
  play: () => Promise<void>;
  constructor(public src: string) {
    this.play = () => {
      FakeAudio.playedSrc = this.src;
      return Promise.resolve();
    };
  }
}

const entry: PendingRecording = {
  id: 'rec-1',
  mime: 'audio/webm',
  item: {
    id: 'cccccccc-0000-4000-8000-000000000001',
    kind: 'word',
    text: 'dom',
    translations: [{ lang: 'en', text: 'house' }],
  },
  upvotes: 2,
  downvotes: 1,
  myVote: null,
};

beforeEach(() => {
  fetchPendingAudioMock.mockReset();
  castAudioVoteMock.mockReset();
  FakeAudio.playedSrc = null;
  vi.stubGlobal('Audio', FakeAudio);
});

describe('AudioReviewView', () => {
  it('lists pending clips with text, translation, tallies, and play', async () => {
    fetchPendingAudioMock.mockResolvedValue([entry]);
    render(
      <AudioReviewView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />,
    );
    expect(await screen.findByText('dom')).toBeDefined();
    expect(screen.getByText('house')).toBeDefined();
    expect(screen.getByRole('button', { name: /Vote for.*2/ })).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Vote against.*1/ }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Listen' })).toBeDefined();
  });

  it('plays a pending clip by its recording id', async () => {
    fetchPendingAudioMock.mockResolvedValue([entry]);
    const user = userEvent.setup();
    render(
      <AudioReviewView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />,
    );
    await user.click(await screen.findByRole('button', { name: 'Listen' }));
    expect(FakeAudio.playedSrc).toBe('https://api.test/audio/rec-1');
  });

  it('votes and takes the fresh tally from the response', async () => {
    fetchPendingAudioMock.mockResolvedValue([entry]);
    castAudioVoteMock.mockResolvedValue({
      upvotes: 3,
      downvotes: 1,
      status: 'pending',
    });
    const user = userEvent.setup();
    render(
      <AudioReviewView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />,
    );
    await user.click(await screen.findByRole('button', { name: /Vote for/ }));
    expect(castAudioVoteMock).toHaveBeenCalledWith('rec-1', true);
    const up = await screen.findByRole('button', { name: /Vote for.*3/ });
    expect(up.dataset.state).toBe('correct');
  });

  it('drops a clip from the queue once a vote verifies it', async () => {
    fetchPendingAudioMock.mockResolvedValue([entry]);
    castAudioVoteMock.mockResolvedValue({
      upvotes: 3,
      downvotes: 0,
      status: 'verified',
    });
    const user = userEvent.setup();
    render(
      <AudioReviewView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />,
    );
    await user.click(await screen.findByRole('button', { name: /Vote for/ }));
    expect(
      await screen.findByText('Nothing is waiting for votes.'),
    ).toBeDefined();
  });

  it('marks an existing vote on arrival', async () => {
    fetchPendingAudioMock.mockResolvedValue([{ ...entry, myVote: false }]);
    render(
      <AudioReviewView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />,
    );
    const down = await screen.findByRole('button', { name: /Vote against/ });
    expect(down.dataset.state).toBe('incorrect');
  });

  it('keeps the old tallies when the vote does not land', async () => {
    fetchPendingAudioMock.mockResolvedValue([entry]);
    castAudioVoteMock.mockResolvedValue(null);
    const user = userEvent.setup();
    render(
      <AudioReviewView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />,
    );
    await user.click(await screen.findByRole('button', { name: /Vote for/ }));
    expect(
      screen.getByRole('button', { name: /Vote for.*2/ }).dataset.state,
    ).toBe('open');
  });

  it('scopes tallies per clip', async () => {
    const second: PendingRecording = {
      ...entry,
      id: 'rec-2',
      item: {
        id: 'cccccccc-0000-4000-8000-000000000002',
        kind: 'word',
        text: 'grad',
        translations: [{ lang: 'en', text: 'city' }],
      },
      upvotes: 0,
      downvotes: 0,
    };
    fetchPendingAudioMock.mockResolvedValue([entry, second]);
    castAudioVoteMock.mockResolvedValue({
      upvotes: 1,
      downvotes: 0,
      status: 'pending',
    });
    const user = userEvent.setup();
    render(
      <AudioReviewView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />,
    );
    const rows = await screen.findAllByRole('listitem');
    const secondRow = rows[1];
    if (secondRow === undefined) throw new Error('missing row');
    await user.click(
      within(secondRow).getByRole('button', { name: /Vote for/ }),
    );
    expect(castAudioVoteMock).toHaveBeenCalledWith('rec-2', true);
    expect(
      within(secondRow).getByRole('button', { name: /Vote for.*1/ }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /Vote for.*2/ })).toBeDefined();
  });

  it('asks signed-out visitors to sign in', async () => {
    fetchPendingAudioMock.mockResolvedValue('unauthenticated');
    const onSignIn = vi.fn();
    const user = userEvent.setup();
    render(
      <AudioReviewView script="latin" onExit={vi.fn()} onSignIn={onSignIn} />,
    );
    expect(await screen.findByText('Sign in to vote.')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalled();
  });

  it('reports an unreachable queue', async () => {
    fetchPendingAudioMock.mockResolvedValue(null);
    render(
      <AudioReviewView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />,
    );
    expect(await screen.findByText(/unreachable right now/)).toBeDefined();
  });

  it('celebrates an empty queue', async () => {
    fetchPendingAudioMock.mockResolvedValue([]);
    render(
      <AudioReviewView script="latin" onExit={vi.fn()} onSignIn={vi.fn()} />,
    );
    expect(
      await screen.findByText('Nothing is waiting for votes.'),
    ).toBeDefined();
  });

  it('leaves through the back control', async () => {
    fetchPendingAudioMock.mockResolvedValue([]);
    const onExit = vi.fn();
    const user = userEvent.setup();
    render(
      <AudioReviewView script="latin" onExit={onExit} onSignIn={vi.fn()} />,
    );
    await screen.findByText('Nothing is waiting for votes.');
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(onExit).toHaveBeenCalled();
  });
});
