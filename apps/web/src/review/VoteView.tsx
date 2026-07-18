import { useEffect, useState } from 'react';
import { transliterate } from '@govori/transliteration';
import { castVote, fetchPendingVotes, type PendingVote } from '../api/client';
import { useT } from '../i18n';
import type { Script } from '../learn/useScript';

export interface VoteViewProps {
  script: Script;
  onExit: () => void;
  onSignIn: () => void;
}

type Phase =
  | { name: 'loading' }
  | { name: 'unavailable' }
  | { name: 'signIn' }
  | { name: 'voting'; pending: PendingVote[] };

/**
 * Community review: every signed-in learner votes drafts up or down;
 * the server publishes at net three upvotes. Tallies always come from
 * the server response, never local guesses.
 */
export function VoteView({ script, onExit, onSignIn }: VoteViewProps) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const pending = await fetchPendingVotes();
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
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const vote = async (entry: PendingVote, up: boolean) => {
    if (phase.name !== 'voting') {
      return;
    }
    const tally = await castVote(entry.item.id, up);
    if (tally !== null) {
      setPhase({
        name: 'voting',
        pending: phase.pending.map((candidate) =>
          candidate.item.id === entry.item.id
            ? { ...candidate, ...tally, myVote: up }
            : candidate,
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
            <li key={entry.item.id} className="review-entry">
              <p className="review-text" lang="isv">
                {transliterate(entry.item.text, { script })}
              </p>
              <p className="review-translation">
                {entry.item.translations[0]?.text ?? ''}
              </p>
              <div className="review-actions">
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
