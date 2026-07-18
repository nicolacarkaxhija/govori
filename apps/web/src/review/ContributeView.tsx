import { useState, type SubmitEvent } from 'react';
import { pack } from '../instance';
import { contribute } from '../api/client';
import { useT } from '../i18n';

export interface ContributeViewProps {
  onExit: () => void;
  onSignIn: () => void;
}

type Kind = 'word' | 'phrase' | 'sentence';
type Notice =
  | null
  | 'contributed'
  | 'notCanonical'
  | 'signInToContribute'
  | 'contributeFailed';

/** Open item contributions (ADR 0009) into the review queue (ADR 0038). */
export function ContributeView({ onExit, onSignIn }: ContributeViewProps) {
  const t = useT();
  const [kind, setKind] = useState<Kind>('word');
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!pack.validateCanonical(text.trim())) {
      setNotice('notCanonical');
      return;
    }
    setBusy(true);
    const result = await contribute(kind, text.trim(), [
      { lang: 'en', text: translation.trim() },
    ]);
    setBusy(false);
    if (result === 'accepted') {
      setNotice('contributed');
      setText('');
      setTranslation('');
    } else if (result === 'unauthenticated') {
      setNotice('signInToContribute');
    } else if (result === 'invalid') {
      setNotice('notCanonical');
    } else {
      setNotice('contributeFailed');
    }
  };

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          {t('back')}
        </button>
      </header>

      <form className="account" onSubmit={(event) => void submit(event)}>
        <div className="stitch" aria-hidden="true" />
        <h2 className="account-title">{t('contributeTitle')}</h2>
        <p className="account-note">{t('contributeNote')}</p>
        <label className="field">
          {t('kindLabel')}
          <select
            value={kind}
            onChange={(event) => {
              const { value } = event.target;
              if (
                value === 'word' ||
                value === 'phrase' ||
                value === 'sentence'
              ) {
                setKind(value);
              }
            }}
          >
            <option value="word">{t('kindWord')}</option>
            <option value="phrase">{t('kindPhrase')}</option>
            <option value="sentence">{t('kindSentence')}</option>
          </select>
        </label>
        <label className="field">
          {t('targetTextLabel')}
          <input
            required
            value={text}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
        </label>
        <label className="field">
          {t('translationLabel')}
          <input
            required
            value={translation}
            onChange={(event) => {
              setTranslation(event.target.value);
            }}
          />
        </label>
        {notice === 'contributed' && (
          <p className="account-sync">{t('contributed')}</p>
        )}
        {notice !== null && notice !== 'contributed' && (
          <p className="account-error">{t(notice)}</p>
        )}
        {notice === 'signInToContribute' && (
          <button type="button" className="footer-link" onClick={onSignIn}>
            {t('signInTitle')}
          </button>
        )}
        <p className="account-note">{t('contributeLicense')}</p>
        <button type="submit" className="primary" disabled={busy}>
          {t('sendForReview')}
        </button>
      </form>
    </div>
  );
}
