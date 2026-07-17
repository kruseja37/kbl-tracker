import { useState, type ReactNode } from 'react';

import { companionAuthErrorCopy } from './snake/companion/companionAuthError';

const SIGN_IN_TIMEOUT_MS = 15_000;

function withSignInTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('SIGN IN TIMED OUT — TRY AGAIN.')), SIGN_IN_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== null) clearTimeout(timeoutId);
  });
}

export function LoginForm(props: {
  onSignIn: (email: string, password: string) => Promise<void>;
  error: string | null;
  intro?: ReactNode | false;
  variant?: 'legacy' | 'ballpark';
}) {
  const ballpark = props.variant === 'ballpark';
  const inputClass = ballpark
    ? 'w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3 text-sm font-bold outline-none focus:border-[var(--ballpark-brass)]'
    : 'w-full bg-black border-2 border-gray-600 text-white text-xs p-3 font-mono focus:border-[#0066FF] outline-none';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? props.error;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      await withSignInTimeout(props.onSignIn(email, password));
    } catch (cause) {
      setLocalError(companionAuthErrorCopy(cause) ?? 'SIGN IN FAILED.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {props.intro === false
        ? null
        : props.intro ?? <p className="text-xs text-gray-400 mb-4">Sign in to sync data across devices.</p>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className={inputClass}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className={inputClass}
        required
      />

      {error && <p className={ballpark ? 'text-sm font-bold text-[var(--ballpark-warn-text)]' : 'text-[#FF4444] text-[10px]'} role="alert">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className={ballpark
          ? 'ballpark-press-button ballpark-press-lg ballpark-press-gold w-full disabled:opacity-50'
          : "w-full bg-[#0066FF] text-black font-['Press_Start_2P'] text-[10px] py-3 hover:bg-[#3388FF] disabled:opacity-50"}
      >
        {loading ? 'SIGNING IN...' : 'SIGN IN'}
      </button>
    </form>
  );
}
