import { useState } from 'react';
import { CompanionHelp } from './CompanionHelp';
import { companionRoomCodeFromSearch } from './companionJoinUrl';

export function CompanionClaimScreen(props: {
  pending?: boolean;
  message?: string | null;
  accountEmail: string;
  onSignOut: () => void | Promise<void>;
  onClaim: (gmName: string, roomCode: string) => void | Promise<void>;
}) {
  const [gmName, setGmName] = useState('');
  const [roomCode, setRoomCode] = useState(() => companionRoomCodeFromSearch(window.location.search));
  const accountLine = (
    <p className="mt-3 text-xs font-bold">
      ACCOUNT {props.accountEmail.toUpperCase()}{' '}
      <button type="button" className="underline" onClick={() => void props.onSignOut()}>SIGN OUT</button>
    </p>
  );
  if (props.pending) {
    return <main className="ballpark-page min-h-screen"><section className="ballpark-panel mx-auto max-w-xl"><h1 className="ballpark-title text-3xl">WAITING FOR THE MAIN DEVICE</h1>{accountLine}<CompanionHelp><p>YOUR DESK STAYS COVERED UNTIL THE COMMISSIONER APPROVES THIS DEVICE.</p></CompanionHelp>{props.message && <p className="mt-3 font-bold">{props.message}</p>}</section></main>;
  }
  return (
    <main className="ballpark-page min-h-screen">
      <section className="ballpark-panel mx-auto max-w-xl">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">COMPANION DEVICE</p>
        <h1 className="ballpark-title mt-1 text-3xl">CLAIM YOUR PRIVATE DESK</h1>
        {accountLine}
        <CompanionHelp>
          <p>ENTER THE GM NAME FROM THE MAIN SCREEN AND ITS FOUR-DIGIT ROOM CODE.</p>
          <p>USE THE SAME SIGNED-IN ACCOUNT AS THE MAIN DEVICE.</p>
        </CompanionHelp>
        <label className="mt-4 block font-bold">GM NAME<input className="mt-1 block w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2" value={gmName} onChange={(event) => setGmName(event.target.value)} /></label>
        <label className="mt-3 block font-bold">ROOM CODE<input aria-label="ROOM CODE" inputMode="numeric" maxLength={4} className="mt-1 block w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2" value={roomCode} onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
        <button className="ballpark-press-button ballpark-press-md ballpark-press-gold mt-4" disabled={!gmName.trim() || roomCode.length !== 4} onClick={() => void props.onClaim(gmName, roomCode)}>ASK TO SEE MY DESK</button>
        {props.message && <p className="mt-3 font-bold" role="alert">{props.message}</p>}
      </section>
    </main>
  );
}
