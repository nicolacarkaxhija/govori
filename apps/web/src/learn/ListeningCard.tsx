import { useEffect, useState, type SubmitEvent } from 'react';
import type { Grade } from '@glotty/srs';
import {
  fetchRecordings,
  recordingUrl,
  type LearnItem,
  type Recording,
} from '../api/client';
import { checkTyped, translationFor } from './exercises';
import { useT } from '../i18n';
import { fallbackLang, pack } from '../instance';

export interface ListeningCardProps {
  item: LearnItem;
  /** Learner language (L1); the instance's fallback by default. */
  lang?: string;
  onGrade: (grade: Grade) => void;
  /** No recordings for this item yet — the lesson falls back (ADR 0004). */
  onUnavailable: () => void;
}

type Outcome = 'correct' | 'incorrect';

/** Listening transcription (ADR 0005): hear a community clip, type it. */
export function ListeningCard({
  item,
  lang = fallbackLang,
  onGrade,
  onUnavailable,
}: ListeningCardProps) {
  const t = useT();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [typed, setTyped] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    let active = true;
    void fetchRecordings(item.id).then((found) => {
      if (!active) {
        return;
      }
      if (found.length === 0) {
        onUnavailable();
      } else {
        setRecordings(found);
      }
    });
    return () => {
      active = false;
    };
    // onUnavailable is a stable parent callback; item identity drives this.
  }, [item.id]);

  const play = (random: () => number = Math.random) => {
    const pick = recordings[Math.floor(random() * recordings.length)];
    if (pick !== undefined) {
      void new Audio(recordingUrl(pick.id)).play();
    }
  };

  const answer = (event: SubmitEvent) => {
    event.preventDefault();
    if (outcome !== null) {
      return;
    }
    setOutcome(
      checkTyped(pack.normalize, item.text, typed) ? 'correct' : 'incorrect',
    );
  };

  if (recordings.length === 0) {
    return null;
  }

  return (
    <section className="card" data-outcome={outcome ?? 'open'}>
      <p className="card-kind">{t('listeningKind')}</p>
      <div className="audio-tools">
        <button
          type="button"
          className="quiet"
          onClick={() => {
            play();
          }}
        >
          {t('listen')}
        </button>
      </div>

      <form className="card-typed" onSubmit={answer}>
        <label className="typed-label" htmlFor="listening-answer">
          {t('listeningPrompt')}
        </label>
        <input
          id="listening-answer"
          className="typed-input"
          autoComplete="off"
          spellCheck={false}
          value={typed}
          disabled={outcome !== null}
          onChange={(event) => {
            setTyped(event.target.value);
          }}
        />
        <button
          className="typed-submit"
          type="submit"
          disabled={outcome !== null}
        >
          {t('check')}
        </button>
      </form>

      {outcome !== null && (
        <div className="card-feedback">
          <p className="feedback-text">
            {outcome === 'correct' ? t('correct') : t('incorrect')}{' '}
            <span lang={pack.bcp47} className="feedback-answer">
              {item.text}
            </span>{' '}
            = {translationFor(item, lang, fallbackLang)}
          </p>
          <button
            type="button"
            className="continue"
            onClick={() => {
              onGrade(outcome === 'correct' ? 'good' : 'again');
            }}
            autoFocus
          >
            {t('continueButton')}
          </button>
        </div>
      )}
    </section>
  );
}
