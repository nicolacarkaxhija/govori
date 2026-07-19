import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LearnItem } from '../api/client';
import { recordReview } from '../learn/progress';
import { PracticeView } from './PracticeView';

const fetchItemsMock = vi.hoisted(() => vi.fn());
const fetchRecordingsMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchItems: fetchItemsMock,
  fetchRecordings: fetchRecordingsMock,
  uploadRecording: vi.fn(),
  recordingUrl: (id: string) => `https://api.test/audio/${id}`,
}));

const items: LearnItem[] = [
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000001',
    kind: 'word',
    text: 'voda',
    translations: [{ lang: 'en', text: 'water' }],
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000002',
    kind: 'word',
    text: 'hlěb',
    translations: [{ lang: 'en', text: 'bread' }],
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000003',
    kind: 'word',
    text: 'sněg',
    translations: [{ lang: 'en', text: 'snow' }],
  },
];

describe('PracticeView common words', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchItemsMock.mockReset();
    fetchRecordingsMock.mockReset().mockResolvedValue([]);
  });

  it('runs a session over the top of the frequency list', async () => {
    fetchItemsMock.mockResolvedValue(items);
    render(
      <PracticeView
        source="common"
        script="latin"
        learnLang="en"
        onExit={vi.fn()}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'voda' })).toBeDefined();
    expect(fetchItemsMock).toHaveBeenCalledWith('isv', 20);
  });

  it('reports an unreachable server', async () => {
    fetchItemsMock.mockResolvedValue(null);
    render(
      <PracticeView
        source="common"
        script="latin"
        learnLang="en"
        onExit={vi.fn()}
      />,
    );
    expect(await screen.findByText(/unreachable/)).toBeDefined();
  });
});

describe('PracticeView weak words', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchItemsMock.mockReset();
    fetchRecordingsMock.mockReset().mockResolvedValue([]);
  });

  it('practises the most-lapsed items first', async () => {
    // sněg lapsed twice, voda once; hlěb never — old dates keep them due.
    recordReview(items[2]?.id ?? '', 'again', '2026-07-01T10:00:00.000Z');
    recordReview(items[2]?.id ?? '', 'again', '2026-07-01T10:01:00.000Z');
    recordReview(items[0]?.id ?? '', 'again', '2026-07-01T10:02:00.000Z');
    fetchItemsMock.mockResolvedValue(items);
    render(
      <PracticeView
        source="weak"
        script="latin"
        learnLang="en"
        onExit={vi.fn()}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'sněg' })).toBeDefined();
    expect(fetchItemsMock).toHaveBeenCalledWith('isv', 500);
  });

  it('celebrates an empty weak list without calling the API', async () => {
    render(
      <PracticeView
        source="weak"
        script="latin"
        learnLang="en"
        onExit={vi.fn()}
      />,
    );
    expect(await screen.findByText(/No weak words yet/)).toBeDefined();
    expect(fetchItemsMock).not.toHaveBeenCalled();
  });

  it('reports an unreachable server for weak practice too', async () => {
    recordReview(items[0]?.id ?? '', 'again', '2026-07-01T10:00:00.000Z');
    fetchItemsMock.mockResolvedValue(null);
    render(
      <PracticeView
        source="weak"
        script="latin"
        learnLang="en"
        onExit={vi.fn()}
      />,
    );
    expect(await screen.findByText(/unreachable/)).toBeDefined();
  });
});
