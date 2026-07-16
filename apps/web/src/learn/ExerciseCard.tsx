import { useMemo, useState, type SubmitEvent } from 'react';
import { transliterate } from '@govori/transliteration';
import type { Grade } from '@govori/srs';
import type { LearnItem } from '../api/client';
import { buildChoices, checkTyped } from './exercises';
import type { Script } from './useScript';

export interface ExerciseCardProps {
  item: LearnItem;
  pool: readonly LearnItem[];
  script: Script;
  mode: 'choices' | 'typed';
  onGrade: (grade: Grade) => void;
}

type Outcome = 'correct' | 'incorrect';

export function ExerciseCard({
  item,
  pool,
  script,
  mode,
  onGrade,
}: ExerciseCardProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');

  const prompt = transliterate(item.text, { script });
  const correct = item.translations[0]?.text ?? '';
  // The card remounts per item (keyed by the parent), so choices are
  // computed once per exercise and stay stable while it is answered.
  const choices = useMemo(() => buildChoices(item, pool, 4), [item, pool]);

  const answerChoice = (choice: string) => {
    if (outcome !== null) {
      return;
    }
    setPicked(choice);
    setOutcome(choice === correct ? 'correct' : 'incorrect');
  };

  const answerTyped = (event: SubmitEvent) => {
    event.preventDefault();
    if (outcome !== null) {
      return;
    }
    setOutcome(checkTyped(item.text, typed) ? 'correct' : 'incorrect');
  };

  const finish = () => {
    onGrade(outcome === 'correct' ? 'good' : 'again');
  };

  return (
    <section className="card" data-outcome={outcome ?? 'open'}>
      <p className="card-kind">{item.kind}</p>
      <h2 className="card-prompt" lang="isv">
        {prompt}
      </h2>

      {mode === 'choices' ? (
        <div className="card-choices" role="group" aria-label="translations">
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className="choice"
              data-state={
                outcome === null
                  ? 'open'
                  : choice === correct
                    ? 'correct'
                    : choice === picked
                      ? 'incorrect'
                      : 'muted'
              }
              onClick={() => {
                answerChoice(choice);
              }}
            >
              {choice}
            </button>
          ))}
        </div>
      ) : (
        <form className="card-typed" onSubmit={answerTyped}>
          <label className="typed-label" htmlFor="typed-answer">
            Type it in Interslavic — any script, accents optional
          </label>
          <input
            id="typed-answer"
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
      )}

      {outcome !== null && (
        <div className="card-feedback">
          <p className="feedback-text">
            {outcome === 'correct' ? 'Pravilno!' : 'Ne sovsěm.'}{' '}
            <span lang="isv" className="feedback-answer">
              {prompt}
            </span>{' '}
            = {correct}
          </p>
          <button type="button" className="continue" onClick={finish} autoFocus>
            Continue
          </button>
        </div>
      )}
    </section>
  );
}
