import type { LessonDialogue } from '../api/client';
import { useT } from '../i18n';
import type { Script } from './useScript';
import { pack, renderText } from '../instance';

export interface DialogueCardProps {
  dialogue: LessonDialogue;
  script: Script;
  onContinue: () => void;
}

/** Lesson intro scene (ADR 0039); provenance disclosed (ADR 0012). */
export function DialogueCard({
  dialogue,
  script,
  onContinue,
}: DialogueCardProps) {
  const t = useT();
  return (
    <section className="card">
      <p className="card-kind">dialog</p>
      <ul className="dialogue">
        {dialogue.turns.map((turn, index) => (
          <li key={index} className="dialogue-turn">
            <p className="dialogue-speaker">{turn.speaker}</p>
            <p className="dialogue-text" lang={pack.bcp47}>
              {renderText(turn.text, script)}
            </p>
            <p className="dialogue-translation">{turn.translation}</p>
          </li>
        ))}
      </ul>
      {dialogue.provenance.origin === 'ai-draft' && (
        <p className="dialogue-provenance">{t('aiDisclosure')}</p>
      )}
      <button type="button" className="continue" onClick={onContinue} autoFocus>
        {t('startExercises')}
      </button>
    </section>
  );
}
