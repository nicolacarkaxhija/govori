import { useState } from 'react';
import { REPORT_REASONS, reportItem, type ReportReason } from '../api/client';
import { useT, type MessageKey } from '../i18n';

export interface ReportControlProps {
  itemId: string;
}

const REASON_KEYS: Record<ReportReason, MessageKey> = {
  wrong_translation: 'reportReasonWrongTranslation',
  not_natural: 'reportReasonNotNatural',
  wrong_audio: 'reportReasonWrongAudio',
  other: 'reportReasonOther',
};

type Phase = 'idle' | 'open' | 'sent';

/**
 * The learner quality affordance (ADR 0051): a compact "Report this" control in
 * a card's feedback area. Picking a reason, optionally a note, then sending
 * files a report — anonymously or signed-in — and swaps to a brief thanks. It
 * never blocks the learner: the confirmation shows the moment the request
 * settles, however it settles, so a flaky network never traps them here.
 */
export function ReportControl({ itemId }: ReportControlProps) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>('idle');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');

  if (phase === 'sent') {
    return (
      <p className="report-thanks" role="status">
        {t('reportThanks')}
      </p>
    );
  }

  if (phase === 'idle') {
    return (
      <button
        type="button"
        className="report-open footer-link"
        onClick={() => {
          setPhase('open');
        }}
      >
        {t('reportThis')}
      </button>
    );
  }

  const send = async () => {
    if (reason === null) {
      return;
    }
    await reportItem(itemId, reason, comment);
    setPhase('sent');
  };

  const commentId = `report-comment-${itemId}`;

  return (
    <div className="report-menu">
      <p className="report-prompt">{t('reportPrompt')}</p>
      <div
        className="report-reasons"
        role="group"
        aria-label={t('reportPrompt')}
      >
        {REPORT_REASONS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className="choice"
            data-state={reason === candidate ? 'correct' : 'open'}
            onClick={() => {
              setReason(candidate);
            }}
          >
            {t(REASON_KEYS[candidate])}
          </button>
        ))}
      </div>
      <label className="report-comment-label" htmlFor={commentId}>
        {t('reportCommentLabel')}
      </label>
      <textarea
        id={commentId}
        className="report-comment"
        value={comment}
        onChange={(event) => {
          setComment(event.target.value);
        }}
      />
      <div className="report-actions">
        <button
          type="button"
          className="quiet"
          onClick={() => {
            setPhase('idle');
            setReason(null);
          }}
        >
          {t('reportCancel')}
        </button>
        <button
          type="button"
          className="continue"
          disabled={reason === null}
          onClick={() => void send()}
        >
          {t('reportSubmit')}
        </button>
      </div>
    </div>
  );
}
