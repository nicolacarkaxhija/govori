import { useEffect, useState } from 'react';
import { fetchItems, type LearnItem } from '../api/client';
import { useT } from '../i18n';
import { Session } from '../learn/Session';
import { weakestItemIds } from '../learn/progress';
import type { Script } from '../learn/useScript';

export interface PracticeViewProps {
  /** Weak items from the local lapse log, or the frequency top list. */
  source: 'weak' | 'common';
  script: Script;
  learnLang: string;
  onExit: () => void;
}

type State =
  | { name: 'loading' }
  | { name: 'unreachable' }
  | { name: 'empty' }
  | { name: 'ready'; pool: LearnItem[] };

const WEAK_COUNT = 10;
const COMMON_COUNT = 20;
/** Weak ids live locally; fish for their items in a wide frequency net. */
const WEAK_FETCH_LIMIT = 500;

/**
 * Practice outside the course: a plain session over a pool picked by
 * lapse count or community frequency (ADR 0005 rotation reused as-is).
 */
export function PracticeView({
  source,
  script,
  learnLang,
  onExit,
}: PracticeViewProps) {
  const t = useT();
  const [state, setState] = useState<State>({ name: 'loading' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (source === 'weak') {
        const ids = weakestItemIds(WEAK_COUNT);
        if (ids.length === 0) {
          setState({ name: 'empty' });
          return;
        }
        const found = await fetchItems(WEAK_FETCH_LIMIT);
        if (!active) {
          return;
        }
        if (found === null) {
          setState({ name: 'unreachable' });
          return;
        }
        const byId = new Map(found.map((item) => [item.id, item]));
        const pool = ids.flatMap((id) => {
          const item = byId.get(id);
          return item === undefined ? [] : [item];
        });
        setState(
          pool.length === 0 ? { name: 'empty' } : { name: 'ready', pool },
        );
      } else {
        const found = await fetchItems(COMMON_COUNT);
        if (!active) {
          return;
        }
        setState(
          found === null
            ? { name: 'unreachable' }
            : { name: 'ready', pool: found },
        );
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [source]);

  if (state.name === 'ready') {
    return (
      <Session
        pool={state.pool}
        sentences={[]}
        audioOn={false}
        script={script}
        learnLang={learnLang}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          {t('back')}
        </button>
      </header>

      {state.name === 'loading' && (
        <p className="lesson-note">{t('loading')}</p>
      )}
      {state.name === 'unreachable' && (
        <p className="lesson-note">{t('unreachable')}</p>
      )}
      {state.name === 'empty' && (
        <p className="lesson-note">{t('nothingWeak')}</p>
      )}
    </div>
  );
}
