import { useEffect, useState } from 'react';
import type { Grade } from '@govori/srs';
import {
  fetchFlags,
  fetchLesson,
  fetchLessonSentences,
  type LearnItem,
  type LessonDialogue,
} from '../api/client';
import { useT } from '../i18n';
import { ClozeCard } from './ClozeCard';
import { DialogueCard } from './DialogueCard';
import { ExerciseCard } from './ExerciseCard';
import { MatchingCard } from './MatchingCard';
import { buildCloze, type Cloze } from './exercises';
import { nextItemId, recordReview, streakDays } from './progress';
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
  const t = useT();
  const [pool, setPool] = useState<LearnItem[]>([]);
  const [sentences, setSentences] = useState<LearnItem[]>([]);
  const [intro, setIntro] = useState<LessonDialogue | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [mode, setMode] = useState<Mode>('choices');
  const [answered, setAnswered] = useState(0);
  const [audioOn, setAudioOn] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [lesson, lessonSentences, flags] = await Promise.all([
        fetchLesson(lessonId),
        fetchLessonSentences(lessonId),
        fetchFlags(),
      ]);
      if (!active) {
        return;
      }
      if (lesson === null) {
        setPhase({ name: 'unreachable' });
      } else {
        setPool(lesson.items);
        setSentences(lessonSentences);
        setIntro(lesson.dialogue ?? null);
        setAudioOn(flags.audio === true);
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
          {t('back')}
        </button>
        <p className="lesson-count" aria-live="polite">
          {t('answered', { count: answered })}
        </p>
      </header>

      {phase.name === 'loading' && (
        <p className="lesson-note">{t('loading')}</p>
      )}
      {phase.name === 'unreachable' && (
        <p className="lesson-note">{t('unreachable')}</p>
      )}
      {phase.name === 'done' && (
        <div className="lesson-done">
          <div className="stitch" aria-hidden="true" />
          <h2>{t('allDone')}</h2>
          <p>{t('nothingDue')}</p>
          {streakDays() > 0 && (
            <p className="hero-streak">
              {t('streak', { count: streakDays() })}
            </p>
          )}
        </div>
      )}
      {phase.name === 'exercise' && intro !== null && (
        <DialogueCard
          dialogue={intro}
          script={script}
          onContinue={() => {
            setIntro(null);
          }}
        />
      )}
      {phase.name === 'exercise' && intro === null && mode === 'matching' && (
        <MatchingCard
          key={'matching' + String(answered)}
          pool={pool}
          script={script}
          onComplete={gradeMany}
        />
      )}
      {phase.name === 'exercise' &&
        intro === null &&
        mode === 'cloze' &&
        cloze !== null && (
          <ClozeCard
            key={'cloze' + String(answered)}
            cloze={cloze}
            script={script}
            onGrade={gradeCloze(cloze)}
          />
        )}
      {phase.name === 'exercise' &&
        intro === null &&
        (mode === 'choices' || mode === 'typed') && (
          <ExerciseCard
            key={phase.item.id + String(answered)}
            item={phase.item}
            pool={pool}
            script={script}
            mode={mode}
            onGrade={grade(phase.item)}
            audio={audioOn ? { canListen: true, canRecord: true } : undefined}
          />
        )}
    </div>
  );
}
