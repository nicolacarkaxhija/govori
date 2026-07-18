import { useState, type SubmitEvent } from 'react';
import { transliterate } from '@glotty/transliteration-isv';
import type { Grade } from '@glotty/srs';
import type { LearnItem } from '../api/client';
import { checkTyped } from './exercises';
import type { Script } from './useScript';
import { useT } from '../i18n';

export interface ScriptCardProps {
  item: LearnItem;
  /** The learner's display script — the drill asks for the other one. */
  script: Script;
  onGrade: (grade: Grade) => void;
}

type Outcome = 'correct' | 'incorrect';

/**
 * Script drill (ADR 0003): read the item in one script, write it in the
 * other. Checking runs through normalize, so either script is accepted —
 * the drill teaches, it never punishes the keyboard.
 */
export function ScriptCard({ item, script, onGrade }: ScriptCardProps) {
  const t = useT();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [typed, setTyped] = useState('');

  const other: Script = script === 'latin' ? 'cyrillic' : 'latin';
  const prompt = transliterate(item.text, { script });
  const target = transliterate(item.text, { script: other });

  const answer = (event: SubmitEvent) => {
    event.preventDefault();
    if (outcome !== null) {
      return;
    }
    setOutcome(checkTyped(item.text, typed) ? 'correct' : 'incorrect');
  };

  return (
    <section className="card" data-outcome={outcome ?? 'open'}>
      <p className="card-kind">{t('scriptDrillKind')}</p>
      <h2 className="card-prompt" lang="isv">
        {prompt}
      </h2>

      <form className="card-typed" onSubmit={answer}>
        <label className="typed-label" htmlFor="script-answer">
          {t(other === 'cyrillic' ? 'scriptToCyrillic' : 'scriptToLatin')}
        </label>
        <input
          id="script-answer"
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
            <span lang="isv" className="feedback-answer">
              {prompt}
            </span>{' '}
            ={' '}
            <span lang="isv" className="feedback-answer">
              {target}
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
