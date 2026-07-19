import { useEffect, useState } from 'react';
import { fetchItems } from '../api/client';
import { fallbackLang, pack, renderText } from '../instance';
import { useT } from '../i18n';
import {
  matchedWordIds,
  translationFor,
  type ProductionWord,
} from '../learn/exercises';
import { dueItemIds, recordReview } from '../learn/progress';
import type { Script } from '../learn/useScript';
import { entryFor, promptForDay, saveEntry } from './journal';

export interface JournalViewProps {
  script: Script;
  learnLang: string;
  onExit: () => void;
}

const SUGGESTION_COUNT = 3;
const POOL_LIMIT = 50;

/**
 * The micro-journal (ADR 0045): a daily prompt and a few lines in the
 * target language. Suggested due words that the learner actually uses
 * are credited a 'good' review — writing feeds the same SRS log.
 */
export function JournalView({ script, learnLang, onExit }: JournalViewProps) {
  const t = useT();
  const today = new Date().toISOString().slice(0, 10);
  const prompt = promptForDay();
  const [text, setText] = useState(() => entryFor(today)?.text ?? '');
  const [suggested, setSuggested] = useState<ProductionWord[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchItems(POOL_LIMIT).then((items) => {
      if (!active || items === null) {
        return;
      }
      const ids = dueItemIds(
        items.map((item) => item.id),
        SUGGESTION_COUNT,
      );
      const byId = new Map(items.map((item) => [item.id, item]));
      setSuggested(
        ids.flatMap((id) => {
          const item = byId.get(id);
          return item === undefined
            ? []
            : [
                {
                  itemId: item.id,
                  text: item.text,
                  translation: translationFor(item, learnLang, fallbackLang),
                },
              ];
        }),
      );
    });
    return () => {
      active = false;
    };
  }, [learnLang]);

  const save = () => {
    saveEntry({ date: today, text, prompt });
    for (const itemId of matchedWordIds(pack, text, suggested)) {
      recordReview(itemId, 'good');
    }
    setSaved(true);
  };

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          {t('back')}
        </button>
      </header>

      <section className="journal">
        <div className="stitch" aria-hidden="true" />
        <h2 className="journal-title">{t('journalTitle')}</h2>
        <p className="journal-prompt">{t(prompt)}</p>

        {suggested.length > 0 && (
          <div className="journal-suggested">
            <p className="journal-suggested-note">{t('journalSuggested')}</p>
            <ul className="production-words">
              {suggested.map((word) => (
                <li key={word.itemId} className="production-word">
                  <span lang={pack.bcp47} className="production-target">
                    {renderText(word.text, script)}
                  </span>{' '}
                  <span className="production-gloss">{word.translation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="typed-label" htmlFor="journal-text">
          {t('journalLabel')}
        </label>
        <textarea
          id="journal-text"
          className="typed-input journal-input"
          lang={pack.bcp47}
          spellCheck={false}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setSaved(false);
          }}
        />
        <button
          type="button"
          className="primary"
          disabled={text.trim() === ''}
          onClick={save}
        >
          {t('journalSave')}
        </button>
        {saved && <p className="journal-saved">{t('journalSaved')}</p>}
      </section>
    </div>
  );
}
