import { LoginForm } from '../../LoginForm';
import { CompanionHelp } from './CompanionHelp';

export function CompanionSignInScreen(props: {
  error: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
}) {
  return (
    <main className="ballpark-page min-h-screen">
      <section className="ballpark-panel mx-auto max-w-xl">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">COMPANION DEVICE</p>
        <h1 className="ballpark-title mt-1 text-3xl">SIGN IN</h1>
        <CompanionHelp>
          <p>SIGN IN WITH THE SAME ACCOUNT AS THE MAIN DEVICE.</p>
          <p className="mt-2">KEEP BOTH DEVICES ONLINE WHILE THE DRAFT IS OPEN.</p>
        </CompanionHelp>
        <div className="mt-4">
          <LoginForm onSignIn={props.onSignIn} error={props.error} intro={false} variant="ballpark" />
        </div>
      </section>
    </main>
  );
}
