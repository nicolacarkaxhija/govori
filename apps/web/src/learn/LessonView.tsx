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
import { AssemblyCard } from './AssemblyCard';
import { ClozeCard } from './ClozeCard';
import { DialogueCard } from './DialogueCard';
import { ExerciseCard } from './ExerciseCard';
import { ListeningCard } from './ListeningCard';
import { MatchingCard } from './MatchingCard';
import { ScriptCard } from './ScriptCard';
import {
  buildAssembly,
  buildCloze,
  planNextMode,
  type Assembly,
  type Cloze,
  type ExerciseMode,
} from './exercises';
import { nextItemId, recordReview, streakDays } from './progress';
import type { Script } from './useScript';

export interface LessonViewProps {
  lessonId: string;
  script: Script;
  /** Learner language (L1) for translations; English by default. */
  learnLang?: string;
  onExit: () => void;
}

type Phase =
  | { name: 'loading' }
  | { name: 'unreachable' }
  | { name: 'done' }
  | { name: 'exercise'; item: LearnItem };

export function LessonView({
  lessonId,
  script,
  learnLang = 'en',
  onExit,
}: LessonViewProps) {
  const t = useT();
  const [pool, setPool] = useState<LearnItem[]>([]);
  const [sentences, setSentences] = useState<LearnItem[]>([]);
  const [intro, setIntro] = useState<LessonDialogue | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [mode, setMode] = useState<ExerciseMode>('choices');
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
  const [assembly, setAssembly] = useState<Assembly | null>(null);
  const [sentenceRounds, setSentenceRounds] = useState(0);
  const [scriptRounds, setScriptRounds] = useState(0);

  // A cloze needs a sentence sharing a word with this pool; try a few.
  const makeCloze = (): Cloze | null => {
    for (const sentence of sentences) {
      const built = buildCloze(sentence, pool, learnLang);
      if (built !== null) {
        return built;
      }
    }
    return null;
  };

  // Assembly needs a sentence long enough to reorder (ADR 0005).
  const makeAssembly = (): Assembly | null => {
    for (const sentence of sentences) {
      const built = buildAssembly(sentence, learnLang);
      if (built !== null) {
        return built;
      }
    }
    return null;
  };

  const nextMode = (current: ExerciseMode): ExerciseMode => {
    const builtCloze = makeCloze();
    const builtAssembly = makeAssembly();
    const next = planNextMode(current, {
      poolSize: pool.length,
      hasCloze: builtCloze !== null,
      hasAssembly: builtAssembly !== null,
      audioOn,
      sentenceRounds,
      scriptRounds,
    });
    setCloze(next === 'cloze' ? builtCloze : null);
    setAssembly(next === 'assembly' ? builtAssembly : null);
    return next;
  };

  // Sentence rounds (cloze, assembly) are not tied to a due item —
  // entering one defers the due-item advance until it is answered.
  const proceed = (next: ExerciseMode) => {
    setMode(next);
    if (next !== 'cloze' && next !== 'assembly') {
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
    setSentenceRounds((count) => count + 1);
    proceed(nextMode('cloze'));
  };

  const gradeAssembly = (built: Assembly) => (value: Grade) => {
    recordReview(built.itemId, value);
    setAnswered((count) => count + 1);
    setSentenceRounds((count) => count + 1);
    proceed(nextMode('assembly'));
  };

  const gradeScript = (item: LearnItem) => (value: Grade) => {
    recordReview(item.id, value);
    setAnswered((count) => count + 1);
    setScriptRounds((count) => count + 1);
    proceed(nextMode('script'));
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
          lang={learnLang}
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
        mode === 'assembly' &&
        assembly !== null && (
          <AssemblyCard
            key={'assembly' + String(answered)}
            assembly={assembly}
            script={script}
            onGrade={gradeAssembly(assembly)}
          />
        )}
      {phase.name === 'exercise' && intro === null && mode === 'script' && (
        <ScriptCard
          key={'script' + phase.item.id + String(answered)}
          item={phase.item}
          script={script}
          onGrade={gradeScript(phase.item)}
        />
      )}
      {phase.name === 'exercise' && intro === null && mode === 'listening' && (
        <ListeningCard
          key={'listening' + phase.item.id + String(answered)}
          item={phase.item}
          lang={learnLang}
          onGrade={grade(phase.item)}
          onUnavailable={() => {
            setMode('choices');
          }}
        />
      )}
      {phase.name === 'exercise' &&
        intro === null &&
        (mode === 'choices' ||
          mode === 'typed' ||
          mode === 'reverseChoices' ||
          mode === 'reverseTyped') && (
          <ExerciseCard
            key={phase.item.id + String(answered)}
            item={phase.item}
            pool={pool}
            script={script}
            mode={mode}
            lang={learnLang}
            onGrade={grade(phase.item)}
            audio={
              audioOn && (mode === 'choices' || mode === 'typed')
                ? { canListen: true, canRecord: true }
                : undefined
            }
          />
        )}
    </div>
  );
}
