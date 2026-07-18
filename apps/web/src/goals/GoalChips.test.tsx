import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { recordReview } from '../learn/progress';
import { saveEntry } from '../journal/journal';
import { GoalChips } from './GoalChips';

describe('GoalChips', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the three weekly goals under a heading', () => {
    render(<GoalChips />);
    expect(screen.getByText('This week')).toBeDefined();
    expect(screen.getByText('Reviews')).toBeDefined();
    expect(screen.getByText('Journal entries')).toBeDefined();
    expect(screen.getByText('Active days')).toBeDefined();
  });

  it('reflects recorded reviews and journal entries in the counts', () => {
    const today = new Date().toISOString().slice(0, 10);
    recordReview('aaaaaaaa-0000-4000-8000-000000000001', 'good');
    recordReview('aaaaaaaa-0000-4000-8000-000000000002', 'good');
    saveEntry({ date: today, text: 'Dnes.', prompt: 'journalPrompt1' });
    render(<GoalChips />);
    expect(screen.getByText('2 / 20')).toBeDefined();
    expect(screen.getByText('1 / 2')).toBeDefined();
  });
});
