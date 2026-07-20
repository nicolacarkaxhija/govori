import { useEffect, useState } from 'react';
import {
  fetchGoldenQueue,
  submitGoldenAudit,
  type GoldenEntry,
} from '../api/client';
import { useT } from '../i18n';
import type { Script } from '../learn/useScript';
import { activeDirection, activePack, renderText } from '../instance';

export interface GoldenAuditViewProps {
  script: Script;
  onExit: () => void;
}

type Phase =
  | { name: 'loading' }
  | { name: 'unavailable' }
  | { name: 'auditing'; queue: GoldenEntry[] };

const AXES = ['accuracy', 'naturalness', 'fit'] as const;
type Axis = (typeof AXES)[number];
type Scores = Record<Axis, number | null>;

const axisLabel: Record<Axis, 'axisAccuracy' | 'axisNaturalness' | 'axisFit'> =
  {
    accuracy: 'axisAccuracy',
    naturalness: 'axisNaturalness',
    fit: 'axisFit',
  };

const emptyScores: Scores = { accuracy: null, naturalness: null, fit: null };

/**
 * Reviewer-only golden-set audit (ADR 0051): one item at a time, three 1-5
 * axes and an optional comment. Server-gated to reviewers; this view only
 * renders what the queue returns and advances as each audit lands.
 */
export function GoldenAuditView({ script, onExit }: GoldenAuditViewProps) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [audited, setAudited] = useState(0);
  const [scores, setScores] = useState<Scores>(emptyScores);
  const [comment, setComment] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const queue = await fetchGoldenQueue(activeDirection().direction.id);
      if (active) {
        setPhase(
          queue === null
            ? { name: 'unavailable' }
            : { name: 'auditing', queue },
        );
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const current = phase.name === 'auditing' ? phase.queue[0] : undefined;
  const ready =
    scores.accuracy !== null &&
    scores.naturalness !== null &&
    scores.fit !== null;

  const submit = async () => {
    if (
      phase.name !== 'auditing' ||
      current === undefined ||
      scores.accuracy === null ||
      scores.naturalness === null ||
      scores.fit === null
    ) {
      return;
    }
    const ok = await submitGoldenAudit(current.item.id, {
      accuracy: scores.accuracy,
      naturalness: scores.naturalness,
      fit: scores.fit,
      comment,
    });
    if (ok) {
      setAudited((count) => count + 1);
      setScores(emptyScores);
      setComment('');
      setPhase({ name: 'auditing', queue: phase.queue.slice(1) });
    }
  };

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          {t('back')}
        </button>
        <p className="lesson-count" aria-live="polite">
          {t('goldenAudited', { count: audited })}
        </p>
      </header>

      <div className="stats">
        <div className="stitch" aria-hidden="true" />
        <h2 className="stats-title">{t('auditGoldenSet')}</h2>
        <p className="stats-note">{t('goldenIntro')}</p>

        {phase.name === 'loading' && (
          <p className="lesson-note">{t('loading')}</p>
        )}
        {phase.name === 'unavailable' && (
          <p className="lesson-note">{t('goldenUnavailable')}</p>
        )}
        {phase.name === 'auditing' && current === undefined && (
          <div className="lesson-done">
            <div className="stitch" aria-hidden="true" />
            <h2>{t('allReviewed')}</h2>
            <p>{t('goldenEmpty')}</p>
          </div>
        )}
        {current !== undefined && (
          <div className="review-entry">
            <p className="review-text" lang={activePack().bcp47}>
              {renderText(current.item.text, script)}
            </p>
            <p className="review-translation">
              {current.item.translations[0]?.text ?? ''}
            </p>
            {current.priorAudit !== null && (
              <p className="lesson-note">
                {t('priorAuditLabel', {
                  accuracy: current.priorAudit.accuracy,
                  naturalness: current.priorAudit.naturalness,
                  fit: current.priorAudit.fit,
                })}
              </p>
            )}
            {AXES.map((axis) => (
              <fieldset key={axis} className="audit-axis">
                <legend>{t(axisLabel[axis])}</legend>
                <div className="audit-scale">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className="choice"
                      aria-pressed={scores[axis] === value}
                      data-state={
                        scores[axis] === value ? 'correct' : undefined
                      }
                      onClick={() => {
                        setScores((prior) => ({ ...prior, [axis]: value }));
                      }}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <label className="field">
              {t('auditComment')}
              <textarea
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value);
                }}
              />
            </label>
            <button
              type="button"
              className="primary"
              disabled={!ready}
              onClick={() => void submit()}
            >
              {t('submitAudit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
