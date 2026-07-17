import { useEffect, useState, type SubmitEvent } from 'react';
import {
  fetchMe,
  pushReviews,
  signIn,
  signOut,
  signUp,
  type Me,
} from '../api/client';
import { loadEvents } from '../learn/progress';

export interface AccountViewProps {
  onExit: () => void;
}

type Session =
  | { name: 'checking' }
  | { name: 'anonymous' }
  | { name: 'signedIn'; me: Me; synced: number | null };

/**
 * Anonymous-first (ADR 0022): an account only adds sync. On sign-in the
 * local review log is pushed unchanged; the server unions by event id.
 */
export function AccountView({ onExit }: AccountViewProps) {
  const [session, setSession] = useState<Session>({ name: 'checking' });
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const syncAndEnter = async () => {
    const me = await fetchMe();
    if (me === null) {
      setError('That did not work — check the details and try again.');
      return;
    }
    const result = await pushReviews(loadEvents());
    setSession({ name: 'signedIn', me, synced: result?.stored ?? null });
  };

  useEffect(() => {
    let active = true;
    const check = async () => {
      const me = await fetchMe();
      if (active) {
        setSession(
          me === null
            ? { name: 'anonymous' }
            : { name: 'signedIn', me, synced: null },
        );
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
      setError(
        mode === 'signUp'
          ? 'Could not create the account — the email may be taken, or the password is shorter than 8 characters.'
          : 'Wrong email or password.',
      );
    }
    setBusy(false);
  };

  const leave = async () => {
    await signOut();
    setSession({ name: 'anonymous' });
  };

  return (
    <div className="lesson">
      <header className="lesson-bar">
        <button type="button" className="quiet" onClick={onExit}>
          ← Back
        </button>
      </header>

      {session.name === 'checking' && <p className="lesson-note">Loading…</p>}

      {session.name === 'signedIn' && (
        <div className="account">
          <div className="stitch" aria-hidden="true" />
          <h2 className="account-title">Dobro došli.</h2>
          <p className="account-email">{session.me.user.email}</p>
          {session.synced !== null && (
            <p className="account-sync">
              {session.synced} new reviews synced from this device.
            </p>
          )}
          <p className="account-note">
            Your progress now follows you across devices.
          </p>
          <button type="button" className="quiet" onClick={() => void leave()}>
            Sign out
          </button>
        </div>
      )}

      {session.name === 'anonymous' && (
        <form className="account" onSubmit={(event) => void submit(event)}>
          <div className="stitch" aria-hidden="true" />
          <h2 className="account-title">
            {mode === 'signUp' ? 'Create an account' : 'Sign in'}
          </h2>
          <p className="account-note">
            Learning works without one — an account only syncs your progress
            across devices.
          </p>
          {mode === 'signUp' && (
            <label className="field">
              Display name
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
            Email
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
            Password
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
            {mode === 'signUp' ? 'Create account' : 'Sign in'}
          </button>
          <button
            type="button"
            className="footer-link"
            onClick={() => {
              setMode(mode === 'signUp' ? 'signIn' : 'signUp');
              setError(null);
            }}
          >
            {mode === 'signUp'
              ? 'Already have an account? Sign in'
              : 'New here? Create an account'}
          </button>
        </form>
      )}
    </div>
  );
}
