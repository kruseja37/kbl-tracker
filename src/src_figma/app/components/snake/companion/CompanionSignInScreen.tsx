import { useState } from 'react';

import { LoginForm } from '../../LoginForm';
import { COMPANION_AUTH_UNREACHABLE_COPY, companionAuthErrorCopy } from './companionAuthError';
import { CompanionHelp } from './CompanionHelp';

export function CompanionSignInScreen(props: {
  error: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const mappedPropError = companionAuthErrorCopy(props.error);
  const error = localError ?? mappedPropError;
  const authServiceUnavailable = error === COMPANION_AUTH_UNREACHABLE_COPY;
  const signIn = async (email: string, password: string) => {
    setLocalError(null);
    try {
      await props.onSignIn(email, password);
    } catch (cause) {
      setLocalError(companionAuthErrorCopy(cause) ?? 'SIGN IN FAILED.');
    }
  };
  return (
    <main className="ballpark-page min-h-screen">
      <section className="ballpark-panel mx-auto max-w-xl">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">COMPANION DEVICE</p>
        <h1 className="ballpark-title mt-1 text-3xl">SIGN IN</h1>
        <CompanionHelp>
          <p>SIGN IN WITH THE SAME ACCOUNT AS THE MAIN DEVICE.</p>
          <p className="mt-2">KEEP BOTH DEVICES ONLINE WHILE THE DRAFT IS OPEN.</p>
          {authServiceUnavailable ? <p className="mt-2">THIS DEVICE REACHED THE DRAFT, BUT THE ACCOUNT SERVICE DID NOT. RESTORE THE ACTIVE PROJECT CONNECTION, THEN TRY AGAIN.</p> : null}
        </CompanionHelp>
        <div className="mt-4">
          <LoginForm onSignIn={signIn} error={error} intro={false} variant="ballpark" />
        </div>
      </section>
    </main>
  );
}
