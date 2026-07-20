import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyRecordingsView } from './MyRecordingsView';

const fetchMyRecordingsMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchMyRecordings: fetchMyRecordingsMock,
}));

const itemId = '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f';

beforeEach(() => {
  fetchMyRecordingsMock.mockReset();
});

describe('MyRecordingsView', () => {
  it('lists clips with status, consents, and the credit ledger', async () => {
    fetchMyRecordingsMock.mockResolvedValue({
      recordings: [
        {
          id: 'a',
          itemId,
          status: 'verified',
          accentTag: null,
          consentVersion: '1',
          consentApp: true,
          consentDataset: true,
          consentTraining: false,
          createdAt: '2026-07-20T00:00:00.000Z',
        },
        {
          id: 'b',
          itemId,
          status: 'pending',
          accentTag: null,
          consentVersion: '1',
          consentApp: true,
          consentDataset: false,
          consentTraining: false,
          createdAt: '2026-07-19T00:00:00.000Z',
        },
      ],
      credit: {
        secondsValidated: 42,
        premiumDaysGranted: 3,
        grantedAt: '2026-07-20T00:00:00.000Z',
      },
    });
    render(<MyRecordingsView onExit={vi.fn()} onSignIn={vi.fn()} />);
    expect(await screen.findByText('Verified')).toBeDefined();
    expect(screen.getByText('Awaiting votes')).toBeDefined();
    expect(
      screen.getByText('42 seconds validated → 3 premium days earned'),
    ).toBeDefined();
    // Each clip shows all three grants; dataset differs between the two.
    expect(screen.getAllByText('Open voice dataset')).toHaveLength(2);
    expect(screen.getAllByText('Speech-model training')).toHaveLength(2);
  });

  it('shows the honest empty-credit line when nothing is verified yet', async () => {
    fetchMyRecordingsMock.mockResolvedValue({ recordings: [], credit: null });
    render(<MyRecordingsView onExit={vi.fn()} onSignIn={vi.fn()} />);
    expect(
      await screen.findByText(
        'No premium time yet — recordings earn it once the community verifies them.',
      ),
    ).toBeDefined();
    expect(
      screen.getByText('You have not shared any recordings yet.'),
    ).toBeDefined();
  });

  it('offers sign-in when unauthenticated', async () => {
    fetchMyRecordingsMock.mockResolvedValue('unauthenticated');
    const onSignIn = vi.fn();
    render(<MyRecordingsView onExit={vi.fn()} onSignIn={onSignIn} />);
    await user().click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalled();
  });

  it('reports an unreachable server', async () => {
    fetchMyRecordingsMock.mockResolvedValue(null);
    render(<MyRecordingsView onExit={vi.fn()} onSignIn={vi.fn()} />);
    expect(
      await screen.findByText('The server is unreachable right now.'),
    ).toBeDefined();
  });

  it('goes back on request', async () => {
    fetchMyRecordingsMock.mockResolvedValue({ recordings: [], credit: null });
    const onExit = vi.fn();
    render(<MyRecordingsView onExit={onExit} onSignIn={vi.fn()} />);
    await user().click(await screen.findByRole('button', { name: '← Back' }));
    expect(onExit).toHaveBeenCalled();
  });
});

function user() {
  return userEvent.setup();
}
