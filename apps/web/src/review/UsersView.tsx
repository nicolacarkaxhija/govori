import { useEffect, useState } from 'react';
import { fetchUsers, setUserRole, type UserRow } from '../api/client';
import { useT } from '../i18n';

export interface UsersViewProps {
  onExit: () => void;
}

type Phase =
  | { name: 'loading' }
  | { name: 'unavailable' }
  | { name: 'listing'; users: UserRow[] };

/** Admin directory: promote reviewers without touching the database. */
export function UsersView({ onExit }: UsersViewProps) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const users = await fetchUsers();
      if (active) {
        setPhase(
          users === null ? { name: 'unavailable' } : { name: 'listing', users },
        );
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const assign = async (row: UserRow, next: UserRow['role']) => {
    if (phase.name !== 'listing' || next === row.role) {
      return;
    }
    const ok = await setUserRole(row.id, next);
    if (ok) {
      setPhase({
        name: 'listing',
        users: phase.users.map((user) =>
          user.id === row.id ? { ...user, role: next } : user,
        ),
      });
    }
  };

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          {t('back')}
        </button>
      </header>

      {phase.name === 'loading' && (
        <p className="lesson-note">{t('loading')}</p>
      )}
      {phase.name === 'unavailable' && (
        <p className="lesson-note">{t('usersUnavailable')}</p>
      )}
      {phase.name === 'listing' && (
        <ul className="review-list">
          {phase.users.map((row) => (
            <li key={row.id} className="review-entry">
              <p className="review-text">{row.name}</p>
              <p className="review-translation">
                {row.email} — {row.role}
              </p>
              <div className="review-actions">
                <select
                  className="footer-select"
                  aria-label={t('roleLabel')}
                  value={row.role}
                  onChange={(event) => {
                    const { value } = event.target;
                    if (
                      value === 'learner' ||
                      value === 'reviewer' ||
                      value === 'admin'
                    ) {
                      void assign(row, value);
                    }
                  }}
                >
                  <option value="learner">{t('roleLearner')}</option>
                  <option value="reviewer">{t('roleReviewer')}</option>
                  <option value="admin">{t('roleAdmin')}</option>
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
