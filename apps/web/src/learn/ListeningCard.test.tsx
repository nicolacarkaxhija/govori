import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LearnItem } from '../api/client';
import { ListeningCard } from './ListeningCard';

const fetchRecordingsMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchRecordings: fetchRecordingsMock,
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

const item: LearnItem = {
  id: 'bbbbbbbb-0000-4000-8000-000000000001',
  kind: 'word',
  text: 'sněg',
  translations: [{ lang: 'en', text: 'snow' }],
};

describe('ListeningCard', () => {
  beforeEach(() => {
    fetchRecordingsMock
      .mockReset()
      .mockResolvedValue([{ id: 'rec-1', mime: 'audio/webm' }]);
    FakeAudio.playedSrc = null;
    vi.stubGlobal('Audio', FakeAudio);
  });

  it('bows out when the item has no recordings yet', async () => {
    fetchRecordingsMock.mockResolvedValue([]);
    const onUnavailable = vi.fn();
    render(
      <ListeningCard
        item={item}
        onGrade={vi.fn()}
        onUnavailable={onUnavailable}
      />,
    );
    await vi.waitFor(() => {
      expect(onUnavailable).toHaveBeenCalledTimes(1);
    });
  });

  it('plays the clip and grades a tolerant transcription', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <ListeningCard item={item} onGrade={onGrade} onUnavailable={vi.fn()} />,
    );
    await user.click(await screen.findByRole('button', { name: 'Listen' }));
    expect(FakeAudio.playedSrc).toBe('https://api.test/audio/rec-1');
    await user.type(screen.getByLabelText('Type what you hear'), 'sneg');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/sněg/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('good');
  });

  it('speaks the learner language in feedback', async () => {
    const user = userEvent.setup();
    const polishItem: LearnItem = {
      ...item,
      translations: [
        { lang: 'en', text: 'snow' },
        { lang: 'pl', text: 'śnieg' },
      ],
    };
    render(
      <ListeningCard
        item={polishItem}
        lang="pl"
        onGrade={vi.fn()}
        onUnavailable={vi.fn()}
      />,
    );
    await screen.findByRole('button', { name: 'Listen' });
    await user.type(screen.getByLabelText('Type what you hear'), 'sneg');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/śnieg/)).toBeDefined();
  });

  it('marks a wrong transcription and grades again', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(
      <ListeningCard item={item} onGrade={onGrade} onUnavailable={vi.fn()} />,
    );
    await screen.findByRole('button', { name: 'Listen' });
    await user.type(screen.getByLabelText('Type what you hear'), 'voda');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('again');
  });
});
