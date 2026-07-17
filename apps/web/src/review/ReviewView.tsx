import { useEffect, useState } from 'react';
import { transliterate } from '@govori/transliteration';
import {
  decideReview,
  fetchPendingReviews,
  type LearnItem,
} from '../api/client';
import type { Script } from '../learn/useScript';

export interface ReviewViewProps {
  script: Script;
  onExit: () => void;
}

type Phase =
  | { name: 'loading' }
  | { name: 'unavailable' }
  | { name: 'reviewing'; pending: LearnItem[] };

/** The human gate for AI drafts (ADR 0038): approve publishes, reject
 * keeps a tombstone. Admin-gated server-side; this view just renders. */
export function ReviewView({ script, onExit }: ReviewViewProps) {
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [decided, setDecided] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const pending = await fetchPendingReviews();
      if (active) {
        setPhase(
          pending === null
            ? { name: 'unavailable' }
            : { name: 'reviewing', pending },
        );
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const decide = async (item: LearnItem, decision: 'approve' | 'reject') => {
    if (phase.name !== 'reviewing') {
      return;
    }
    const ok = await decideReview(item.id, decision);
    if (ok) {
      setDecided((count) => count + 1);
      setPhase({
        name: 'reviewing',
        pending: phase.pending.filter((entry) => entry.id !== item.id),
      });
    }
  };

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          ← Back
        </button>
        <p className="lesson-count" aria-live="polite">
          {decided} decided
        </p>
      </header>

      {phase.name === 'loading' && <p className="lesson-note">Loading…</p>}
      {phase.name === 'unavailable' && (
        <p className="lesson-note">
          The review queue is unavailable — are you signed in as an admin?
        </p>
      )}
      {phase.name === 'reviewing' && phase.pending.length === 0 && (
        <div className="lesson-done">
          <div className="stitch" aria-hidden="true" />
          <h2>Vse pregledano.</h2>
          <p>No drafts are waiting for review.</p>
        </div>
      )}
      {phase.name === 'reviewing' && phase.pending.length > 0 && (
        <ul className="review-list">
          {phase.pending.map((item) => (
            <li key={item.id} className="review-entry">
              <p className="review-text" lang="isv">
                {transliterate(item.text, { script })}
              </p>
              <p className="review-translation">
                {item.translations[0]?.text ?? ''}
              </p>
              <div className="review-actions">
                <button
                  type="button"
                  className="choice"
                  data-state="correct"
                  onClick={() => void decide(item, 'approve')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="choice"
                  data-state="incorrect"
                  onClick={() => void decide(item, 'reject')}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
