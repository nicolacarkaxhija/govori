import { useEffect, useState } from 'react';
import type { Grade } from '@glotty/srs';
import { fetchItems, type LearnItem } from '../api/client';
import { useT } from '../i18n';
import { MatchingCard } from '../learn/MatchingCard';
import { recordReview } from '../learn/progress';
import type { Script } from '../learn/useScript';

export interface SpeedReviewViewProps {
  script: Script;
  learnLang: string;
  onExit: () => void;
}

const DURATION_SECONDS = 30;
/** Enough items that consecutive boards feel fresh. */
const SPEED_FETCH_LIMIT = 50;

type State =
  | { name: 'loading' }
  | { name: 'unreachable' }
  | { name: 'ready'; pool: LearnItem[] };

/**
 * Timed matching: clear as many boards as the clock allows. Grades ride
 * the normal review log, so speed practice still schedules honestly.
 */
export function SpeedReviewView({
  script,
  learnLang,
  onExit,
}: SpeedReviewViewProps) {
  const t = useT();
  const [state, setState] = useState<State>({ name: 'loading' });
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS);
  const [cleared, setCleared] = useState(0);
  // No flashing for motion-sensitive learners: the text countdown stays,
  // the shrinking bar goes.
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const found = await fetchItems(SPEED_FETCH_LIMIT);
      if (!active) {
        return;
      }
      // A matching board needs four pairs; fewer means no game.
      setState(
        found === null || found.length < 4
          ? { name: 'unreachable' }
          : { name: 'ready', pool: found },
      );
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const running = state.name === 'ready' && secondsLeft > 0;

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const id = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [running]);

  const complete = (results: { itemId: string; grade: Grade }[]) => {
    for (const result of results) {
      recordReview(result.itemId, result.grade);
    }
    setCleared((count) => count + 1);
  };

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          {t('back')}
        </button>
        <p className="lesson-count" aria-live="polite">
          {t('boardsCleared', { count: cleared })}
        </p>
      </header>

      {state.name === 'loading' && (
        <p className="lesson-note">{t('loading')}</p>
      )}
      {state.name === 'unreachable' && (
        <p className="lesson-note">{t('unreachable')}</p>
      )}

      {running && (
        <>
          <p className="speed-timer" aria-live="polite">
            {t('secondsLeft', { count: secondsLeft })}
          </p>
          {!reducedMotion && (
            <div className="speed-bar" aria-hidden="true">
              <div
                className="speed-bar-fill"
                style={{
                  width: `${String((secondsLeft / DURATION_SECONDS) * 100)}%`,
                }}
              />
            </div>
          )}
          <MatchingCard
            key={cleared}
            pool={state.pool}
            script={script}
            lang={learnLang}
            onComplete={complete}
          />
        </>
      )}

      {state.name === 'ready' && secondsLeft === 0 && (
        <div className="lesson-done">
          <div className="stitch" aria-hidden="true" />
          <h2>{t('timeUp')}</h2>
          <p>{t('boardsCleared', { count: cleared })}</p>
        </div>
      )}
    </div>
  );
}
