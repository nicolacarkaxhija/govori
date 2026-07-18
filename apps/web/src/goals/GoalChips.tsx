import { useT } from '../i18n';
import { loadEvents } from '../learn/progress';
import { journalDays } from '../journal/journal';
import { goalFraction, goalMet, weeklyGoals } from './goals';

/**
 * The home goal widget (ADR 0045): a few weekly targets computed from the
 * local review log and journal activity, each a task count with a bar —
 * personal momentum, no clock, no social comparison.
 */
export function GoalChips() {
  const t = useT();
  const goals = weeklyGoals(loadEvents(), journalDays());

  return (
    <section className="goals" aria-label={t('goalsTitle')}>
      <p className="goals-title">{t('goalsTitle')}</p>
      <ul className="goals-list">
        {goals.map((goal) => (
          <li
            key={goal.label}
            className="goal-chip"
            data-met={goalMet(goal) ? 'yes' : 'no'}
          >
            <span className="goal-label">{t(goal.label)}</span>
            <span className="goal-count">
              {t('goalProgress', { done: goal.current, total: goal.target })}
            </span>
            <span className="goal-bar" aria-hidden="true">
              <span
                className="goal-bar-fill"
                style={{
                  width: `${String(Math.round(goalFraction(goal) * 100))}%`,
                }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
