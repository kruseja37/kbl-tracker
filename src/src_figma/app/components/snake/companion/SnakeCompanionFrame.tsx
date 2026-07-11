import type { ReactNode } from 'react';

export function SnakeCompanionFrame(props: {
  team: { id: string; name: string; abbreviation: string; logoUrl?: string };
  currentPick: number;
  order: readonly { pick: number; teamName: string }[];
  ticker: readonly string[];
  privateDesk: ReactNode;
  tradeGuide: ReactNode;
  onSignOut: () => void;
}) {
  return (
    <main className="ballpark-page min-h-screen" data-testid="snake-companion-frame">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--ballpark-brass)]">YOUR PRIVATE DRAFT DESK</p>
          <h1 className="ballpark-title text-3xl">{props.team.name.toUpperCase()}</h1>
        </div>
        <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={props.onSignOut}>COVER THIS DEVICE</button>
      </header>
      <section className="ballpark-panel mb-4" aria-label="Draft order">
        <p className="font-bold">CURRENT PICK {props.currentPick}</p>
        <div className="mt-2 flex gap-2 overflow-x-auto">{props.order.map((slot) => <span key={slot.pick} className="whitespace-nowrap border-2 border-[var(--ballpark-panel-border)] px-2 py-1 text-sm">#{slot.pick} {slot.teamName.toUpperCase()}</span>)}</div>
      </section>
      <section className="ballpark-panel mb-4" aria-label="Draft ticker">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">ROOM TICKER</p>
        {props.ticker.length ? props.ticker.map((line) => <p key={line} className="mt-1 text-sm">{line}</p>) : <p className="mt-1 text-sm">NO PICKS RECORDED YET.</p>}
      </section>
      <section className="ballpark-panel mb-4">{props.privateDesk}</section>
      <section className="ballpark-panel">{props.tradeGuide}</section>
    </main>
  );
}
