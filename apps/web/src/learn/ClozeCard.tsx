import { useState, type SubmitEvent } from 'react';
import { transliterate } from '@govori/transliteration';
import type { Grade } from '@govori/srs';
import { checkTyped, type Cloze } from './exercises';
import type { Script } from './useScript';

export interface ClozeCardProps {
  cloze: Cloze;
  script: Script;
  onGrade: (grade: Grade) => void;
}

type Outcome = 'correct' | 'incorrect';

/** Fill the blank in a real sentence; typing is script-tolerant. */
export function ClozeCard({ cloze, script, onGrade }: ClozeCardProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [typed, setTyped] = useState('');

  const answer = (event: SubmitEvent) => {
    event.preventDefault();
    if (outcome !== null) {
      return;
    }
    setOutcome(checkTyped(cloze.answer, typed) ? 'correct' : 'incorrect');
  };

  return (
    <section className="card" data-outcome={outcome ?? 'open'}>
      <p className="card-kind">fill the blank</p>
      <h2 className="card-prompt" lang="isv">
        {transliterate(cloze.before, { script })}
        <span className="cloze-gap" aria-label="missing word">
          ____
        </span>
        {transliterate(cloze.after, { script })}
      </h2>
      <p className="cloze-translation">{cloze.translation}</p>

      <form className="card-typed" onSubmit={answer}>
        <label className="typed-label" htmlFor="cloze-answer">
          Type the missing word — any script, accents optional
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
          Check
        </button>
      </form>

      {outcome !== null && (
        <div className="card-feedback">
          <p className="feedback-text">
            {outcome === 'correct' ? 'Pravilno!' : 'Ne sovsěm.'}{' '}
            <span lang="isv" className="feedback-answer">
              {transliterate(cloze.answer, { script })}
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
            Continue
          </button>
        </div>
      )}
    </section>
  );
}
