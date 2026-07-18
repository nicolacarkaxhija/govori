import { useState } from 'react';
import type { Grade } from '@govori/srs';
import type { LearnItem } from '../api/client';
import { useT } from '../i18n';
import { AssemblyCard } from './AssemblyCard';
import { ClozeCard } from './ClozeCard';
import { ExerciseCard } from './ExerciseCard';
import { ListeningCard } from './ListeningCard';
import { MatchingCard } from './MatchingCard';
import { MorphologyCard } from './MorphologyCard';
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

export interface SessionProps {
  /** The items this session exercises; due first, then unseen. */
  pool: readonly LearnItem[];
  /** Sentences for cloze and assembly rounds; empty disables them. */
  sentences: readonly LearnItem[];
  audioOn: boolean;
  script: Script;
  learnLang: string;
  onExit: () => void;
}

type Phase = { name: 'done' } | { name: 'exercise'; item: LearnItem };

function phaseFor(pool: readonly LearnItem[]): Phase {
  const id = nextItemId(pool.map((item) => item.id));
  const item = pool.find((candidate) => candidate.id === id);
  return item === undefined ? { name: 'done' } : { name: 'exercise', item };
}

/**
 * One exercise session over a ready pool: the rotation, grading, and
 * cards — shared by lessons and the practice hub (ADR 0005).
 */
export function Session({
  pool,
  sentences,
  audioOn,
  script,
  learnLang,
  onExit,
}: SessionProps) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>(() => phaseFor(pool));
  const [mode, setMode] = useState<ExerciseMode>('choices');
  const [answered, setAnswered] = useState(0);
  const [cloze, setCloze] = useState<Cloze | null>(null);
  const [assembly, setAssembly] = useState<Assembly | null>(null);
  const [sentenceRounds, setSentenceRounds] = useState(0);
  const [scriptRounds, setScriptRounds] = useState(0);
  const [morphologyRounds, setMorphologyRounds] = useState(0);

  const advance = () => {
    setPhase(phaseFor(pool));
  };

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
      morphologyRounds,
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
      advance();
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

  const gradeMorphology = (item: LearnItem) => (value: Grade) => {
    recordReview(item.id, value);
    setAnswered((count) => count + 1);
    setMorphologyRounds((count) => count + 1);
    proceed(nextMode('morphology'));
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
      {phase.name === 'exercise' && mode === 'matching' && (
        <MatchingCard
          key={'matching' + String(answered)}
          pool={pool}
          script={script}
          lang={learnLang}
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
        mode === 'assembly' &&
        assembly !== null && (
          <AssemblyCard
            key={'assembly' + String(answered)}
            assembly={assembly}
            script={script}
            onGrade={gradeAssembly(assembly)}
          />
        )}
      {phase.name === 'exercise' && mode === 'script' && (
        <ScriptCard
          key={'script' + phase.item.id + String(answered)}
          item={phase.item}
          script={script}
          onGrade={gradeScript(phase.item)}
        />
      )}
      {phase.name === 'exercise' && mode === 'morphology' && (
        <MorphologyCard
          key={'morphology' + phase.item.id + String(answered)}
          item={phase.item}
          script={script}
          lang={learnLang}
          onGrade={gradeMorphology(phase.item)}
          onUnavailable={() => {
            setMorphologyRounds((count) => count + 1);
            setMode('choices');
          }}
        />
      )}
      {phase.name === 'exercise' && mode === 'listening' && (
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
