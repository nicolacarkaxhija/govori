import { useEffect, useMemo, useState } from 'react';
import { fetchCourse, type Course } from '../api/client';
import { useT, type MessageKey } from '../i18n';
import { weeklyGoals } from '../goals/goals';
import { journalDays } from '../journal/journal';
import { loadEvents, weakestItemIds } from '../learn/progress';
import { activeDirection } from '../instance';
import {
  buildPlan,
  loadChecked,
  mondayOf,
  setTaskDone,
  type PlanTask,
} from './weeklyPlan';

export interface WeeklyPlanViewProps {
  onExit: () => void;
}

const TASK_LABELS: Record<PlanTask['kind'], MessageKey> = {
  weak: 'taskReviewWeak',
  unit: 'taskStudyUnit',
  journal: 'taskJournal',
  reviews: 'taskReviews',
};

/**
 * The weekly plan (ADR 0045): a Mon–Fri checklist drafted from weak
 * items, a chosen interest unit, and the reviews goal, with the weekend
 * left as rest. Checked-state is persisted per week in localStorage.
 */
export function WeeklyPlanView({ onExit }: WeeklyPlanViewProps) {
  const t = useT();
  const weekStart = mondayOf();
  const [units, setUnits] = useState<Course['units']>([]);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>(() =>
    loadChecked(weekStart),
  );

  useEffect(() => {
    let active = true;
    void fetchCourse(activeDirection().direction.id).then((course) => {
      if (!active || course === null) {
        return;
      }
      setUnits(course.units);
      setUnitId((current) => current ?? course.units[0]?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const reviewsTarget =
    weeklyGoals(loadEvents(), journalDays()).find(
      (goal) => goal.label === 'goalReviews',
    )?.target ?? 20;
  const unitTitle = units.find((unit) => unit.id === unitId)?.title ?? null;

  const plan = useMemo(
    () =>
      buildPlan({
        weakCount: weakestItemIds().length,
        unitTitle,
        reviewsTarget,
        weekStart,
      }),
    [unitTitle, reviewsTarget, weekStart],
  );

  const label = (task: PlanTask): string => {
    if (task.kind === 'unit') {
      return t(TASK_LABELS.unit, { unit: task.unit ?? '' });
    }
    if (task.kind === 'reviews') {
      return t(TASK_LABELS.reviews, { count: task.count ?? 0 });
    }
    return t(TASK_LABELS[task.kind]);
  };

  const toggle = (taskId: string, done: boolean) => {
    setChecked(setTaskDone(weekStart, taskId, done));
  };

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          {t('back')}
        </button>
      </header>

      <section className="plan">
        <div className="stitch" aria-hidden="true" />
        <h2 className="plan-title">{t('weeklyPlanTitle')}</h2>

        {units.length > 0 && (
          <label className="field">
            {t('planPickUnit')}
            <select
              value={unitId ?? ''}
              onChange={(event) => {
                setUnitId(event.target.value);
              }}
            >
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <ol className="plan-days">
          {plan.days.map((day) => (
            <li key={day.dayKey} className="plan-day" data-rest={day.rest}>
              <p className="plan-weekday">{t(day.dayKey)}</p>
              {day.rest ? (
                <p className="plan-rest">{t('planRestNote')}</p>
              ) : (
                <ul className="plan-tasks">
                  {day.tasks.map((task) => (
                    <li key={task.id} className="plan-task">
                      <label>
                        <input
                          type="checkbox"
                          checked={checked.includes(task.id)}
                          onChange={(event) => {
                            toggle(task.id, event.target.checked);
                          }}
                        />
                        {label(task)}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
