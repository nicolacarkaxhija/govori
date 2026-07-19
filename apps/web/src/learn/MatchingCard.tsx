import { useMemo, useState } from 'react';
import type { Grade } from '@glotty/srs';
import type { LearnItem } from '../api/client';
import { buildMatching } from './exercises';
import type { Script } from './useScript';
import { useT } from '../i18n';
import { fallbackLang, pack, renderText } from '../instance';

export interface MatchingCardProps {
  pool: readonly LearnItem[];
  script: Script;
  /** Learner language (L1); the instance's fallback by default. */
  lang?: string;
  onComplete: (results: { itemId: string; grade: Grade }[]) => void;
}

interface Side {
  itemId: string;
  label: string;
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  return values
    .map((value) => ({ value, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.value);
}

/** Match target-language words to translations; a miss marks both for relearning. */
export function MatchingCard({
  pool,
  script,
  lang = fallbackLang,
  onComplete,
}: MatchingCardProps) {
  const t = useT();
  const pairs = useMemo(
    () => buildMatching(pool, 4, lang, fallbackLang),
    [pool, lang],
  );
  const [left, right] = useMemo(
    () => [
      shuffled(
        pairs.map((pair) => ({ itemId: pair.itemId, label: pair.target })),
        Math.random,
      ),
      shuffled(
        pairs.map((pair) => ({
          itemId: pair.itemId,
          label: pair.translation,
        })),
        Math.random,
      ),
    ],
    [pairs],
  );
  const [pickedLeft, setPickedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Set<string>>(new Set());
  const [shake, setShake] = useState<string | null>(null);

  const pickRight = (side: Side) => {
    if (pickedLeft === null || matched.has(side.itemId)) {
      return;
    }
    if (side.itemId === pickedLeft) {
      const nextMatched = new Set(matched).add(side.itemId);
      setMatched(nextMatched);
      setPickedLeft(null);
      if (nextMatched.size === pairs.length) {
        onComplete(
          pairs.map((pair) => ({
            itemId: pair.itemId,
            grade: missed.has(pair.itemId) ? 'again' : 'good',
          })),
        );
      }
    } else {
      setMissed(new Set(missed).add(pickedLeft).add(side.itemId));
      setShake(side.itemId);
      setPickedLeft(null);
      setTimeout(() => {
        setShake(null);
      }, 300);
    }
  };

  return (
    <section className="card">
      <p className="card-kind">{t('matchPairs')}</p>
      <div className="matching">
        <div
          className="matching-column"
          role="group"
          aria-label={t('targetLanguageAria')}
        >
          {left.map((side) => (
            <button
              key={side.itemId}
              type="button"
              className="choice"
              lang={pack.bcp47}
              data-state={
                matched.has(side.itemId)
                  ? 'correct'
                  : pickedLeft === side.itemId
                    ? 'incorrect'
                    : 'open'
              }
              disabled={matched.has(side.itemId)}
              onClick={() => {
                setPickedLeft(side.itemId);
              }}
            >
              {renderText(side.label, script)}
            </button>
          ))}
        </div>
        <div
          className="matching-column"
          role="group"
          aria-label={t('translationsAria')}
        >
          {right.map((side) => (
            <button
              key={side.itemId}
              type="button"
              className="choice"
              data-state={
                matched.has(side.itemId)
                  ? 'correct'
                  : shake === side.itemId
                    ? 'incorrect'
                    : 'open'
              }
              disabled={matched.has(side.itemId)}
              onClick={() => {
                pickRight(side);
              }}
            >
              {side.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
