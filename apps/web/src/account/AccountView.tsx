import { useEffect, useState, type SubmitEvent } from 'react';
import {
  deleteAccount,
  exportData,
  fetchMe,
  fetchReviews,
  pushReviews,
  signIn,
  signOut,
  signUp,
  type Me,
} from '../api/client';
import { loadEvents, mergeEvents } from '../learn/progress';
import { useT } from '../i18n';

export interface AccountViewProps {
  onExit: () => void;
  onReview: () => void;
}

type Session =
  | { name: 'checking' }
  | { name: 'anonymous' }
  | { name: 'signedIn'; me: Me; synced: number | null; pulled: number };

/**
 * Anonymous-first (ADR 0022): an account only adds sync. On sign-in the
 * local review log is pushed unchanged; the server unions by event id.
 */
export function AccountView({ onExit, onReview }: AccountViewProps) {
  const t = useT();
  const [session, setSession] = useState<Session>({ name: 'checking' });
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [armDelete, setArmDelete] = useState(false);
  const [erased, setErased] = useState(false);

  const syncAndEnter = async () => {
    const me = await fetchMe();
    if (me === null) {
      setError(t('signInIssue'));
      return;
    }
    const result = await pushReviews(loadEvents());
    const remote = await fetchReviews();
    const pulled = remote === null ? 0 : mergeEvents(remote);
    setSession({
      name: 'signedIn',
      me,
      synced: result?.stored ?? null,
      pulled,
    });
  };

  useEffect(() => {
    let active = true;
    const check = async () => {
      const me = await fetchMe();
      if (active) {
        if (me === null) {
          setSession({ name: 'anonymous' });
          return;
        }
        const remote = await fetchReviews();
        const pulled = remote === null ? 0 : mergeEvents(remote);
        setSession({ name: 'signedIn', me, synced: null, pulled });
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const ok =
      mode === 'signUp'
        ? await signUp(
            email,
            password,
            displayName.trim() === ''
              ? (email.split('@')[0] ?? 'learner')
              : displayName,
          )
        : await signIn(email, password);
    if (ok) {
      await syncAndEnter();
    } else {
      setError(mode === 'signUp' ? t('signUpFailed') : t('signInFailed'));
    }
    setBusy(false);
  };

  const leave = async () => {
    await signOut();
    setSession({ name: 'anonymous' });
  };

  const download = async () => {
    const bundle = await exportData();
    if (bundle === null) {
      setError(t('exportFailed'));
      return;
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'govori-data.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const erase = async () => {
    if (!armDelete) {
      setArmDelete(true);
      return;
    }
    const ok = await deleteAccount();
    if (ok) {
      setErased(true);
      setArmDelete(false);
      setSession({ name: 'anonymous' });
    } else {
      setError(t('deleteFailed'));
    }
  };

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          {t('back')}
        </button>
      </header>

      {session.name === 'checking' && (
        <p className="lesson-note">{t('loading')}</p>
      )}

      {session.name === 'signedIn' && (
        <div className="account">
          <div className="stitch" aria-hidden="true" />
          <h2 className="account-title">{t('welcome')}</h2>
          <p className="account-email">{session.me.user.email}</p>
          {session.synced !== null && (
            <p className="account-sync">
              {t('syncedReviews', { count: session.synced })}
            </p>
          )}
          {session.pulled > 0 && (
            <p className="account-sync">
              {t('syncedDown', { count: session.pulled })}
            </p>
          )}
          <p className="account-note">{t('progressFollows')}</p>
          {session.me.user.role === 'admin' && (
            <button type="button" className="continue" onClick={onReview}>
              {t('reviewDrafts')}
            </button>
          )}
          <button type="button" className="quiet" onClick={() => void leave()}>
            {t('signOut')}
          </button>
          <div className="rights">
            <button
              type="button"
              className="footer-link"
              onClick={() => void download()}
            >
              {t('downloadData')}
            </button>
            <button
              type="button"
              className="footer-link danger"
              onClick={() => void erase()}
            >
              {armDelete ? t('deleteConfirm') : t('deleteAccount')}
            </button>
          </div>
          {error !== null && <p className="account-error">{error}</p>}
        </div>
      )}

      {session.name === 'anonymous' && (
        <form className="account" onSubmit={(event) => void submit(event)}>
          <div className="stitch" aria-hidden="true" />
          {erased && <p className="account-sync">{t('erasedNotice')}</p>}
          <h2 className="account-title">
            {mode === 'signUp' ? t('createTitle') : t('signInTitle')}
          </h2>
          <p className="account-note">{t('accountOptional')}</p>
          {mode === 'signUp' && (
            <label className="field">
              {t('displayName')}
              <input
                value={displayName}
                autoComplete="nickname"
                onChange={(event) => {
                  setDisplayName(event.target.value);
                }}
              />
            </label>
          )}
          <label className="field">
            {t('email')}
            <input
              type="email"
              required
              value={email}
              autoComplete="email"
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </label>
          <label className="field">
            {t('password')}
            <input
              type="password"
              required
              minLength={8}
              value={password}
              autoComplete={
                mode === 'signUp' ? 'new-password' : 'current-password'
              }
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
          </label>
          {error !== null && <p className="account-error">{error}</p>}
          <button type="submit" className="primary" disabled={busy}>
            {mode === 'signUp' ? t('createAccount') : t('signInTitle')}
          </button>
          <button
            type="button"
            className="footer-link"
            onClick={() => {
              setMode(mode === 'signUp' ? 'signIn' : 'signUp');
              setError(null);
            }}
          >
            {mode === 'signUp' ? t('haveAccount') : t('newHere')}
          </button>
        </form>
      )}
    </div>
  );
}
