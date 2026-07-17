import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LearnItem } from '../api/client';
import { LessonView } from './LessonView';

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
];

const fetchLessonMock = vi.hoisted(() => vi.fn());
const fetchSentencesMock = vi.hoisted(() => vi.fn());
const fetchFlagsMock = vi.hoisted(() => vi.fn());
const fetchRecordingsMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchLesson: fetchLessonMock,
  fetchLessonSentences: fetchSentencesMock,
  fetchFlags: fetchFlagsMock,
  fetchRecordings: fetchRecordingsMock,
  uploadRecording: vi.fn(),
  recordingUrl: (id: string) => `https://api.test/audio/${id}`,
}));

describe('LessonView', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchLessonMock.mockReset();
    fetchSentencesMock.mockReset();
    fetchSentencesMock.mockResolvedValue([]);
    fetchFlagsMock.mockReset().mockResolvedValue({});
    fetchRecordingsMock.mockReset().mockResolvedValue([]);
  });

  it('reports an unreachable server', async () => {
    fetchLessonMock.mockResolvedValue(null);
    render(
      <LessonView
        lessonId="9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    expect(await screen.findByText(/unreachable/)).toBeDefined();
  });

  it('walks due items to completion', async () => {
    const user = userEvent.setup();
    fetchLessonMock.mockResolvedValue({
      title: 'Lekcija 1',
      items: [items[0]],
    });
    render(
      <LessonView
        lessonId="9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'voda' })).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'water' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/Vse gotovo/)).toBeDefined();
    expect(screen.getByText('1 answered')).toBeDefined();
    expect(screen.getByText('1-day streak')).toBeDefined();
  });

  it('lets the learner leave through the back control', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    fetchLessonMock.mockResolvedValue({ title: 'Lekcija 1', items });
    render(
      <LessonView
        lessonId="9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f"
        script="latin"
        onExit={onExit}
      />,
    );
    await screen.findByRole('heading', { name: 'voda' });
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(onExit).toHaveBeenCalled();
  });
});

describe('LessonView cloze rotation', () => {
  it('offers a cloze after typed when a sentence matches the pool', async () => {
    const user = userEvent.setup();
    fetchLessonMock.mockResolvedValue({ title: 'Lekcija 1', items });
    fetchSentencesMock.mockResolvedValue([
      {
        id: 'bbbbbbbb-0000-4000-8000-000000000009',
        kind: 'sentence',
        text: 'Ja pijų vodų.',
        translations: [{ lang: 'en', text: 'I drink water.' }],
      },
    ]);
    render(
      <LessonView
        lessonId="9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    // choices → typed → cloze; miss the typed answer to keep items due.
    await user.click(await screen.findByRole('button', { name: 'water' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText(/Type it in Interslavic/), 'zzz');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('fill the blank')).toBeDefined();
    expect(screen.getByText('I drink water.')).toBeDefined();
    await user.type(screen.getByLabelText(/Type the missing word/), 'vodu');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Pravilno/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('3 answered')).toBeDefined();
  });
});

describe('LessonView dialogue intro', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchLessonMock.mockReset();
    fetchSentencesMock.mockReset();
    fetchSentencesMock.mockResolvedValue([]);
  });

  it('shows the scene first, then hands over to exercises', async () => {
    const user = userEvent.setup();
    fetchLessonMock.mockResolvedValue({
      title: 'Lekcija 1',
      items: [items[0]],
      dialogue: {
        turns: [
          { speaker: 'Ana', text: 'Kto jesi ty?', translation: 'Who are you?' },
        ],
        provenance: { origin: 'ai-draft' },
      },
    });
    render(
      <LessonView
        lessonId="9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    expect(await screen.findByText('Kto jesi ty?')).toBeDefined();
    expect(screen.getByText('AI-drafted, human-reviewed')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'water' })).toBeNull();
    await user.click(
      screen.getByRole('button', { name: 'Start the exercises' }),
    );
    expect(await screen.findByRole('button', { name: 'water' })).toBeDefined();
  });
});

describe('LessonView community audio', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchLessonMock.mockReset();
    fetchSentencesMock.mockReset().mockResolvedValue([]);
    fetchFlagsMock.mockReset().mockResolvedValue({});
    fetchRecordingsMock.mockReset().mockResolvedValue([]);
    fetchLessonMock.mockResolvedValue({
      id: 'cccccccc-0000-4000-8000-000000000001',
      title: 'Lekcija',
      items,
    });
  });

  it('keeps audio tools dark by default (ADR 0004)', async () => {
    render(
      <LessonView
        lessonId="cccccccc-0000-4000-8000-000000000001"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    await screen.findByRole('heading', { level: 2 });
    expect(screen.queryByRole('button', { name: 'Record' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Listen' })).toBeNull();
  });

  it('offers recording once the audio flag is live', async () => {
    fetchFlagsMock.mockResolvedValue({ audio: true });
    render(
      <LessonView
        lessonId="cccccccc-0000-4000-8000-000000000001"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    await screen.findByRole('heading', { level: 2 });
    expect(await screen.findByRole('button', { name: 'Record' })).toBeDefined();
  });
});

describe('LessonView listening rotation', () => {
  const threeItems: LearnItem[] = [
    ...items,
    {
      id: 'bbbbbbbb-0000-4000-8000-000000000003',
      kind: 'word',
      text: 'sněg',
      translations: [{ lang: 'en', text: 'snow' }],
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    fetchLessonMock.mockReset().mockResolvedValue({
      id: 'cccccccc-0000-4000-8000-000000000001',
      title: 'Lekcija',
      items: threeItems,
    });
    fetchSentencesMock.mockReset().mockResolvedValue([]);
    fetchFlagsMock.mockReset().mockResolvedValue({ audio: true });
    fetchRecordingsMock
      .mockReset()
      .mockResolvedValue([{ id: 'rec-1', mime: 'audio/webm' }]);
    vi.stubGlobal(
      'Audio',
      class {
        play() {
          return Promise.resolve();
        }
      },
    );
  });

  async function answerTwo(user: ReturnType<typeof userEvent.setup>) {
    const group = await screen.findByRole('group');
    const [choice] = within(group).getAllByRole('button');
    if (choice === undefined) {
      throw new Error('no choices rendered');
    }
    await user.click(choice);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText(/Type it in Interslavic/), 'x');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
  }

  it('reaches listening transcription after the typed round', async () => {
    const user = userEvent.setup();
    render(
      <LessonView
        lessonId="cccccccc-0000-4000-8000-000000000001"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    await answerTwo(user);
    expect(await screen.findByLabelText('Type what you hear')).toBeDefined();
  });

  it('falls back to choices when the item has no clips', async () => {
    fetchRecordingsMock.mockResolvedValue([]);
    const user = userEvent.setup();
    render(
      <LessonView
        lessonId="cccccccc-0000-4000-8000-000000000001"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    await answerTwo(user);
    expect(await screen.findByRole('group')).toBeDefined();
  });
});

describe('LessonView assembly round', () => {
  const threeItems: LearnItem[] = [
    ...items,
    {
      id: 'bbbbbbbb-0000-4000-8000-000000000003',
      kind: 'word',
      text: 'sneg',
      translations: [{ lang: 'en', text: 'snow' }],
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    fetchLessonMock.mockReset().mockResolvedValue({
      id: 'cccccccc-0000-4000-8000-000000000001',
      title: 'Lekcija',
      items: threeItems,
    });
    // No shared word with the pool: cloze impossible, assembly possible.
    fetchSentencesMock.mockReset().mockResolvedValue([
      {
        id: 'cccccccc-0000-4000-8000-000000000042',
        kind: 'sentence',
        text: 'Jutro bude lěpje.',
        translations: [{ lang: 'en', text: 'Tomorrow will be better.' }],
      },
    ]);
    fetchFlagsMock.mockReset().mockResolvedValue({});
    fetchRecordingsMock.mockReset().mockResolvedValue([]);
  });

  it('offers sentence assembly when no cloze can be built', async () => {
    const user = userEvent.setup();
    render(
      <LessonView
        lessonId="cccccccc-0000-4000-8000-000000000001"
        script="latin"
        onExit={vi.fn()}
      />,
    );
    const group = await screen.findByRole('group');
    const [choice] = within(group).getAllByRole('button');
    if (choice === undefined) {
      throw new Error('no choices rendered');
    }
    await user.click(choice);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText(/Type it in Interslavic/), 'x');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByRole('group', { name: 'Word bank' }),
    ).toBeDefined();
    expect(screen.getByText('Tomorrow will be better.')).toBeDefined();
  });
});
