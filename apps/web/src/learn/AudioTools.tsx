import { useEffect, useState } from 'react';
import {
  fetchRecordings,
  recordingUrl,
  uploadRecording,
  type Recording,
  type RecordingConsent,
  type RecordingMime,
} from '../api/client';
import { useT } from '../i18n';
import { loadConsent, saveConsent } from './audioConsent';

export interface AudioToolsProps {
  itemId: string;
  canListen: boolean;
  canRecord: boolean;
}

type RecordState = 'idle' | 'consent' | 'recording' | 'saved' | 'failed';

/** Uploads accept exactly these; MediaRecorder types carry codec suffixes. */
function plainMime(recorderMime: string): RecordingMime {
  const base = recorderMime.split(';')[0];
  return base === 'audio/ogg' || base === 'audio/mpeg' ? base : 'audio/webm';
}

/**
 * Community audio on an exercise (ADR 0004): play a recorded pronunciation,
 * or contribute one. Before a learner's first clip a one-time consent sheet
 * captures the three independently opt-in grants (ADR 0048) — app use is
 * required and locked on; dataset and training default off. The choice is
 * remembered locally, so it is not re-asked every clip.
 */
export function AudioTools({ itemId, canListen, canRecord }: AudioToolsProps) {
  const t = useT();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [state, setState] = useState<RecordState>('idle');
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [dataset, setDataset] = useState(false);
  const [training, setTraining] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!canListen) {
      return;
    }
    let active = true;
    void fetchRecordings(itemId).then((found) => {
      if (active) {
        setRecordings(found);
      }
    });
    return () => {
      active = false;
    };
  }, [itemId, canListen]);

  const play = (random: () => number = Math.random) => {
    const pick = recordings[Math.floor(random() * recordings.length)];
    if (pick !== undefined) {
      void new Audio(recordingUrl(pick.id)).play();
    }
  };

  const capture = async (consent: RecordingConsent) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const media = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const startedAt = Date.now();
      media.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      media.onstop = () => {
        const mime = plainMime(media.mimeType);
        const durationMs = Math.max(1, Math.round(Date.now() - startedAt));
        const track = stream.getAudioTracks()[0];
        const sampleRate = track?.getSettings().sampleRate;
        const publish = async () => {
          const ok = await uploadRecording(
            itemId,
            new Blob(chunks, { type: mime }),
            {
              ...(sampleRate === undefined ? {} : { sampleRate }),
              mime,
              durationMs,
            },
            consent,
          );
          setState(ok ? 'saved' : 'failed');
        };
        for (const each of stream.getTracks()) {
          each.stop();
        }
        void publish();
      };
      media.start();
      setRecorder(media);
      setState('recording');
    } catch {
      setState('failed');
    }
  };

  const onRecord = () => {
    const consent = loadConsent();
    if (consent === null) {
      setShowDetails(false);
      setState('consent');
      return;
    }
    void capture(consent);
  };

  const agree = () => {
    void capture(saveConsent({ dataset, training }));
  };

  const stop = () => {
    recorder?.stop();
    setRecorder(null);
  };

  if (!canRecord && recordings.length === 0) {
    return null;
  }

  return (
    <div className="audio-tools">
      {recordings.length > 0 && (
        <button
          type="button"
          className="quiet"
          onClick={() => {
            play();
          }}
        >
          {t('listen')}
        </button>
      )}
      {canRecord && state !== 'recording' && state !== 'consent' && (
        <button type="button" className="quiet" onClick={onRecord}>
          {t('record')}
        </button>
      )}
      {canRecord && state === 'recording' && (
        <button type="button" className="quiet" onClick={stop}>
          {t('stopRecording')}
        </button>
      )}
      {state === 'consent' && (
        <section className="consent-sheet" aria-label={t('audioConsentTitle')}>
          <h3 className="consent-title">{t('audioConsentTitle')}</h3>
          <p className="consent-intro">{t('audioConsentIntro')}</p>
          <ul className="consent-grants">
            <li className="consent-grant">
              <label className="consent-toggle">
                <input
                  type="checkbox"
                  checked
                  readOnly
                  disabled
                  aria-label={t('audioConsentApp')}
                />
                <span className="consent-grant-name">
                  {t('audioConsentApp')}
                </span>
                <span className="consent-required">
                  {t('audioConsentRequired')}
                </span>
              </label>
              <p className="consent-explain">{t('audioConsentAppNote')}</p>
            </li>
            <li className="consent-grant">
              <label className="consent-toggle">
                <input
                  type="checkbox"
                  checked={dataset}
                  onChange={(event) => {
                    setDataset(event.target.checked);
                  }}
                />
                <span className="consent-grant-name">
                  {t('audioConsentDataset')}
                </span>
              </label>
              <p className="consent-explain">{t('audioConsentDatasetNote')}</p>
            </li>
            <li className="consent-grant">
              <label className="consent-toggle">
                <input
                  type="checkbox"
                  checked={training}
                  onChange={(event) => {
                    setTraining(event.target.checked);
                  }}
                />
                <span className="consent-grant-name">
                  {t('audioConsentTraining')}
                </span>
              </label>
              <p className="consent-explain">{t('audioConsentTrainingNote')}</p>
            </li>
          </ul>
          <button
            type="button"
            className="footer-link"
            aria-expanded={showDetails}
            onClick={() => {
              setShowDetails((shown) => !shown);
            }}
          >
            {t('audioWhatHappens')}
          </button>
          {showDetails && (
            <p className="consent-details">{t('audioWhatHappensNote')}</p>
          )}
          <div className="consent-actions">
            <button type="button" className="primary" onClick={agree}>
              {t('audioConsentAgree')}
            </button>
            <button
              type="button"
              className="quiet"
              onClick={() => {
                setState('idle');
              }}
            >
              {t('dismiss')}
            </button>
          </div>
        </section>
      )}
      {state === 'saved' && <p className="audio-note">{t('recordingSaved')}</p>}
      {state === 'failed' && (
        <p className="audio-note">{t('recordingFailed')}</p>
      )}
    </div>
  );
}
