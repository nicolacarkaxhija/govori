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

beforeEach(() => {
  fetchRecordingsMock.mockReset().mockResolvedValue([]);
  uploadRecordingMock.mockReset().mockResolvedValue(true);
  FakeAudio.playedSrc = null;
  FakeRecorder.last = null;
  stoppedTracks.count = 0;
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn(() =>
        Promise.resolve({
          getTracks: () => [
            {
              stop: () => {
                stoppedTracks.count += 1;
              },
            },
          ],
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

  it('records a clip and publishes it', async () => {
    const user = userEvent.setup();
    render(<AudioTools itemId={itemId} canListen={false} canRecord />);
    await user.click(screen.getByRole('button', { name: 'Record' }));
    expect(FakeRecorder.last?.start).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(
      await screen.findByText('Recording shared — thank you.'),
    ).toBeDefined();
    expect(uploadRecordingMock).toHaveBeenCalledWith(
      itemId,
      'audio/webm',
      expect.any(Blob),
    );
    expect(stoppedTracks.count).toBe(1);
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
    expect(await screen.findByText(/could not be saved/)).toBeDefined();
  });
});
