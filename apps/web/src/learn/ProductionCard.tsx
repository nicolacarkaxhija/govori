import { useEffect, useState } from 'react';
import type { Grade } from '@glotty/srs';
import { contribute, fetchMe } from '../api/client';
import { checkProduction, type Production } from './exercises';
import type { Script } from './useScript';
import { useT } from '../i18n';
import { pack, renderText } from '../instance';

export interface ProductionCardProps {
  production: Production;
  script: Script;
  /** Learner language (L1); a submitted sentence is filed against it. */
  lang: string;
  onGrade: (grade: Grade) => void;
}

type Outcome = 'correct' | 'incorrect';

/**
 * Free production (ADR 0045): the learner writes an original sentence
 * using the prompted due words. The check is the pack's canonical
 * judgment plus stem-containment of every word; the learner then
 * self-grades, and — when signed in — may send the sentence to review.
 */
export function ProductionCard({
  production,
  script,
  lang,
  onGrade,
}: ProductionCardProps) {
  const t = useT();
  const [typed, setTyped] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [canContribute, setCanContribute] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gloss, setGloss] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchMe().then((me) => {
      if (active) {
        setCanContribute(me !== null);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const check = () => {
    setOutcome(
      checkProduction(pack, typed, production.words) ? 'correct' : 'incorrect',
    );
  };

  const submit = async () => {
    setBusy(true);
    const result = await contribute('sentence', typed.trim(), [
      { lang, text: gloss.trim() },
    ]);
    setBusy(false);
    if (result === 'accepted') {
      setSubmitted(true);
    }
  };

  return (
    <section className="card" data-outcome={outcome ?? 'open'}>
      <p className="card-kind">{t('productionKind')}</p>
      <p className="card-prompt-note">{t('productionPrompt')}</p>
      <ul className="production-words">
        {production.words.map((word) => (
          <li key={word.itemId} className="production-word">
            <span lang={pack.bcp47} className="production-target">
              {renderText(word.text, script)}
            </span>{' '}
            <span className="production-gloss">{word.translation}</span>
          </li>
        ))}
      </ul>

      <label className="typed-label" htmlFor="production-answer">
        {t('productionPrompt')}
      </label>
      <textarea
        id="production-answer"
        className="typed-input production-input"
        lang={pack.bcp47}
        autoComplete="off"
        spellCheck={false}
        value={typed}
        disabled={outcome !== null}
        onChange={(event) => {
          setTyped(event.target.value);
        }}
      />
      {outcome === null && (
        <button
          type="button"
          className="typed-submit"
          disabled={typed.trim() === ''}
          onClick={check}
        >
          {t('check')}
        </button>
      )}

      {outcome !== null && (
        <div className="card-feedback">
          <p className="feedback-text">
            {outcome === 'correct' ? t('correct') : t('productionMiss')}
          </p>
          {canContribute &&
            (submitted ? (
              <p className="account-sync">{t('contributed')}</p>
            ) : (
              <div className="production-contribute">
                <label className="typed-label" htmlFor="production-gloss">
                  {t('translationLabel')}
                </label>
                <input
                  id="production-gloss"
                  className="typed-input"
                  autoComplete="off"
                  value={gloss}
                  onChange={(event) => {
                    setGloss(event.target.value);
                  }}
                />
                <button
                  type="button"
                  className="footer-link"
                  disabled={busy || gloss.trim() === ''}
                  onClick={() => void submit()}
                >
                  {t('submitReview')}
                </button>
              </div>
            ))}
          <div className="self-rate">
            <button
              type="button"
              className="continue"
              onClick={() => {
                onGrade('good');
              }}
            >
              {t('selfRateGood')}
            </button>
            <button
              type="button"
              className="quiet"
              onClick={() => {
                onGrade('again');
              }}
            >
              {t('selfRateAgain')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
