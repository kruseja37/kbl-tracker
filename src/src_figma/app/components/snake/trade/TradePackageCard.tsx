import type { AskedPickGuideResult } from './tradeGuideModel';
import type { SnakeOpenTradeOffer } from '../../../../../utils/leagueBuilderStorage';

export interface SnakeTradeGuideTeam {
  id: string;
  name: string;
}

function pickLabel(pick: number | null): string {
  return pick === null ? 'NONE' : `#${pick}`;
}

function teamName(teams: readonly SnakeTradeGuideTeam[], teamId: string): string {
  return (teams.find((team) => team.id === teamId)?.name ?? 'CLUB').toUpperCase();
}

function picks(pickNumbers: readonly number[]): string {
  return pickNumbers.map((pick) => `#${pick}`).join(' + ') || 'NONE';
}

function value(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

export function TradeOfferValueCard(props: {
  offer: Pick<SnakeOpenTradeOffer, 'buyerTeamId' | 'sellerTeamId' | 'offerPickNumbers' | 'receivePickNumbers' | 'offerValue' | 'receiveValue' | 'sellerPremium'>;
  teams: readonly SnakeTradeGuideTeam[];
  viewerTeamId?: string | null;
}) {
  const viewerIsSeller = props.viewerTeamId === props.offer.sellerTeamId;
  const give = viewerIsSeller ? props.offer.receivePickNumbers : props.offer.offerPickNumbers;
  const get = viewerIsSeller ? props.offer.offerPickNumbers : props.offer.receivePickNumbers;
  const counterpartyId = viewerIsSeller ? props.offer.buyerTeamId : props.offer.sellerTeamId;
  return <div className="mt-3 grid min-w-0 gap-2 border-2 border-[var(--ballpark-panel-border)] p-3" data-testid="trade-value-card">
    <p className="font-black">WITH {teamName(props.teams, counterpartyId)}</p>
    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
      <p className="min-w-0"><span className="block text-[10px] font-black text-[var(--ballpark-brass)]">YOU GIVE</span><strong className="break-words">{picks(give)}</strong></p>
      <p className="min-w-0"><span className="block text-[10px] font-black text-[var(--ballpark-brass)]">YOU GET</span><strong className="break-words">{picks(get)}</strong></p>
    </div>
    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
      <p><span className="block text-[9px] font-bold">OFFER TOTAL</span><strong>{value(props.offer.offerValue)}</strong></p>
      <p><span className="block text-[9px] font-bold">RECEIVE TOTAL</span><strong>{value(props.offer.receiveValue)}</strong></p>
      <p><span className="block text-[9px] font-bold">SELLER PREMIUM</span><strong>{Number.isFinite(props.offer.sellerPremium) ? value(props.offer.sellerPremium!) : 'UNAVAILABLE'}</strong></p>
    </div>
  </div>;
}

export function TradePackageCard(props: {
  answer: AskedPickGuideResult;
  teams: readonly SnakeTradeGuideTeam[];
  viewerTeamId?: string | null;
}) {
  return (
    <div className="mt-4 border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-4" aria-live="polite">
      <p className="font-bold uppercase">{props.answer.message}</p>
      {props.answer.proposal ? <TradeOfferValueCard offer={props.answer.proposal} teams={props.teams} viewerTeamId={props.viewerTeamId ?? props.answer.proposal.buyerTeamId} /> : null}
      {props.answer.nextPickMoves.map((move) => (
        <p key={move.teamId} className="mt-2 text-sm font-bold">
          {(props.teams.find((team) => team.id === move.teamId)?.name ?? 'CLUB').toUpperCase()} NEXT PICK MOVES: {pickLabel(move.before)} → {pickLabel(move.after)}
        </p>
      ))}
    </div>
  );
}
