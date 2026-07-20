import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportControl } from './ReportControl';

const reportItemMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, reportItem: reportItemMock };
});

const itemId = 'cccccccc-0000-4000-8000-000000000001';

describe('ReportControl', () => {
  beforeEach(() => {
    reportItemMock.mockReset();
  });

  it('opens the reason menu from the compact affordance', async () => {
    const user = userEvent.setup();
    render(<ReportControl itemId={itemId} />);
    expect(screen.queryByText('What looks wrong?')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Report this' }));
    expect(screen.getByText('What looks wrong?')).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Wrong translation' }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Wrong audio' })).toBeDefined();
  });

  it('sends the chosen reason and comment, then thanks the learner', async () => {
    reportItemMock.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<ReportControl itemId={itemId} />);
    await user.click(screen.getByRole('button', { name: 'Report this' }));
    await user.click(screen.getByRole('button', { name: 'Wrong translation' }));
    await user.type(screen.getByRole('textbox'), 'means water not fire');
    await user.click(screen.getByRole('button', { name: 'Send report' }));
    expect(reportItemMock).toHaveBeenCalledWith(
      itemId,
      'wrong_translation',
      'means water not fire',
    );
    expect(
      await screen.findByText('Thanks — a reviewer will take a look.'),
    ).toBeDefined();
  });

  it('cannot submit before a reason is picked', async () => {
    const user = userEvent.setup();
    render(<ReportControl itemId={itemId} />);
    await user.click(screen.getByRole('button', { name: 'Report this' }));
    expect(screen.getByRole('button', { name: 'Send report' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('confirms even when the report does not land — never blocking', async () => {
    reportItemMock.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<ReportControl itemId={itemId} />);
    await user.click(screen.getByRole('button', { name: 'Report this' }));
    await user.click(screen.getByRole('button', { name: 'Something else' }));
    await user.click(screen.getByRole('button', { name: 'Send report' }));
    expect(reportItemMock).toHaveBeenCalledWith(itemId, 'other', '');
    expect(
      await screen.findByText('Thanks — a reviewer will take a look.'),
    ).toBeDefined();
  });

  it('closes back to the affordance on cancel', async () => {
    const user = userEvent.setup();
    render(<ReportControl itemId={itemId} />);
    await user.click(screen.getByRole('button', { name: 'Report this' }));
    await user.click(screen.getByRole('button', { name: 'Sounds unnatural' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('What looks wrong?')).toBeNull();
    expect(screen.getByRole('button', { name: 'Report this' })).toBeDefined();
    expect(reportItemMock).not.toHaveBeenCalled();
  });
});
