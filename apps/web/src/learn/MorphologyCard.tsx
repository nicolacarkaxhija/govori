import { useEffect, useState, type SubmitEvent } from 'react';
import type { Grade } from '@glotty/srs';
import { fetchForms, type ItemForm, type LearnItem } from '../api/client';
import { checkTyped, translationFor } from './exercises';
import type { Script } from './useScript';
import { useT, type MessageKey } from '../i18n';
import { instance, pack, renderText } from '../instance';

export interface MorphologyCardProps {
  item: LearnItem;
  script: Script;
  lang: string;
  onGrade: (grade: Grade) => void;
  /** No drillable forms for this item — the lesson falls back. */
  onUnavailable: () => void;
}

/** The paradigm slots worth drilling, with their catalog labels. */
const DRILLABLE: Record<string, MessageKey> = {
  pl: 'formPlural',
  'pres.1sg': 'formPresent1sg',
  'pres.3pl': 'formPresent3pl',
  cmp: 'formComparative',
  sup: 'formSuperlative',
};

type Outcome = 'correct' | 'incorrect';

/** Morphology drill: type an inflected form of a known headword. */
export function MorphologyCard({
  item,
  script,
  lang,
  onGrade,
  onUnavailable,
}: MorphologyCardProps) {
  const t = useT();
  const [form, setForm] = useState<ItemForm | null>(null);
  const [typed, setTyped] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    let active = true;
    void fetchForms(item.id).then((forms) => {
      if (!active) {
        return;
      }
      const drillable = forms.filter((entry) => entry.tag in DRILLABLE);
      const picked = drillable[Math.floor(Math.random() * drillable.length)];
      if (picked === undefined) {
        onUnavailable();
      } else {
        setForm(picked);
      }
    });
    return () => {
      active = false;
    };
    // onUnavailable is a stable parent callback; item identity drives this.
  }, [item.id]);

  if (form === null) {
    return null;
  }
  const label = DRILLABLE[form.tag];
  if (label === undefined) {
    return null;
  }

  const answer = (event: SubmitEvent) => {
    event.preventDefault();
    if (outcome !== null) {
      return;
    }
    setOutcome(
      checkTyped(pack.normalize, form.text, typed) ? 'correct' : 'incorrect',
    );
  };

  return (
    <section className="card" data-outcome={outcome ?? 'open'}>
      <p className="card-kind">{t('morphologyKind')}</p>
      <h2 className="card-prompt" lang={pack.bcp47}>
        {renderText(item.text, script)}
      </h2>

      <form className="card-typed" onSubmit={answer}>
        <label className="typed-label" htmlFor="morphology-answer">
          {t('formPrompt', { form: t(label) })}
        </label>
        <input
          id="morphology-answer"
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
              {renderText(form.text, script)}
            </span>{' '}
            = {t(label)} ·{' '}
            {translationFor(item, lang, instance.fallbackTranslationLang)}
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
