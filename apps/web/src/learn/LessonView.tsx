import { useEffect, useState } from 'react';
import type { Grade } from '@govori/srs';
import { fetchLesson, type LearnItem } from '../api/client';
import { ExerciseCard } from './ExerciseCard';
import { MatchingCard } from './MatchingCard';
import { nextItemId, recordReview } from './progress';
import type { Script } from './useScript';

export interface LessonViewProps {
  lessonId: string;
  script: Script;
  onExit: () => void;
}

type Phase =
  | { name: 'loading' }
  | { name: 'unreachable' }
  | { name: 'done' }
  | { name: 'exercise'; item: LearnItem };

export function LessonView({ lessonId, script, onExit }: LessonViewProps) {
  const [pool, setPool] = useState<LearnItem[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [mode, setMode] = useState<'choices' | 'typed' | 'matching'>('choices');
  const [answered, setAnswered] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const lesson = await fetchLesson(lessonId);
      if (!active) {
        return;
      }
      if (lesson === null) {
        setPhase({ name: 'unreachable' });
      } else {
        setPool(lesson.items);
        advance(lesson.items);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [lessonId]);

  function advance(items: readonly LearnItem[]) {
    const id = nextItemId(items.map((item) => item.id));
    const item = items.find((candidate) => candidate.id === id);
    setPhase(
      item === undefined ? { name: 'done' } : { name: 'exercise', item },
    );
  }

  const nextMode = (current: 'choices' | 'typed' | 'matching') =>
    current === 'choices'
      ? 'typed'
      : current === 'typed' && pool.length >= 4
        ? 'matching'
        : 'choices';

  const grade = (item: LearnItem) => (value: Grade) => {
    recordReview(item.id, value);
    setAnswered((count) => count + 1);
    // Rotate recognition, production, and matching, friction-free.
    setMode(nextMode);
    advance(pool);
  };

  const gradeMany = (results: { itemId: string; grade: Grade }[]) => {
    for (const result of results) {
      recordReview(result.itemId, result.grade);
    }
    setAnswered((count) => count + results.length);
    setMode('choices');
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
      {phase.name === 'done' && (
        <div className="lesson-done">
          <div className="stitch" aria-hidden="true" />
          <h2>Vse gotovo.</h2>
          <p>Nothing is due right now. Come back later.</p>
        </div>
      )}
      {phase.name === 'exercise' && mode === 'matching' && (
        <MatchingCard
          key={'matching' + String(answered)}
          pool={pool}
          script={script}
          onComplete={gradeMany}
        />
      )}
      {phase.name === 'exercise' && mode !== 'matching' && (
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
