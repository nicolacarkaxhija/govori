import { useEffect, useState } from 'react';
import { fetchStats, type Stats } from '../api/client';
import { useT } from '../i18n';
import { activeDirection } from '../instance';

export interface StatsViewProps {
  onExit: () => void;
}

/** Open metrics (ADR 0033): the project's aggregate numbers, public. */
export function StatsView({ onExit }: StatsViewProps) {
  const t = useT();
  const [stats, setStats] = useState<Stats | null | 'loading'>('loading');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await fetchStats(activeDirection().direction.id);
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
          {t('back')}
        </button>
      </header>
      <div className="stats">
        <div className="stitch" aria-hidden="true" />
        <h2 className="stats-title">{t('openNumbers')}</h2>
        <p className="stats-note">{t('statsNote')}</p>
        {stats === 'loading' && <p className="lesson-note">{t('loading')}</p>}
        {stats === null && <p className="lesson-note">{t('unreachableNow')}</p>}
        {stats !== null && stats !== 'loading' && (
          <dl className="stat-grid">
            <div className="stat">
              <dt>{t('statItems')}</dt>
              <dd>{stats.items.toLocaleString('en')}</dd>
            </div>
            <div className="stat">
              <dt>{t('statTranslations')}</dt>
              <dd>{stats.translations.toLocaleString('en')}</dd>
            </div>
            <div className="stat">
              <dt>{t('statReviews')}</dt>
              <dd>{stats.reviews.toLocaleString('en')}</dd>
            </div>
            <div className="stat">
              <dt>{t('statLearners')}</dt>
              <dd>{stats.learners.toLocaleString('en')}</dd>
            </div>
          </dl>
        )}
        {/* The reviewer-audited golden-set score (ADR 0051), shown only once
            it exists and always honest about how many items back it. */}
        {stats !== null &&
          stats !== 'loading' &&
          stats.qualityScore !== null && (
            <p className="stats-quality">
              {t('qualityScore', {
                score: stats.qualityScore,
                count: stats.qualityAuditedItems,
              })}
            </p>
          )}
      </div>
    </div>
  );
}
