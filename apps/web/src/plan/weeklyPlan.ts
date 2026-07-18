import { instance } from '../instance';
import type { MessageKey } from '../i18n';

const DAY_MS = 86_400_000;

/** Weekday labels, Monday first; the last two are the rest days. */
const WEEKDAY_KEYS: readonly MessageKey[] = [
  'weekdayMon',
  'weekdayTue',
  'weekdayWed',
  'weekdayThu',
  'weekdayFri',
  'weekdaySat',
  'weekdaySun',
];

/** The UTC Monday (YYYY-MM-DD) that opens the week containing `now`. */
export function mondayOf(now = new Date().toISOString()): string {
  const midnight = new Date(`${now.slice(0, 10)}T00:00:00.000Z`).getTime();
  const sinceMonday = (new Date(midnight).getUTCDay() + 6) % 7;
  return new Date(midnight - sinceMonday * DAY_MS).toISOString().slice(0, 10);
}

export type TaskKind = 'weak' | 'unit' | 'journal' | 'reviews';

/** One checkable task; `count`/`unit` carry the source-specific detail. */
export interface PlanTask {
  /** Stable across regeneration so checked-state survives (ADR 0045). */
  id: string;
  kind: TaskKind;
  count: number | null;
  unit: string | null;
}

export interface PlanDay {
  dayKey: MessageKey;
  /** A rest day is deliberately empty (weekends). */
  rest: boolean;
  tasks: PlanTask[];
}

export interface WeeklyPlan {
  weekStart: string;
  days: PlanDay[];
}

export interface PlanInputs {
  /** How many weak items the learner has, for the weak-review tasks. */
  weakCount: number;
  /** The chosen interest unit's title, or null when none is picked. */
  unitTitle: string | null;
  /** The weekly reviews goal target (from the goal chips). */
  reviewsTarget: number;
  weekStart: string;
}

/**
 * Drafts a Mon–Fri checklist (ADR 0045) drawing on the three sources —
 * weak items, a picked interest unit, and the reviews goal — with the
 * weekend left empty as a deliberate rest. Pure and deterministic.
 */
export function buildPlan(inputs: PlanInputs): WeeklyPlan {
  const days = WEEKDAY_KEYS.map((dayKey, index): PlanDay => {
    if (index >= 5) {
      return { dayKey, rest: true, tasks: [] };
    }
    const tasks: PlanTask[] = [];
    if ((index === 0 || index === 3) && inputs.weakCount > 0) {
      tasks.push({
        id: `${dayKey}-weak`,
        kind: 'weak',
        count: inputs.weakCount,
        unit: null,
      });
    }
    if ((index === 1 || index === 4) && inputs.unitTitle !== null) {
      tasks.push({
        id: `${dayKey}-unit`,
        kind: 'unit',
        count: null,
        unit: inputs.unitTitle,
      });
    }
    if (index === 2) {
      tasks.push({
        id: `${dayKey}-journal`,
        kind: 'journal',
        count: null,
        unit: null,
      });
    }
    tasks.push({
      id: `${dayKey}-reviews`,
      kind: 'reviews',
      count: inputs.reviewsTarget,
      unit: null,
    });
    return { dayKey, rest: false, tasks };
  });
  return { weekStart: inputs.weekStart, days };
}

const storageKey = (weekStart: string): string =>
  `${instance.id}.weeklyplan.v1.${weekStart}`;

/** The ids of tasks the learner has checked off this week. */
export function loadChecked(weekStart: string): string[] {
  const raw = localStorage.getItem(storageKey(weekStart));
  if (raw === null) {
    return [];
  }
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/** Persists a task's checked-state, returning the new checked-id list. */
export function setTaskDone(
  weekStart: string,
  taskId: string,
  done: boolean,
): string[] {
  const current = loadChecked(weekStart).filter((id) => id !== taskId);
  const next = done ? [...current, taskId] : current;
  localStorage.setItem(storageKey(weekStart), JSON.stringify(next));
  return next;
}
