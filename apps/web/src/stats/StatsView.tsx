import { useEffect, useState } from 'react';
import { fetchStats, type Stats } from '../api/client';

export interface StatsViewProps {
  onExit: () => void;
}

/** Open metrics (ADR 0033): the project's aggregate numbers, public. */
export function StatsView({ onExit }: StatsViewProps) {
  const [stats, setStats] = useState<Stats | null | 'loading'>('loading');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await fetchStats();
      if (active) {
        setStats(result);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          ← Back
        </button>
      </header>
      <div className="stats">
        <div className="stitch" aria-hidden="true" />
        <h2 className="stats-title">Open numbers</h2>
        <p className="stats-note">
          Everything aggregate, nothing personal — the project in public.
        </p>
        {stats === 'loading' && <p className="lesson-note">Loading…</p>}
        {stats === null && (
          <p className="lesson-note">The server is unreachable right now.</p>
        )}
        {stats !== null && stats !== 'loading' && (
          <dl className="stat-grid">
            <div className="stat">
              <dt>Dictionary items</dt>
              <dd>{stats.items.toLocaleString('en')}</dd>
            </div>
            <div className="stat">
              <dt>Translations</dt>
              <dd>{stats.translations.toLocaleString('en')}</dd>
            </div>
            <div className="stat">
              <dt>Reviews answered</dt>
              <dd>{stats.reviews.toLocaleString('en')}</dd>
            </div>
            <div className="stat">
              <dt>Learners</dt>
              <dd>{stats.learners.toLocaleString('en')}</dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
