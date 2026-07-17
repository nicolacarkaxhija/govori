import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatsView } from './StatsView';

const fetchStatsMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({ fetchStats: fetchStatsMock }));

describe('StatsView', () => {
  beforeEach(() => {
    fetchStatsMock.mockReset();
  });

  it('renders the aggregate tiles', async () => {
    fetchStatsMock.mockResolvedValue({
      items: 19004,
      translations: 71436,
      reviews: 12,
      learners: 3,
    });
    render(<StatsView onExit={vi.fn()} />);
    expect(await screen.findByText('19,004')).toBeDefined();
    expect(screen.getByText('Translations')).toBeDefined();
  });

  it('reports an unreachable server and can go back', async () => {
    fetchStatsMock.mockResolvedValue(null);
    const onExit = vi.fn();
    const user = userEvent.setup();
    render(<StatsView onExit={onExit} />);
    expect(await screen.findByText(/unreachable/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(onExit).toHaveBeenCalled();
  });
});
