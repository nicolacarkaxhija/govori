import { useEffect, useState } from 'react';
import type { Grade } from '@govori/srs';
import {
  fetchLesson,
  fetchLessonSentences,
  type LearnItem,
} from '../api/client';
import { ClozeCard } from './ClozeCard';
import { ExerciseCard } from './ExerciseCard';
import { MatchingCard } from './MatchingCard';
import { buildCloze, type Cloze } from './exercises';
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

type Mode = 'choices' | 'typed' | 'matching' | 'cloze';

export function LessonView({ lessonId, script, onExit }: LessonViewProps) {
  const [pool, setPool] = useState<LearnItem[]>([]);
  const [sentences, setSentences] = useState<LearnItem[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [mode, setMode] = useState<Mode>('choices');
  const [answered, setAnswered] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [lesson, lessonSentences] = await Promise.all([
        fetchLesson(lessonId),
        fetchLessonSentences(lessonId),
      ]);
      if (!active) {
        return;
      }
      if (lesson === null) {
        setPhase({ name: 'unreachable' });
      } else {
        setPool(lesson.items);
        setSentences(lessonSentences);
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

  const [cloze, setCloze] = useState<Cloze | null>(null);

  // A cloze needs a sentence sharing a word with this pool; try a few.
  const makeCloze = (): Cloze | null => {
    for (const sentence of sentences) {
      const built = buildCloze(sentence, pool);
      if (built !== null) {
        return built;
      }
    }
    return null;
  };

  const clozeOrChoices = (): Mode => {
    const built = makeCloze();
    setCloze(built);
    return built === null ? 'choices' : 'cloze';
  };

  const nextMode = (current: Mode): Mode => {
    if (current === 'choices') {
      return 'typed';
    }
    if (current === 'typed' && pool.length >= 4) {
      return 'matching';
    }
    if (current === 'typed' || current === 'matching') {
      return clozeOrChoices();
    }
    return 'choices';
  };

  // A cloze is sentence-based, not tied to a due item — entering it
  // defers the due-item advance until the blank has been answered.
  const proceed = (next: Mode) => {
    setMode(next);
    if (next !== 'cloze') {
      advance(pool);
    }
  };

  const grade = (item: LearnItem) => (value: Grade) => {
    recordReview(item.id, value);
    setAnswered((count) => count + 1);
    // Rotate recognition, production, matching, and cloze, friction-free.
    proceed(nextMode(mode));
  };

  const gradeCloze = (built: Cloze) => (value: Grade) => {
    recordReview(built.itemId, value);
    setAnswered((count) => count + 1);
    setMode('choices');
    advance(pool);
  };

  const gradeMany = (results: { itemId: string; grade: Grade }[]) => {
    for (const result of results) {
      recordReview(result.itemId, result.grade);
    }
    setAnswered((count) => count + results.length);
    proceed(nextMode('matching'));
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
      {phase.name === 'exercise' && mode === 'cloze' && cloze !== null && (
        <ClozeCard
          key={'cloze' + String(answered)}
          cloze={cloze}
          script={script}
          onGrade={gradeCloze(cloze)}
        />
      )}
      {phase.name === 'exercise' &&
        (mode === 'choices' || mode === 'typed') && (
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
