import { useState, type SubmitEvent } from 'react';
import type { Grade } from '@glotty/srs';
import { checkTyped, type Cloze } from './exercises';
import type { Script } from './useScript';
import { useT } from '../i18n';
import { activePack, renderText } from '../instance';

export interface ClozeCardProps {
  cloze: Cloze;
  script: Script;
  onGrade: (grade: Grade) => void;
}

type Outcome = 'correct' | 'incorrect';

/** Fill the blank in a real sentence; typing is script-tolerant. */
export function ClozeCard({ cloze, script, onGrade }: ClozeCardProps) {
  const t = useT();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [typed, setTyped] = useState('');

  const answer = (event: SubmitEvent) => {
    event.preventDefault();
    if (outcome !== null) {
      return;
    }
    setOutcome(
      checkTyped(activePack().normalize, cloze.answer, typed)
        ? 'correct'
        : 'incorrect',
    );
  };

  return (
    <section className="card" data-outcome={outcome ?? 'open'}>
      <p className="card-kind">{t('fillBlank')}</p>
      <h2 className="card-prompt" lang={activePack().bcp47}>
        {renderText(cloze.before, script)}
        <span className="cloze-gap" aria-label={t('missingWordAria')}>
          ____
        </span>
        {renderText(cloze.after, script)}
      </h2>
      <p className="cloze-translation">{cloze.translation}</p>

      <form className="card-typed" onSubmit={answer}>
        <label className="typed-label" htmlFor="cloze-answer">
          {t('clozeLabel')}
        </label>
        <input
          id="cloze-answer"
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
            <span lang={activePack().bcp47} className="feedback-answer">
              {renderText(cloze.answer, script)}
            </span>
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
