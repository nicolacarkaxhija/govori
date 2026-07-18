import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LearnItem } from '../api/client';
import { ScriptCard } from './ScriptCard';

const item: LearnItem = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  kind: 'word',
  text: 'hlěb',
  translations: [{ lang: 'en', text: 'bread' }],
};

describe('ScriptCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('prompts in Latin and asks for Cyrillic', () => {
    render(<ScriptCard item={item} script="latin" onGrade={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'hlěb' })).toBeDefined();
    expect(screen.getByLabelText('Type it in Жж')).toBeDefined();
  });

  it('prompts in Cyrillic and asks for Latin', () => {
    render(<ScriptCard item={item} script="cyrillic" onGrade={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'хлєб' })).toBeDefined();
    expect(screen.getByLabelText('Type it in Žž')).toBeDefined();
  });

  it('grades the other script as good and reveals both forms', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(<ScriptCard item={item} script="latin" onGrade={onGrade} />);
    await user.type(screen.getByLabelText('Type it in Жж'), 'хлєб');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Pravilno/)).toBeDefined();
    expect(screen.getByText(/хлєб/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('good');
  });

  it('tolerates the source script too', async () => {
    const user = userEvent.setup();
    render(<ScriptCard item={item} script="latin" onGrade={vi.fn()} />);
    await user.type(screen.getByLabelText('Type it in Жж'), 'hleb');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Pravilno/)).toBeDefined();
  });

  it('grades a wrong word as again', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(<ScriptCard item={item} script="latin" onGrade={onGrade} />);
    await user.type(screen.getByLabelText('Type it in Жж'), 'вода');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Ne sovsěm/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onGrade).toHaveBeenCalledWith('again');
  });
});
