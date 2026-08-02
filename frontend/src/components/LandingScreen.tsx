import { FormEvent, useEffect, useState } from 'react';
import { ApiError, login } from '../api/client';
import { useTheme } from '../hooks/useTheme';

type Props = { onLogin: () => void; initialError?: string };

export function LandingScreen({ onLogin, initialError = '' }: Props) {
  useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  useEffect(() => { setError(initialError); }, [initialError]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(password);
      onLogin();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) setError('Incorrect passcode.');
      else if (caught instanceof ApiError && caught.status === 429) setError(caught.message);
      else setError(navigator.onLine ? 'Unable to unlock tracly right now. Try again.' : "You're offline and have no local data yet.");
      setLoading(false);
    }
  };

  return <main className="landing-shell">
    <section className="landing-card">
      <div className="landing-wordmark">tracly</div>
      <p className="landing-subtitle">Private financial tracker</p>
      <form className="landing-form" onSubmit={submit}>
        <label htmlFor="password">Passcode</label>
        <input className={`landing-password${error ? ' shake' : ''}`} id="password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} autoFocus />
        {error && <div className="landing-error" role="alert">{error}</div>}
        <button className="landing-submit" type="submit" disabled={loading}>{loading ? 'Unlocking…' : 'Unlock'}</button>
      </form>
    </section>
  </main>;
}
