import { useEffect, useState } from 'react';
import {
  fetchQualityFlags,
  type QualityFlag,
  type ReportReason,
} from '../api/client';
import { useT, type MessageKey } from '../i18n';
import type { Script } from '../learn/useScript';
import { activePack, renderText } from '../instance';

export interface QualityFlagsViewProps {
  script: Script;
  onExit: () => void;
}

const REASON_KEYS: Record<ReportReason, MessageKey> = {
  wrong_translation: 'reportReasonWrongTranslation',
  not_natural: 'reportReasonNotNatural',
  wrong_audio: 'reportReasonWrongAudio',
  other: 'reportReasonOther',
};

type Phase =
  | { name: 'loading' }
  | { name: 'unavailable' }
  | { name: 'ready'; flags: QualityFlag[] };

/**
 * The reviewer end of the quality-feedback loop (ADR 0051): items the server
 * auto-escalated — lapse-heavy in the review log or hand-reported past the bar
 * — most severe first, each with its counts and reasons. Reviewer-gated
 * server-side; this view only renders. There is no content-edit flow to open
 * an item into yet, so it displays rather than links (ADR 0051 charter).
 */
export function QualityFlagsView({ script, onExit }: QualityFlagsViewProps) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const flags = await fetchQualityFlags();
      if (active) {
        setPhase(
          flags === null ? { name: 'unavailable' } : { name: 'ready', flags },
        );
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

      {phase.name === 'loading' && (
        <p className="lesson-note">{t('loading')}</p>
      )}
      {phase.name === 'unavailable' && (
        <p className="lesson-note">{t('qualityFlagsUnavailable')}</p>
      )}
      {phase.name === 'ready' && phase.flags.length === 0 && (
        <div className="lesson-done">
          <div className="stitch" aria-hidden="true" />
          <h2>{t('qualityFlags')}</h2>
          <p>{t('qualityFlagsEmpty')}</p>
        </div>
      )}
      {phase.name === 'ready' && phase.flags.length > 0 && (
        <ul className="review-list">
          {phase.flags.map((flag) => (
            <li key={flag.item.id} className="review-entry">
              <p className="review-text" lang={activePack().bcp47}>
                {renderText(flag.item.text, script)}
              </p>
              <p className="review-translation">
                {flag.item.translations[0]?.text ?? ''}
              </p>
              <div className="quality-metrics">
                {flag.totalGraded > 0 && (
                  <p className="quality-lapse">
                    {t('qualityLapseRate', {
                      rate: Math.round(flag.failureRate * 100),
                      again: flag.againCount,
                      total: flag.totalGraded,
                    })}
                  </p>
                )}
                {flag.openReports > 0 && (
                  <p className="quality-reports">
                    {t('qualityReportCount', { count: flag.openReports })}
                    {flag.reasons.length > 0 && (
                      <span className="quality-reasons">
                        {' · '}
                        {flag.reasons
                          .map(
                            (entry) =>
                              `${t(REASON_KEYS[entry.reason])} ×${String(entry.count)}`,
                          )
                          .join(', ')}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
