import { useEffect, useState } from 'react';
import {
  fetchRecordings,
  recordingUrl,
  uploadRecording,
  type Recording,
} from '../api/client';
import { useT } from '../i18n';

export interface AudioToolsProps {
  itemId: string;
  canListen: boolean;
  canRecord: boolean;
}

type RecordState = 'idle' | 'recording' | 'saved' | 'failed';

/** Uploads accept exactly these; MediaRecorder types carry codec suffixes. */
function plainMime(
  recorderMime: string,
): 'audio/webm' | 'audio/ogg' | 'audio/mpeg' {
  const base = recorderMime.split(';')[0];
  return base === 'audio/ogg' || base === 'audio/mpeg' ? base : 'audio/webm';
}

/**
 * Community audio on an exercise (ADR 0004): play a recorded pronunciation,
 * or contribute one — published straight away, accents welcome (ADR 0008).
 */
export function AudioTools({ itemId, canListen, canRecord }: AudioToolsProps) {
  const t = useT();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [state, setState] = useState<RecordState>('idle');
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);

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

  const record = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const media = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      media.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      media.onstop = () => {
        const publish = async () => {
          const ok = await uploadRecording(
            itemId,
            plainMime(media.mimeType),
            new Blob(chunks, { type: plainMime(media.mimeType) }),
          );
          setState(ok ? 'saved' : 'failed');
        };
        for (const track of stream.getTracks()) {
          track.stop();
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
      {canRecord && state !== 'recording' && (
        <button
          type="button"
          className="quiet"
          onClick={() => {
            void record();
          }}
        >
          {t('record')}
        </button>
      )}
      {canRecord && state === 'recording' && (
        <button type="button" className="quiet" onClick={stop}>
          {t('stopRecording')}
        </button>
      )}
      {state === 'saved' && <p className="audio-note">{t('recordingSaved')}</p>}
      {state === 'failed' && (
        <p className="audio-note">{t('recordingFailed')}</p>
      )}
    </div>
  );
}
