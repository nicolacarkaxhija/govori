import { useEffect, useState } from 'react';
import {
  fetchMyRecordings,
  type MyAudio,
  type MyRecording,
  type RecordingStatus,
} from '../api/client';
import { useT } from '../i18n';
import type { MessageKey } from '../i18n';

export interface MyRecordingsViewProps {
  onExit: () => void;
  onSignIn: () => void;
}

type Phase =
  | { name: 'loading' }
  | { name: 'unavailable' }
  | { name: 'signIn' }
  | { name: 'ready'; audio: MyAudio };

const STATUS_KEY: Record<RecordingStatus, MessageKey> = {
  pending: 'audioStatusPending',
  verified: 'audioStatusVerified',
  rejected: 'audioStatusRejected',
};

/**
 * A contributor's own audio (ADR 0048): their clips with validation status
 * and the consents each carries — shown, never edited here — plus the
 * casual-tier premium-time ledger in plain, honest terms. Reached from
 * Settings, only while the audio flag is live and the learner is signed in.
 */
export function MyRecordingsView({ onExit, onSignIn }: MyRecordingsViewProps) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });

  useEffect(() => {
    let active = true;
    void fetchMyRecordings().then((result) => {
      if (!active) {
        return;
      }
      if (result === 'unauthenticated') {
        setPhase({ name: 'signIn' });
      } else if (result === null) {
        setPhase({ name: 'unavailable' });
      } else {
        setPhase({ name: 'ready', audio: result });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          {t('back')}
        </button>
      </header>

      <h2 className="settings-title">{t('myRecordings')}</h2>

      {phase.name === 'loading' && (
        <p className="lesson-note">{t('loading')}</p>
      )}
      {phase.name === 'unavailable' && (
        <p className="lesson-note">{t('unreachableNow')}</p>
      )}
      {phase.name === 'signIn' && (
        <div className="account">
          <div className="stitch" aria-hidden="true" />
          <p className="account-note">{t('signInToVote')}</p>
          <button type="button" className="footer-link" onClick={onSignIn}>
            {t('signInTitle')}
          </button>
        </div>
      )}
      {phase.name === 'ready' && (
        <section className="my-recordings">
          <div className="audio-credit">
            <p className="audio-credit-title">{t('audioCreditTitle')}</p>
            {phase.audio.credit === null ? (
              <p className="audio-credit-line">{t('audioCreditNone')}</p>
            ) : (
              <p className="audio-credit-line">
                {t('audioCreditLine', {
                  seconds: phase.audio.credit.secondsValidated,
                  days: phase.audio.credit.premiumDaysGranted,
                })}
              </p>
            )}
          </div>

          {phase.audio.recordings.length === 0 ? (
            <p className="lesson-note">{t('myRecordingsEmpty')}</p>
          ) : (
            <ul className="review-list">
              {phase.audio.recordings.map((recording) => (
                <RecordingRow key={recording.id} recording={recording} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function RecordingRow({ recording }: { recording: MyRecording }) {
  const t = useT();
  return (
    <li className="review-entry audio-recording">
      <div className="audio-recording-head">
        <span className="audio-status" data-status={recording.status}>
          {t(STATUS_KEY[recording.status])}
        </span>
        <span className="audio-recording-date">
          {new Date(recording.createdAt).toLocaleDateString()}
        </span>
      </div>
      <ul className="audio-consents">
        <ConsentChip
          label={t('audioConsentApp')}
          granted={recording.consentApp}
        />
        <ConsentChip
          label={t('audioConsentDataset')}
          granted={recording.consentDataset}
        />
        <ConsentChip
          label={t('audioConsentTraining')}
          granted={recording.consentTraining}
        />
      </ul>
    </li>
  );
}

function ConsentChip({ label, granted }: { label: string; granted: boolean }) {
  return (
    <li className="audio-consent-chip" data-granted={granted}>
      <span aria-hidden="true">{granted ? '✓' : '—'}</span> {label}
    </li>
  );
}
