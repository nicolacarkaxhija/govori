import { useState } from 'react';
import { transliterate } from '@govori/transliteration';
import type { Grade } from '@govori/srs';
import type { Assembly } from './exercises';
import type { Script } from './useScript';
import { useT } from '../i18n';

export interface AssemblyCardProps {
  assembly: Assembly;
  script: Script;
  onGrade: (grade: Grade) => void;
}

type Outcome = 'correct' | 'incorrect';

/** Sentence assembly (ADR 0005): tap shuffled words back into order. */
export function AssemblyCard({ assembly, script, onGrade }: AssemblyCardProps) {
  const t = useT();
  // Indexes into assembly.tokens, so duplicate words stay distinct.
  const [placed, setPlaced] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const bank = assembly.tokens
    .map((token, index) => ({ token, index }))
    .filter(({ index }) => !placed.includes(index));

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
    const built = placed.map((index) => assembly.tokens[index]);
    const right =
      built.length === assembly.answer.length &&
      built.every((token, position) => token === assembly.answer[position]);
    setOutcome(right ? 'correct' : 'incorrect');
  };

  const show = (token: string) => transliterate(token, { script });

  return (
    <section className="card" data-outcome={outcome ?? 'open'}>
      <p className="card-kind">{t('assemblyKind')}</p>
      <h2 className="card-prompt">{assembly.translation}</h2>

      <div
        className="assembly-built"
        role="group"
        aria-label={t('assemblyBuiltAria')}
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
            {show(assembly.tokens[index] ?? '')}
          </button>
        ))}
      </div>

      <div
        className="assembly-bank"
        role="group"
        aria-label={t('assemblyBankAria')}
      >
        {bank.map(({ token, index }) => (
          <button
            key={index}
            type="button"
            className="choice"
            lang="isv"
            onClick={() => {
              place(index);
            }}
          >
            {show(token)}
          </button>
        ))}
      </div>

      {outcome === null && (
        <button
          type="button"
          className="typed-submit"
          disabled={placed.length !== assembly.tokens.length}
          onClick={check}
        >
          {t('check')}
        </button>
      )}

      {outcome !== null && (
        <div className="card-feedback">
          <p className="feedback-text">
            {outcome === 'correct' ? t('correct') : t('incorrect')}{' '}
            <span lang="isv" className="feedback-answer">
              {transliterate(assembly.answer.join(' '), { script })}
            </span>{' '}
            = {assembly.translation}
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
