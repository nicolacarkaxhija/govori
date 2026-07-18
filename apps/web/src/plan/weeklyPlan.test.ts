import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildPlan,
  loadChecked,
  mondayOf,
  setTaskDone,
  type PlanInputs,
} from './weeklyPlan';

const base: PlanInputs = {
  weakCount: 4,
  unitTitle: 'Pozdravy',
  reviewsTarget: 20,
  weekStart: '2026-07-13',
};

describe('mondayOf', () => {
  it('returns the Monday opening the week', () => {
    expect(mondayOf('2026-07-18T12:00:00.000Z')).toBe('2026-07-13');
    expect(mondayOf('2026-07-13T00:30:00.000Z')).toBe('2026-07-13');
    expect(mondayOf('2026-07-19T23:00:00.000Z')).toBe('2026-07-13');
  });
});

describe('buildPlan', () => {
  it('leaves the weekend as rest with no tasks', () => {
    const plan = buildPlan(base);
    const weekend = plan.days.filter((day) => day.rest);
    expect(weekend.map((day) => day.dayKey)).toEqual([
      'weekdaySat',
      'weekdaySun',
    ]);
    expect(weekend.every((day) => day.tasks.length === 0)).toBe(true);
  });

  it('draws weak, unit, journal, and review tasks across Mon–Fri', () => {
    const kinds = buildPlan(base)
      .days.filter((day) => !day.rest)
      .flatMap((day) => day.tasks.map((task) => task.kind));
    expect(kinds).toContain('weak');
    expect(kinds).toContain('unit');
    expect(kinds).toContain('journal');
    expect(kinds).toContain('reviews');
  });

  it('omits weak tasks when there are no weak items', () => {
    const kinds = buildPlan({ ...base, weakCount: 0 }).days.flatMap((day) =>
      day.tasks.map((task) => task.kind),
    );
    expect(kinds).not.toContain('weak');
  });

  it('omits unit tasks when no unit is picked', () => {
    const kinds = buildPlan({ ...base, unitTitle: null }).days.flatMap((day) =>
      day.tasks.map((task) => task.kind),
    );
    expect(kinds).not.toContain('unit');
  });

  it('carries the reviews target and unit title into task detail', () => {
    const tasks = buildPlan(base).days.flatMap((day) => day.tasks);
    expect(tasks.find((task) => task.kind === 'reviews')?.count).toBe(20);
    expect(tasks.find((task) => task.kind === 'unit')?.unit).toBe('Pozdravy');
  });
});

describe('weekly plan persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and clears a task check per week', () => {
    expect(loadChecked('2026-07-13')).toEqual([]);
    setTaskDone('2026-07-13', 'weekdayMon-weak', true);
    expect(loadChecked('2026-07-13')).toEqual(['weekdayMon-weak']);
    // No duplicates on a repeat check.
    setTaskDone('2026-07-13', 'weekdayMon-weak', true);
    expect(loadChecked('2026-07-13')).toEqual(['weekdayMon-weak']);
    setTaskDone('2026-07-13', 'weekdayMon-weak', false);
    expect(loadChecked('2026-07-13')).toEqual([]);
  });

  it('keeps different weeks separate', () => {
    setTaskDone('2026-07-13', 'weekdayMon-weak', true);
    expect(loadChecked('2026-07-20')).toEqual([]);
  });
});
