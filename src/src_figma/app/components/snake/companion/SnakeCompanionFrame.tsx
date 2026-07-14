import { useState, type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { buildCompanionBranding, safeCompanionLogoUrl } from './companionFrameModel';

export function CompanionCoveredScreen(props: {
  onReturn: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  onForgetRoom?: () => void | Promise<void>;
  message?: string | null;
}) {
  return (
    <main className="ballpark-page min-h-screen" data-testid="snake-companion-covered">
      <section className="ballpark-panel mx-auto max-w-xl text-center">
        <h1 className="ballpark-title text-3xl">DEVICE COVERED</h1>
        {props.message ? <p className="mt-3 font-bold" role="alert">{props.message}</p> : null}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-gold min-h-11" onClick={() => void props.onReturn()}>RETURN TO DESK</button>
          {props.onForgetRoom ? <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-default min-h-11" onClick={() => void props.onForgetRoom?.()}>FORGET ROOM</button> : null}
          <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-default min-h-11" onClick={() => void props.onSignOut()}>SIGN OUT</button>
        </div>
      </section>
    </main>
  );
}

export function CompanionCompletedScreen(props: {
  teamName: string;
  onLeave: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <main className="ballpark-page min-h-screen" data-testid="snake-companion-complete">
      <section className="ballpark-panel mx-auto max-w-xl text-center">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">{props.teamName.toUpperCase()}</p>
        <h1 className="ballpark-title mt-1 text-3xl">DRAFT COMPLETE</h1>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-gold min-h-11" onClick={() => void props.onLeave()}>LEAVE ROOM</button>
          <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-default min-h-11" onClick={() => void props.onSignOut()}>SIGN OUT</button>
        </div>
      </section>
    </main>
  );
}

export function CompanionAwaitingCommissionerScreen(props: {
  teamName: string;
  onCover: () => void;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <main className="ballpark-page min-h-screen" data-testid="snake-companion-awaiting-commissioner">
      <section className="ballpark-panel mx-auto max-w-xl text-center">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">{props.teamName.toUpperCase()}</p>
        <h1 className="ballpark-title mt-1 text-3xl">PICKS COMPLETE</h1>
        <p className="mt-3 font-bold">WAITING FOR COMMISSIONER</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-gold min-h-11" onClick={props.onCover}>COVER DESK</button>
          <button type="button" className="ballpark-press-button ballpark-press-md ballpark-press-default min-h-11" onClick={() => void props.onSignOut()}>SIGN OUT</button>
        </div>
      </section>
    </main>
  );
}

export function SnakeCompanionFrame(props: {
  team: {
    id: string;
    name: string;
    abbreviation: string;
    logoUrl?: string;
    colors?: { primary?: string; secondary?: string; accent?: string };
  };
  currentPick: number;
  order: readonly { pick: number; teamName: string }[];
  ticker: readonly string[];
  selectedPlayer?: ReactNode;
  draftedTruth?: ReactNode;
  privateDesk: ReactNode | ((showHelp: boolean) => ReactNode);
  message?: string | null;
  helpNotes?: readonly string[];
  onCover: () => void;
}) {
  const logoUrl = safeCompanionLogoUrl(props.team.logoUrl);
  const branding = buildCompanionBranding(props.team.colors);
  const [showHelp, setShowHelp] = useState(false);
  const privateDesk = typeof props.privateDesk === 'function' ? props.privateDesk(showHelp) : props.privateDesk;
  return (
    <main className="ballpark-page min-h-screen min-w-0 overflow-x-hidden" data-testid="snake-companion-frame">
      <header
        className="mb-5 flex flex-wrap items-center justify-between gap-3 border-4 p-3"
        style={{ backgroundColor: branding.background, color: branding.foreground, borderColor: branding.border }}
        data-testid="companion-team-header"
      >
        <div className="flex items-center gap-3">
          {logoUrl ? <img className="h-14 w-14 object-contain" src={logoUrl} alt={`${props.team.name} logo`} onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
          <div>
          <p className="text-[11px] font-bold tracking-[0.2em]" style={{ color: branding.foreground }}>YOUR PRIVATE DRAFT DESK</p>
          <h1 className="ballpark-title text-3xl" style={{ color: branding.foreground }}>{props.team.name.toUpperCase()}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11 min-w-11" aria-label="HELP" aria-pressed={showHelp} onClick={() => setShowHelp((value) => !value)}><HelpCircle size={15} /> ?</button>
          <button type="button" className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" onClick={props.onCover}>COVER THIS DEVICE</button>
        </div>
      </header>
      {showHelp ? <section className="mb-4 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 text-xs" aria-label="Companion help">
        <p>THIS DEVICE SHOWS ONLY THE CLAIMED CLUB'S PRIVATE DESK.</p>
        {props.helpNotes?.map((note) => <p className="mt-1" key={note}>{note}</p>)}
      </section> : null}
      {props.message ? <p className="mb-4 border-4 border-[var(--ballpark-panel-border)] p-3 font-bold" role="status">{props.message}</p> : null}
      <section className="ballpark-panel mb-4 min-w-0 overflow-hidden" aria-label="Live draft strip" data-testid="companion-live-strip">
        <div className="flex min-h-11 min-w-0 items-center gap-2 overflow-x-auto pb-1">
          <strong className="shrink-0 whitespace-nowrap text-[var(--ballpark-brass)]">PICK {props.currentPick}</strong>
          {props.order.map((slot) => <span key={slot.pick} className="shrink-0 whitespace-nowrap border-2 border-[var(--ballpark-panel-border)] px-2 py-1 text-sm">#{slot.pick} {slot.teamName.toUpperCase()}</span>)}
          <span className="h-7 shrink-0 border-l-2 border-[var(--ballpark-brass)]" aria-hidden="true" />
          {props.ticker.length ? props.ticker.map((line) => <span key={line} className="shrink-0 whitespace-nowrap text-sm font-bold">{line}</span>) : <span className="shrink-0 whitespace-nowrap text-sm">BOARD OPEN</span>}
        </div>
      </section>
      {props.selectedPlayer}
      {props.draftedTruth ? <div className="mb-4">{props.draftedTruth}</div> : null}
      <section className="ballpark-panel mb-4 min-w-0 overflow-hidden">{privateDesk}</section>
    </main>
  );
}
