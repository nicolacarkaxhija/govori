import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GoldenEntry } from '../api/client';
import { GoldenAuditView } from './GoldenAuditView';

const entry: GoldenEntry = {
  item: {
    id: 'cccccccc-0000-4000-8000-000000000001',
    kind: 'word',
    text: 'voda',
    translations: [{ lang: 'en', text: 'water' }],
  },
  priorAudit: null,
};

const fetchQueueMock = vi.hoisted(() => vi.fn());
const submitMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchGoldenQueue: fetchQueueMock,
  submitGoldenAudit: submitMock,
}));

describe('GoldenAuditView', () => {
  beforeEach(() => {
    fetchQueueMock.mockReset();
    submitMock.mockReset();
  });

  it('reports when the golden set is unavailable', async () => {
    fetchQueueMock.mockResolvedValue(null);
    render(<GoldenAuditView script="latin" onExit={vi.fn()} />);
    expect(await screen.findByText(/unavailable/)).toBeDefined();
  });

  it('says so when nothing is waiting for the reviewer', async () => {
    fetchQueueMock.mockResolvedValue([]);
    render(<GoldenAuditView script="latin" onExit={vi.fn()} />);
    expect(await screen.findByText(/waiting for your audit/)).toBeDefined();
  });

  it('scores an item across three axes and advances on submit', async () => {
    const user = userEvent.setup();
    fetchQueueMock.mockResolvedValue([entry]);
    submitMock.mockResolvedValue(true);
    render(<GoldenAuditView script="latin" onExit={vi.fn()} />);
    expect(await screen.findByText('voda')).toBeDefined();
    expect(screen.getByText('water')).toBeDefined();

    const save = screen.getByRole('button', { name: 'Save audit' });
    // Submit stays disabled until all three axes are scored.
    expect(save).toHaveProperty('disabled', true);

    // Each axis exposes a 1-5 scale; pick a value under each fieldset.
    const accuracy = screen.getByRole('group', { name: 'Accuracy' });
    const naturalness = screen.getByRole('group', { name: 'Naturalness' });
    const fit = screen.getByRole('group', { name: 'Fit' });
    await user.click(within(accuracy).getByRole('button', { name: '5' }));
    await user.click(within(naturalness).getByRole('button', { name: '4' }));
    await user.click(within(fit).getByRole('button', { name: '3' }));

    await user.type(screen.getByRole('textbox'), 'reads well');
    expect(save).toHaveProperty('disabled', false);
    await user.click(save);

    expect(submitMock).toHaveBeenCalledWith(entry.item.id, {
      accuracy: 5,
      naturalness: 4,
      fit: 3,
      comment: 'reads well',
    });
    expect(await screen.findByText(/waiting for your audit/)).toBeDefined();
    expect(screen.getByText('1 audited')).toBeDefined();
  });

  it('shows a prior peer audit as context and keeps the item on refusal', async () => {
    const user = userEvent.setup();
    fetchQueueMock.mockResolvedValue([
      {
        item: entry.item,
        priorAudit: {
          accuracy: 4,
          naturalness: 3,
          fit: 5,
          comment: 'peer note',
          auditedAt: '2026-07-20T00:00:00.000Z',
        },
      },
    ]);
    submitMock.mockResolvedValue(false);
    render(<GoldenAuditView script="latin" onExit={vi.fn()} />);
    expect(await screen.findByText(/Earlier audit/)).toBeDefined();

    const accuracy = screen.getByRole('group', { name: 'Accuracy' });
    const naturalness = screen.getByRole('group', { name: 'Naturalness' });
    const fit = screen.getByRole('group', { name: 'Fit' });
    await user.click(within(accuracy).getByRole('button', { name: '1' }));
    await user.click(within(naturalness).getByRole('button', { name: '1' }));
    await user.click(within(fit).getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: 'Save audit' }));

    // The server refused, so the item stays and nothing is counted.
    expect(screen.getByText('voda')).toBeDefined();
    expect(screen.getByText('0 audited')).toBeDefined();
  });
});
