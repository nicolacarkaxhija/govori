import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LearnItem } from '../api/client';
import { ReviewView } from './ReviewView';

const draft: LearnItem = {
  id: 'cccccccc-0000-4000-8000-000000000001',
  kind: 'sentence',
  text: 'Ja pijų vodų.',
  translations: [{ lang: 'en', text: 'I drink water.' }],
};

const fetchPendingMock = vi.hoisted(() => vi.fn());
const decideMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchPendingReviews: fetchPendingMock,
  decideReview: decideMock,
}));

describe('ReviewView', () => {
  beforeEach(() => {
    fetchPendingMock.mockReset();
    decideMock.mockReset();
  });

  it('reports when the queue is unavailable', async () => {
    fetchPendingMock.mockResolvedValue(null);
    render(<ReviewView script="latin" onExit={vi.fn()} />);
    expect(await screen.findByText(/unavailable/)).toBeDefined();
  });

  it('approves a draft and counts the decision', async () => {
    const user = userEvent.setup();
    fetchPendingMock.mockResolvedValue([draft]);
    decideMock.mockResolvedValue(true);
    render(<ReviewView script="latin" onExit={vi.fn()} />);
    expect(await screen.findByText('Ja piju vodu.')).toBeDefined();
    expect(screen.getByText('I drink water.')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(decideMock).toHaveBeenCalledWith(draft.id, 'approve');
    expect(await screen.findByText(/Vse pregledano/)).toBeDefined();
    expect(screen.getByText('1 decided')).toBeDefined();
  });

  it('rejects a draft in Cyrillic rendering too', async () => {
    const user = userEvent.setup();
    fetchPendingMock.mockResolvedValue([draft]);
    decideMock.mockResolvedValue(true);
    render(<ReviewView script="cyrillic" onExit={vi.fn()} />);
    expect(await screen.findByText('Ја пију воду.')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(decideMock).toHaveBeenCalledWith(draft.id, 'reject');
    expect(await screen.findByText(/Vse pregledano/)).toBeDefined();
  });

  it('keeps the entry when the server refuses the decision', async () => {
    const user = userEvent.setup();
    fetchPendingMock.mockResolvedValue([draft]);
    decideMock.mockResolvedValue(false);
    render(<ReviewView script="latin" onExit={vi.fn()} />);
    await screen.findByText('Ja piju vodu.');
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByText('Ja piju vodu.')).toBeDefined();
    expect(screen.getByText('0 decided')).toBeDefined();
  });
});
