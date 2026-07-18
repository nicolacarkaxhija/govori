import { useEffect, useState } from 'react';
import {
  fetchFlags,
  fetchLesson,
  fetchLessonSentences,
  type LearnItem,
  type LessonDialogue,
} from '../api/client';
import { useT } from '../i18n';
import { DialogueCard } from './DialogueCard';
import { DialogueReorderCard } from './DialogueReorderCard';
import { Session } from './Session';
import { hasSeenDialogue, markDialogueSeen } from './dialogueSeen';
import { recordReview } from './progress';
import type { Script } from './useScript';

export interface LessonViewProps {
  lessonId: string;
  script: Script;
  /** Learner language (L1) for translations; English by default. */
  learnLang?: string;
  onExit: () => void;
}

type State =
  | { name: 'loading' }
  | { name: 'unreachable' }
  | {
      name: 'ready';
      pool: LearnItem[];
      sentences: LearnItem[];
      audioOn: boolean;
    };

export function LessonView({
  lessonId,
  script,
  learnLang = 'en',
  onExit,
}: LessonViewProps) {
  const t = useT();
  const [state, setState] = useState<State>({ name: 'loading' });
  const [intro, setIntro] = useState<LessonDialogue | null>(null);

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
        setState({ name: 'unreachable' });
      } else {
        setState({
          name: 'ready',
          pool: lesson.items,
          sentences: lessonSentences,
          audioOn: flags.audio === true,
        });
        setIntro(lesson.dialogue ?? null);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [lessonId]);

  if (state.name === 'ready' && intro === null) {
    return (
      <Session
        pool={state.pool}
        sentences={state.sentences}
        audioOn={state.audioOn}
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
      {state.name === 'ready' &&
        intro !== null &&
        (hasSeenDialogue(lessonId) && intro.turns.length >= 2 ? (
          <DialogueReorderCard
            dialogue={intro}
            script={script}
            onDone={(correct) => {
              // Pragmatic credit (ADR 0005): a rebuilt scene reviews the
              // lesson's opening item.
              const first = state.pool[0];
              if (correct && first !== undefined) {
                recordReview(first.id, 'good');
              }
              setIntro(null);
            }}
          />
        ) : (
          <DialogueCard
            dialogue={intro}
            script={script}
            onContinue={() => {
              markDialogueSeen(lessonId);
              setIntro(null);
            }}
          />
        ))}
    </div>
  );
}
