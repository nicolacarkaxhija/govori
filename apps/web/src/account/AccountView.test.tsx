import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountView } from './AccountView';

const client = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  fetchReviews: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  pushReviews: vi.fn(),
  exportData: vi.fn(),
  deleteAccount: vi.fn(),
}));
vi.mock('../api/client', () => client);

describe('AccountView', () => {
  beforeEach(() => {
    localStorage.clear();
    for (const mock of Object.values(client)) {
      mock.mockReset();
    }
    client.fetchReviews.mockResolvedValue([]);
  });

  it('creates an account and pushes the local log', async () => {
    client.fetchMe.mockResolvedValueOnce(null).mockResolvedValue({
      user: { id: 'u1', email: 'ovca@example.com', role: 'learner' },
    });
    client.signUp.mockResolvedValue(true);
    client.pushReviews.mockResolvedValue({ received: 3, stored: 3 });
    const user = userEvent.setup();
    render(<AccountView onExit={vi.fn()} onReview={vi.fn()} />);
    await user.type(await screen.findByLabelText('Display name'), 'Ovca');
    await user.type(screen.getByLabelText('Email'), 'ovca@example.com');
    await user.type(screen.getByLabelText('Password'), 'vlna-i-konji');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('ovca@example.com')).toBeDefined();
    expect(screen.getByText(/3 new reviews synced/)).toBeDefined();
    expect(client.pushReviews).toHaveBeenCalled();
  });

  it('reports when the session cannot be established after signup', async () => {
    client.fetchMe.mockResolvedValue(null);
    client.signUp.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<AccountView onExit={vi.fn()} onReview={vi.fn()} />);
    await user.type(await screen.findByLabelText('Email'), 'o@example.com');
    await user.type(screen.getByLabelText('Password'), 'vlna-i-konji');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/did not work/)).toBeDefined();
  });

  it('explains a failed sign-in', async () => {
    client.fetchMe.mockResolvedValue(null);
    client.signIn.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<AccountView onExit={vi.fn()} onReview={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: /Sign in$/ }));
    await user.type(screen.getByLabelText('Email'), 'ovca@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText(/Wrong email or password/)).toBeDefined();
  });

  it('shows the signed-in state and signs out', async () => {
    client.fetchMe.mockResolvedValue({
      user: { id: 'u1', email: 'ovca@example.com', role: 'learner' },
    });
    client.signOut.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<AccountView onExit={vi.fn()} onReview={vi.fn()} />);
    expect(await screen.findByText('ovca@example.com')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(
      await screen.findByRole('button', { name: 'Create account' }),
    ).toBeDefined();
  });
});

describe('data rights', () => {
  it('downloads the export bundle', async () => {
    client.fetchMe.mockResolvedValue({
      user: { id: 'u1', email: 'ovca@example.com', role: 'learner' },
    });
    client.exportData.mockResolvedValue({ user: {}, reviews: [] });
    const createObjectURL = vi.fn(() => 'blob:x');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL, revokeObjectURL }),
    );
    const user = userEvent.setup();
    render(<AccountView onExit={vi.fn()} onReview={vi.fn()} />);
    await user.click(
      await screen.findByRole('button', { name: 'Download my data' }),
    );
    expect(client.exportData).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('erases only after the confirmation press', async () => {
    client.fetchMe.mockResolvedValue({
      user: { id: 'u1', email: 'ovca@example.com', role: 'learner' },
    });
    client.deleteAccount.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<AccountView onExit={vi.fn()} onReview={vi.fn()} />);
    await user.click(
      await screen.findByRole('button', { name: 'Delete my account' }),
    );
    expect(client.deleteAccount).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole('button', { name: 'Press again to erase everything' }),
    );
    expect(client.deleteAccount).toHaveBeenCalled();
    expect(
      await screen.findByText(/account and its data are gone/),
    ).toBeDefined();
  });
});

describe('AccountView admin entry', () => {
  it('shows the review button only for admins and forwards the click', async () => {
    const onReview = vi.fn();
    client.fetchMe.mockResolvedValue({
      user: { id: 'u1', email: 'ovca@example.com', role: 'admin' },
    });
    client.pushReviews.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<AccountView onExit={vi.fn()} onReview={onReview} />);
    await user.click(
      await screen.findByRole('button', { name: 'Review drafts' }),
    );
    expect(onReview).toHaveBeenCalledTimes(1);
  });
});

describe('AccountView pull-merge', () => {
  it('merges server events into the local log on sign-in', async () => {
    client.fetchMe.mockResolvedValue({
      user: { id: 'u1', email: 'ovca@example.com', role: 'learner' },
    });
    client.fetchReviews.mockResolvedValue([
      {
        id: 'dddddddd-0000-4000-8000-000000000009',
        itemId: 'bbbbbbbb-0000-4000-8000-000000000001',
        reviewedAt: '2026-07-16T10:00:00.000Z',
        grade: 'good',
      },
    ]);
    render(<AccountView onExit={vi.fn()} onReview={vi.fn()} />);
    expect(
      await screen.findByText('1 reviews arrived from your other devices.'),
    ).toBeDefined();
    expect(localStorage.getItem('govori.reviews.v1')).toContain(
      'dddddddd-0000-4000-8000-000000000009',
    );
  });
});
