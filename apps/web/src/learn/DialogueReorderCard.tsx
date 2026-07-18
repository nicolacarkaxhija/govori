import { useMemo, useState } from 'react';
import { transliterate } from '@glotty/transliteration-isv';
import type { LessonDialogue } from '../api/client';
import { scrambleOrder } from './exercises';
import type { Script } from './useScript';
import { useT } from '../i18n';

export interface DialogueReorderCardProps {
  dialogue: LessonDialogue;
  script: Script;
  /** Fires after the learner continues; true when the order was right. */
  onDone: (correct: boolean) => void;
}

type Outcome = 'correct' | 'incorrect';

/**
 * A seen dialogue returns as an exercise: its turns arrive shuffled and
 * the learner taps them back into order (assembly interaction reused).
 */
export function DialogueReorderCard({
  dialogue,
  script,
  onDone,
}: DialogueReorderCardProps) {
  const t = useT();
  // Indexes into dialogue.turns, scrambled once per mount.
  const order = useMemo(
    () => scrambleOrder(dialogue.turns.length, Math.random),
    [dialogue],
  );
  const [placed, setPlaced] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const bank = order.filter((index) => !placed.includes(index));

  const labelOf = (index: number): string => {
    const turn = dialogue.turns[index];
    return turn === undefined
      ? ''
      : `${turn.speaker}: ${transliterate(turn.text, { script })}`;
  };

  const place = (index: number) => {
    if (outcome === null) {
      setPlaced((current) => [...current, index]);
    }
  };

  const takeBack = (index: number) => {
    if (outcome === null) {
      setPlaced((current) => current.filter((entry) => entry !== index));
    }
  };

  const check = () => {
    const right =
      placed.length === dialogue.turns.length &&
      placed.every((index, position) => index === position);
    setOutcome(right ? 'correct' : 'incorrect');
  };

  return (
    <section className="card" data-outcome={outcome ?? 'open'}>
      <p className="card-kind">{t('dialogueReorderKind')}</p>

      <div
        className="assembly-built"
        role="group"
        aria-label={t('dialogueBuiltAria')}
      >
        {placed.map((index) => (
          <button
            key={index}
            type="button"
            className="choice"
            lang="isv"
            onClick={() => {
              takeBack(index);
            }}
          >
            {labelOf(index)}
          </button>
        ))}
      </div>

      <div
        className="assembly-bank"
        role="group"
        aria-label={t('dialogueBankAria')}
      >
        {bank.map((index) => (
          <button
            key={index}
            type="button"
            className="choice"
            lang="isv"
            onClick={() => {
              place(index);
            }}
          >
            {labelOf(index)}
          </button>
        ))}
      </div>

      {outcome === null && (
        <button
          type="button"
          className="typed-submit"
          disabled={placed.length !== dialogue.turns.length}
          onClick={check}
        >
          {t('check')}
        </button>
      )}

      {outcome !== null && (
        <div className="card-feedback">
          <p className="feedback-text">
            {outcome === 'correct' ? t('correct') : t('incorrect')}
          </p>
          <button
            type="button"
            className="continue"
            onClick={() => {
              onDone(outcome === 'correct');
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
