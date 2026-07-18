import { useMemo, useState, type SubmitEvent } from 'react';
import type { Grade } from '@glotty/srs';
import type { LearnItem } from '../api/client';
import { AudioTools } from './AudioTools';
import {
  buildChoices,
  buildReverseChoices,
  checkTyped,
  translationFor,
} from './exercises';
import type { Script } from './useScript';
import { useT } from '../i18n';
import { instance, pack, renderText } from '../instance';

export interface ExerciseCardProps {
  item: LearnItem;
  pool: readonly LearnItem[];
  script: Script;
  mode: 'choices' | 'typed' | 'reverseChoices' | 'reverseTyped';
  onGrade: (grade: Grade) => void;
  /** Learner language (L1); the instance's fallback by default. */
  lang?: string;
  /** Community audio rights; omitted while the flag is dark (ADR 0004). */
  audio?: { canListen: boolean; canRecord: boolean } | undefined;
}

type Outcome = 'correct' | 'incorrect';

export function ExerciseCard({
  item,
  pool,
  script,
  mode,
  onGrade,
  lang = instance.fallbackTranslationLang,
  audio,
}: ExerciseCardProps) {
  const t = useT();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');

  // Reverse rounds prompt with the translation and answer in Interslavic.
  const reverse = mode === 'reverseChoices' || mode === 'reverseTyped';
  const word = renderText(item.text, script);
  const translation = translationFor(
    item,
    lang,
    instance.fallbackTranslationLang,
  );
  const prompt = reverse ? translation : word;
  const correct = reverse ? item.text : translation;
  // The card remounts per item (keyed by the parent), so choices are
  // computed once per exercise and stay stable while it is answered.
  const choices = useMemo(
    () =>
      reverse
        ? buildReverseChoices(item, pool, 4)
        : buildChoices(item, pool, 4, lang, instance.fallbackTranslationLang),
    [item, pool, reverse, lang],
  );

  // Contrastive hint (flagship): shown after answering when the item
  // carries a note written for the learner's language.
  const note = (item.notes ?? []).find((entry) => entry.sourceLang === lang);

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
    setOutcome(
      checkTyped(pack.normalize, item.text, typed) ? 'correct' : 'incorrect',
    );
  };

  const finish = () => {
    onGrade(outcome === 'correct' ? 'good' : 'again');
  };

  return (
    <section className="card" data-outcome={outcome ?? 'open'}>
      <p className="card-kind">
        {t(
          item.kind === 'word'
            ? 'kindWord'
            : item.kind === 'phrase'
              ? 'kindPhrase'
              : 'kindSentence',
        )}
      </p>
      <h2 className="card-prompt" lang={reverse ? undefined : pack.bcp47}>
        {prompt}
      </h2>

      {audio !== undefined && (audio.canListen || audio.canRecord) && (
        <AudioTools
          itemId={item.id}
          canListen={audio.canListen}
          canRecord={audio.canRecord}
        />
      )}

      {mode === 'choices' || mode === 'reverseChoices' ? (
        <div
          className="card-choices"
          role="group"
          aria-label={reverse ? t('interslavicAria') : t('translationsAria')}
        >
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className="choice"
              lang={reverse ? pack.bcp47 : undefined}
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
              {reverse ? renderText(choice, script) : choice}
            </button>
          ))}
        </div>
      ) : (
        <form className="card-typed" onSubmit={answerTyped}>
          <label className="typed-label" htmlFor="typed-answer">
            {t('typedLabel')}
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
            {t('check')}
          </button>
        </form>
      )}

      {outcome !== null && (
        <div className="card-feedback">
          <p className="feedback-text">
            {outcome === 'correct' ? t('correct') : t('incorrect')}{' '}
            <span lang={pack.bcp47} className="feedback-answer">
              {word}
            </span>{' '}
            = {translation}
          </p>
          {note !== undefined && <p className="feedback-note">{note.text}</p>}
          <button type="button" className="continue" onClick={finish} autoFocus>
            {t('continueButton')}
          </button>
        </div>
      )}
    </section>
  );
}
