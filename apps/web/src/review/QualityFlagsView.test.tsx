import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QualityFlag } from '../api/client';
import { QualityFlagsView } from './QualityFlagsView';

const fetchQualityFlagsMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchQualityFlags: fetchQualityFlagsMock,
}));

const reportedFlag: QualityFlag = {
  item: {
    id: 'dddddddd-0000-4000-8000-000000000001',
    kind: 'sentence',
    text: 'Ja pijų vodų.',
    translations: [{ lang: 'en', text: 'I drink water.' }],
  },
  againCount: 0,
  totalGraded: 0,
  failureRate: 0,
  openReports: 4,
  reasons: [
    { reason: 'wrong_translation', count: 3 },
    { reason: 'other', count: 1 },
  ],
};

const lapseFlag: QualityFlag = {
  item: {
    id: 'dddddddd-0000-4000-8000-000000000002',
    kind: 'word',
    text: 'sněg',
    translations: [{ lang: 'en', text: 'snow' }],
  },
  againCount: 8,
  totalGraded: 12,
  failureRate: 8 / 12,
  openReports: 0,
  reasons: [],
};

describe('QualityFlagsView', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchQualityFlagsMock.mockReset();
  });

  it('lists escalated items with their text, translation and counts', async () => {
    fetchQualityFlagsMock.mockResolvedValue([reportedFlag, lapseFlag]);
    render(<QualityFlagsView script="latin" onExit={vi.fn()} />);
    expect(await screen.findByText('Ja piju vodu.')).toBeDefined();
    expect(screen.getByText('I drink water.')).toBeDefined();
    expect(screen.getByText('4 open reports', { exact: false })).toBeDefined();
    // Reasons ride along, richest first.
    expect(
      screen.getByText(/Wrong translation ×3/, { exact: false }),
    ).toBeDefined();
    // The lapse-rate item shows its rate and evidence.
    expect(screen.getByText('67% lapsed (8 of 12)')).toBeDefined();
  });

  it('renders the item in the chosen script', async () => {
    fetchQualityFlagsMock.mockResolvedValue([reportedFlag]);
    render(<QualityFlagsView script="cyrillic" onExit={vi.fn()} />);
    expect(await screen.findByText('Ја пију воду.')).toBeDefined();
  });

  it('reports an unavailable queue', async () => {
    fetchQualityFlagsMock.mockResolvedValue(null);
    render(<QualityFlagsView script="latin" onExit={vi.fn()} />);
    expect(
      await screen.findByText(/quality queue is unavailable/),
    ).toBeDefined();
  });

  it('celebrates an empty queue', async () => {
    fetchQualityFlagsMock.mockResolvedValue([]);
    render(<QualityFlagsView script="latin" onExit={vi.fn()} />);
    expect(
      await screen.findByText('Nothing needs a look right now.'),
    ).toBeDefined();
  });

  it('leaves through the back control', async () => {
    fetchQualityFlagsMock.mockResolvedValue([]);
    const onExit = vi.fn();
    const user = userEvent.setup();
    render(<QualityFlagsView script="latin" onExit={onExit} />);
    await screen.findByText('Nothing needs a look right now.');
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(onExit).toHaveBeenCalled();
  });
});
