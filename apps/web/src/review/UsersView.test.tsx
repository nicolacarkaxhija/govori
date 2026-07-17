import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserRow } from '../api/client';
import { UsersView } from './UsersView';

const row: UserRow = {
  id: 'u2',
  email: 'ovca@example.com',
  name: 'Ovca',
  role: 'learner',
  createdAt: '2026-07-17T10:00:00.000Z',
};

const fetchUsersMock = vi.hoisted(() => vi.fn());
const setRoleMock = vi.hoisted(() => vi.fn());
vi.mock('../api/client', () => ({
  fetchUsers: fetchUsersMock,
  setUserRole: setRoleMock,
}));

describe('UsersView', () => {
  beforeEach(() => {
    fetchUsersMock.mockReset();
    setRoleMock.mockReset();
  });

  it('reports when the directory is unavailable', async () => {
    fetchUsersMock.mockResolvedValue(null);
    render(<UsersView onExit={vi.fn()} />);
    expect(await screen.findByText(/unavailable/)).toBeDefined();
  });

  it('promotes a learner and reflects the new role', async () => {
    const user = userEvent.setup();
    fetchUsersMock.mockResolvedValue([row]);
    setRoleMock.mockResolvedValue(true);
    render(<UsersView onExit={vi.fn()} />);
    expect(await screen.findByText(/ovca@example.com/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Make admin' }));
    expect(setRoleMock).toHaveBeenCalledWith('u2', 'admin');
    expect(await screen.findByText(/— admin/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Make learner' })).toBeDefined();
  });

  it('keeps the role when the server refuses', async () => {
    const user = userEvent.setup();
    fetchUsersMock.mockResolvedValue([row]);
    setRoleMock.mockResolvedValue(false);
    render(<UsersView onExit={vi.fn()} />);
    await screen.findByText(/ovca@example.com/);
    await user.click(screen.getByRole('button', { name: 'Make admin' }));
    expect(screen.getByText(/— learner/)).toBeDefined();
  });
});
