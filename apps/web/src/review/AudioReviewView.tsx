import { useEffect, useState } from 'react';
import {
  castAudioVote,
  fetchPendingAudio,
  recordingUrl,
  type PendingRecording,
} from '../api/client';
import { useT } from '../i18n';
import type { Script } from '../learn/useScript';
import { activePack, renderText } from '../instance';

export interface AudioReviewViewProps {
  script: Script;
  onExit: () => void;
  onSignIn: () => void;
}

type Phase =
  | { name: 'loading' }
  | { name: 'unavailable' }
  | { name: 'signIn' }
  | { name: 'voting'; pending: PendingRecording[] };

/**
 * Community audio validation (ADR 0048/0040): every signed-in learner plays a
 * pending clip and votes it up or down; the server verifies at the same net
 * threshold that publishes text drafts. Tallies and status always come from
 * the server response — a clip that crosses the bar leaves the queue.
 * Rendered only while the audio flag is live.
 */
export function AudioReviewView({
  script,
  onExit,
  onSignIn,
}: AudioReviewViewProps) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });

  useEffect(() => {
    let active = true;
    void fetchPendingAudio().then((pending) => {
      if (!active) {
        return;
      }
      if (pending === 'unauthenticated') {
        setPhase({ name: 'signIn' });
      } else if (pending === null) {
        setPhase({ name: 'unavailable' });
      } else {
        setPhase({ name: 'voting', pending });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const play = (id: string) => {
    void new Audio(recordingUrl(id)).play();
  };

  const vote = async (entry: PendingRecording, up: boolean) => {
    if (phase.name !== 'voting') {
      return;
    }
    const result = await castAudioVote(entry.id, up);
    if (result === null) {
      return;
    }
    setPhase({
      name: 'voting',
      pending:
        result.status === 'pending'
          ? phase.pending.map((candidate) =>
              candidate.id === entry.id
                ? {
                    ...candidate,
                    upvotes: result.upvotes,
                    downvotes: result.downvotes,
                    myVote: up,
                  }
                : candidate,
            )
          : // A verified or rejected clip has left the pending queue.
            phase.pending.filter((candidate) => candidate.id !== entry.id),
    });
  };

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          {t('back')}
        </button>
      </header>

      <h2 className="settings-title">{t('audioReview')}</h2>

      {phase.name === 'loading' && (
        <p className="lesson-note">{t('loading')}</p>
      )}
      {phase.name === 'unavailable' && (
        <p className="lesson-note">{t('unreachableNow')}</p>
      )}
      {phase.name === 'signIn' && (
        <div className="account">
          <div className="stitch" aria-hidden="true" />
          <p className="account-note">{t('signInToVote')}</p>
          <button type="button" className="footer-link" onClick={onSignIn}>
            {t('signInTitle')}
          </button>
        </div>
      )}
      {phase.name === 'voting' && phase.pending.length === 0 && (
        <div className="lesson-done">
          <div className="stitch" aria-hidden="true" />
          <h2>{t('allReviewed')}</h2>
          <p>{t('noVotes')}</p>
        </div>
      )}
      {phase.name === 'voting' && phase.pending.length > 0 && (
        <ul className="review-list">
          {phase.pending.map((entry) => (
            <li key={entry.id} className="review-entry">
              <p className="review-text" lang={activePack().bcp47}>
                {renderText(entry.item.text, script)}
              </p>
              <p className="review-translation">
                {entry.item.translations[0]?.text ?? ''}
              </p>
              <div className="review-actions">
                <button
                  type="button"
                  className="quiet"
                  onClick={() => {
                    play(entry.id);
                  }}
                >
                  {t('listen')}
                </button>
                <button
                  type="button"
                  className="choice"
                  data-state={entry.myVote === true ? 'correct' : 'open'}
                  onClick={() => void vote(entry, true)}
                >
                  {t('voteUp')} · {entry.upvotes}
                </button>
                <button
                  type="button"
                  className="choice"
                  data-state={entry.myVote === false ? 'incorrect' : 'open'}
                  onClick={() => void vote(entry, false)}
                >
                  {t('voteDown')} · {entry.downvotes}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
