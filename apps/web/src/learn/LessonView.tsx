import { useEffect, useState } from 'react';
import type { Grade } from '@govori/srs';
import { fetchItems, type LearnItem } from '../api/client';
import { ExerciseCard } from './ExerciseCard';
import { nextItemId, recordReview } from './progress';
import type { Script } from './useScript';

export interface LessonViewProps {
  script: Script;
  onExit: () => void;
}

type Phase =
  | { name: 'loading' }
  | { name: 'unreachable' }
  | { name: 'empty' }
  | { name: 'done' }
  | { name: 'exercise'; item: LearnItem };

export function LessonView({ script, onExit }: LessonViewProps) {
  const [pool, setPool] = useState<LearnItem[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [mode, setMode] = useState<'choices' | 'typed'>('choices');
  const [answered, setAnswered] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const items = await fetchItems();
      if (!active) {
        return;
      }
      if (items === null) {
        setPhase({ name: 'unreachable' });
      } else if (items.length === 0) {
        setPhase({ name: 'empty' });
      } else {
        setPool(items);
        advance(items);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  function advance(items: readonly LearnItem[]) {
    const id = nextItemId(items.map((item) => item.id));
    const item = items.find((candidate) => candidate.id === id);
    setPhase(
      item === undefined ? { name: 'done' } : { name: 'exercise', item },
    );
  }

  const grade = (item: LearnItem) => (value: Grade) => {
    recordReview(item.id, value);
    setAnswered((count) => count + 1);
    // Alternate recognition and production, friction-free.
    setMode((current) => (current === 'choices' ? 'typed' : 'choices'));
    advance(pool);
  };

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          ← Back
        </button>
        <p className="lesson-count" aria-live="polite">
          {answered} answered
        </p>
      </header>

      {phase.name === 'loading' && <p className="lesson-note">Loading…</p>}
      {phase.name === 'unreachable' && (
        <p className="lesson-note">
          The server is unreachable — try again in a moment.
        </p>
      )}
      {phase.name === 'empty' && (
        <p className="lesson-note">No content yet — the seed is on its way.</p>
      )}
      {phase.name === 'done' && (
        <div className="lesson-done">
          <div className="stitch" aria-hidden="true" />
          <h2>Vse gotovo.</h2>
          <p>Nothing is due right now. Come back later.</p>
        </div>
      )}
      {phase.name === 'exercise' && (
        <ExerciseCard
          key={phase.item.id + String(answered)}
          item={phase.item}
          pool={pool}
          script={script}
          mode={mode}
          onGrade={grade(phase.item)}
        />
      )}
    </div>
  );
}
