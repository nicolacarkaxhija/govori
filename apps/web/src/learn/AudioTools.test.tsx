import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioTools } from './AudioTools';

const fetchRecordingsMock = vi.hoisted(() => vi.fn());
const uploadRecordingMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchRecordings: fetchRecordingsMock,
  uploadRecording: uploadRecordingMock,
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

class FakeRecorder {
  static last: FakeRecorder | null = null;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  mimeType = 'audio/webm;codecs=opus';
  start = vi.fn();
  stop = vi.fn(() => {
    this.ondataavailable?.({ data: new Blob(['clip']) });
    this.onstop?.();
  });
  constructor(public stream: unknown) {
    FakeRecorder.last = this;
  }
}

const stoppedTracks = vi.hoisted(() => ({ count: 0 }));
const audioTrack = vi.hoisted(() => ({
  present: true,
  settings: { sampleRate: 48000 },
}));

beforeEach(() => {
  localStorage.clear();
  fetchRecordingsMock.mockReset().mockResolvedValue([]);
  uploadRecordingMock.mockReset().mockResolvedValue(true);
  FakeAudio.playedSrc = null;
  FakeRecorder.last = null;
  stoppedTracks.count = 0;
  audioTrack.present = true;
  audioTrack.settings = { sampleRate: 48000 };
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  const track = {
    stop: () => {
      stoppedTracks.count += 1;
    },
    getSettings: () => audioTrack.settings,
  };
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn(() =>
        Promise.resolve({
          getTracks: () => [track],
          getAudioTracks: () => (audioTrack.present ? [track] : []),
        }),
      ),
    },
  });
});

const itemId = '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f';

describe('AudioTools', () => {
  it('plays a community recording when one exists', async () => {
    const user = userEvent.setup();
    fetchRecordingsMock.mockResolvedValue([
      { id: 'rec-1', mime: 'audio/webm' },
    ]);
    render(<AudioTools itemId={itemId} canListen canRecord={false} />);
    await user.click(await screen.findByRole('button', { name: 'Listen' }));
    expect(FakeAudio.playedSrc).toBe('https://api.test/audio/rec-1');
  });

  it('renders nothing without recordings or recording rights', async () => {
    const { container } = render(
      <AudioTools itemId={itemId} canListen canRecord={false} />,
    );
    await Promise.resolve();
    expect(container.textContent).toBe('');
  });

  it('asks for consent once, then records with consent and device metadata', async () => {
    const user = userEvent.setup();
    render(<AudioTools itemId={itemId} canListen={false} canRecord />);

    // First press opens the one-time consent sheet, not the recorder.
    await user.click(screen.getByRole('button', { name: 'Record' }));
    expect(FakeRecorder.last).toBeNull();
    expect(screen.getByText('Before you record')).toBeDefined();

    // Opt into the dataset grant, leave training off.
    await user.click(
      screen.getByRole('checkbox', { name: 'Open voice dataset' }),
    );
    await user.click(screen.getByRole('button', { name: 'Agree and record' }));
    expect(FakeRecorder.last?.start).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(
      await screen.findByText('Recording shared — thank you.'),
    ).toBeDefined();
    expect(stoppedTracks.count).toBe(1);

    const call = uploadRecordingMock.mock.calls[0] as [
      string,
      Blob,
      { mime: string; sampleRate?: number; durationMs: number },
      { version: string; app: boolean; dataset: boolean; training: boolean },
    ];
    expect(call[0]).toBe(itemId);
    expect(call[1]).toBeInstanceOf(Blob);
    expect(call[2].mime).toBe('audio/webm');
    expect(call[2].sampleRate).toBe(48000);
    expect(typeof call[2].durationMs).toBe('number');
    expect(call[3]).toEqual({
      version: '1',
      app: true,
      dataset: true,
      training: false,
    });
    // The sheet is remembered, so the accent tag argument stays absent.
    expect(call).toHaveLength(4);
  });

  it('does not re-ask for consent once a choice is remembered', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <AudioTools itemId={itemId} canListen={false} canRecord />,
    );
    await user.click(screen.getByRole('button', { name: 'Record' }));
    await user.click(screen.getByRole('button', { name: 'Agree and record' }));
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await screen.findByText('Recording shared — thank you.');
    unmount();

    FakeRecorder.last = null;
    render(<AudioTools itemId={itemId} canListen={false} canRecord />);
    await user.click(screen.getByRole('button', { name: 'Record' }));
    // Straight to recording — no sheet this time.
    expect(screen.queryByText('Before you record')).toBeNull();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await screen.findByText('Recording shared — thank you.');
    const consent = uploadRecordingMock.mock.calls[0]?.[3] as {
      dataset: boolean;
    };
    expect(consent.dataset).toBe(false);
  });

  it('omits the sample rate when the track cannot report it', async () => {
    const user = userEvent.setup();
    audioTrack.present = false;
    render(<AudioTools itemId={itemId} canListen={false} canRecord />);
    await user.click(screen.getByRole('button', { name: 'Record' }));
    await user.click(screen.getByRole('button', { name: 'Agree and record' }));
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await screen.findByText('Recording shared — thank you.');
    const device = uploadRecordingMock.mock.calls[0]?.[2] as {
      sampleRate?: number;
    };
    expect(device.sampleRate).toBeUndefined();
  });

  it('reveals what happens to a voice on request', async () => {
    const user = userEvent.setup();
    render(<AudioTools itemId={itemId} canListen={false} canRecord />);
    await user.click(screen.getByRole('button', { name: 'Record' }));
    expect(screen.queryByText(/stored under a pseudonym/)).toBeNull();
    await user.click(
      screen.getByRole('button', { name: 'What happens to my voice?' }),
    );
    expect(screen.getByText(/stored under a pseudonym/)).toBeDefined();
  });

  it('can dismiss the consent sheet without recording', async () => {
    const user = userEvent.setup();
    render(<AudioTools itemId={itemId} canListen={false} canRecord />);
    await user.click(screen.getByRole('button', { name: 'Record' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Before you record')).toBeNull();
    expect(FakeRecorder.last).toBeNull();
    expect(screen.getByRole('button', { name: 'Record' })).toBeDefined();
  });

  it('reports a refused microphone', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(() => Promise.reject(new Error('denied'))),
      },
    });
    render(<AudioTools itemId={itemId} canListen={false} canRecord />);
    await user.click(screen.getByRole('button', { name: 'Record' }));
    await user.click(screen.getByRole('button', { name: 'Agree and record' }));
    expect(await screen.findByText(/could not be saved/)).toBeDefined();
  });
});
