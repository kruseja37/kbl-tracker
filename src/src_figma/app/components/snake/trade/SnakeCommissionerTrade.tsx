import { useEffect, useMemo, useState } from 'react';
import type { SnakeGuidePackage } from '../../../../../engines/snakeGuideTrade';
import type { SnakeOpenTradeOffer } from '../../../../../utils/leagueBuilderStorage';
import { TradeOfferValueCard, TradePackageCard, type SnakeTradeGuideTeam } from './TradePackageCard';
import type { AskedPickGuideResult, ExecutedAskedPickTrade } from './tradeGuideModel';

export function SnakeCommissionerTrade(props: {
  teams: readonly SnakeTradeGuideTeam[];
  ownedPicksByTeamId: Readonly<Record<string, readonly number[]>>;
  sessionRevision: number;
  openOffers?: readonly SnakeOpenTradeOffer[];
  showHelp?: boolean;
  onAsk: (buyerTeamId: string, targetPick: number) => AskedPickGuideResult | Promise<AskedPickGuideResult>;
  onPost: (proposal: SnakeGuidePackage) => void | Promise<void>;
  onNod: (offerId: string, teamId: string) => void | Promise<void>;
  onClose: (offerId: string, action: 'WITHDRAWN' | 'DECLINED') => void | Promise<void>;
  onExecute: (offer: SnakeOpenTradeOffer) => ExecutedAskedPickTrade | Promise<ExecutedAskedPickTrade>;
  onFailure?: () => void | Promise<void>;
}) {
  const openOffers = props.openOffers ?? [];
  const [buyerTeamId, setBuyerTeamId] = useState('');
  const [sellerTeamId, setSellerTeamId] = useState('');
  const [targetPick, setTargetPick] = useState('');
  const [answer, setAnswer] = useState<AskedPickGuideResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setAnswer(null);
    setStatus(null);
  }, [props.sessionRevision]);

  const sellerPicks = useMemo(
    () => [...(props.ownedPicksByTeamId[sellerTeamId] ?? [])].sort((left, right) => left - right),
    [props.ownedPicksByTeamId, sellerTeamId],
  );
  const askedPick = Number(targetPick);
  const canCheck = Boolean(buyerTeamId && sellerTeamId && buyerTeamId !== sellerTeamId && sellerPicks.includes(askedPick));
  const reportFailure = async (cause: unknown) => {
    setStatus((cause instanceof Error ? cause.message : String(cause)).toUpperCase());
    try {
      await props.onFailure?.();
    } catch {
      // The original trade failure remains the actionable status.
    }
  };

  const check = async () => {
    if (!canCheck) return;
    setWorking(true);
    setStatus(null);
    try {
      const next = await props.onAsk(buyerTeamId, askedPick);
      setAnswer(next.proposal?.sellerTeamId === sellerTeamId ? next : {
        message: `No legal guide trade reaches pick ${askedPick}.`, proposal: null, nextPickMoves: [],
      });
    } catch (cause) {
      await reportFailure(cause);
    } finally {
      setWorking(false);
    }
  };

  const post = async () => {
    if (!answer?.proposal) return;
    setWorking(true);
    try {
      await props.onPost(answer.proposal);
      setStatus('THE OFFER IS POSTED.');
      setAnswer(null);
    } catch (cause) {
      await reportFailure(cause);
    } finally {
      setWorking(false);
    }
  };

  const execute = async (offer: SnakeOpenTradeOffer) => {
    setWorking(true);
    try {
      const result = await props.onExecute(offer);
      setStatus(result.message);
    } catch (cause) {
      await reportFailure(cause);
    } finally {
      setWorking(false);
    }
  };

  const actOnOffer = async (action: () => void | Promise<void>, success: string) => {
    setWorking(true);
    setStatus(null);
    try {
      await action();
      setStatus(success);
    } catch (cause) {
      await reportFailure(cause);
    } finally {
      setWorking(false);
    }
  };

  const resetPackage = () => {
    setAnswer(null);
    setStatus(null);
  };

  return (
    <section aria-label="Commissioner trade">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">COMMISSIONER</p>
      <h2 className="ballpark-title mt-1 text-2xl">TRADE PICKS</h2>
      {props.showHelp ? <p className="mt-2 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 text-xs">BOTH GMS AGREE IN THE ROOM. THE COMMISSIONER CHECKS THE GUIDE, THEN MAKES THE TRADE OR SAYS NO.</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">BUYING CLUB
          <select aria-label="BUYING CLUB" className="mt-1 block min-h-11 w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2" value={buyerTeamId} onChange={(event) => { setBuyerTeamId(event.target.value); resetPackage(); }}>
            <option value="">CHOOSE A CLUB</option>
            {props.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">SELLING CLUB
          <select aria-label="SELLING CLUB" className="mt-1 block min-h-11 w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2" value={sellerTeamId} onChange={(event) => { setSellerTeamId(event.target.value); setTargetPick(''); resetPackage(); }}>
            <option value="">CHOOSE A CLUB</option>
            {props.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
      </div>
      <label className="mt-3 block text-sm font-bold">TARGET PICK
        <select aria-label="TARGET PICK" className="mt-1 block min-h-11 w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2" value={targetPick} onChange={(event) => { setTargetPick(event.target.value); resetPackage(); }}>
          <option value="">CHOOSE A PICK</option>
          {sellerPicks.map((pick) => <option key={pick} value={pick}>PICK {pick}</option>)}
        </select>
      </label>
      <button className="ballpark-press-button ballpark-press-md ballpark-press-gold mt-3 min-h-11" disabled={!canCheck || working} onClick={() => void check()}>CHECK THE GUIDE</button>

      {answer && <>
        <TradePackageCard answer={answer} teams={props.teams} viewerTeamId={buyerTeamId} />
        {answer.proposal && <div className="mt-3 flex flex-wrap gap-2">
          <button className="ballpark-press-button ballpark-press-md ballpark-press-gold min-h-11" disabled={working} onClick={() => void post()}>POST OFFER</button>
          <button className="ballpark-press-button ballpark-press-md ballpark-press-default min-h-11" disabled={working} onClick={resetPackage}>CANCEL</button>
        </div>}
      </>}
      {openOffers.length > 0 && <div className="mt-5 grid gap-3" aria-label="Open trade offers">
        {openOffers.map((offer) => <article key={offer.id} className="border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3">
          <p className="font-black">{teamName(props.teams, offer.buyerTeamId)} ↔ {teamName(props.teams, offer.sellerTeamId)}</p>
          <TradeOfferValueCard offer={offer} teams={props.teams} viewerTeamId={offer.buyerTeamId} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="ballpark-press-button ballpark-press-sm ballpark-press-gold min-h-11" disabled={working || offer.buyerNod} onClick={() => void actOnOffer(() => props.onNod(offer.id, offer.buyerTeamId), 'THE BUYER NOD IS RECORDED.')}>{offer.buyerNod ? 'BUYER NODDED' : 'BUYER NOD'}</button>
            <button className="ballpark-press-button ballpark-press-sm ballpark-press-gold min-h-11" disabled={working || offer.sellerNod} onClick={() => void actOnOffer(() => props.onNod(offer.id, offer.sellerTeamId), 'THE SELLER NOD IS RECORDED.')}>{offer.sellerNod ? 'SELLER NODDED' : 'SELLER NOD'}</button>
            <button className="ballpark-press-button ballpark-press-sm ballpark-press-gold min-h-11" disabled={working || !offer.buyerNod || !offer.sellerNod} onClick={() => void execute(offer)}>EXECUTE TRADE</button>
            <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" disabled={working} onClick={() => void actOnOffer(() => props.onClose(offer.id, 'WITHDRAWN'), 'THE OFFER IS WITHDRAWN.')}>WITHDRAW</button>
            <button className="ballpark-press-button ballpark-press-sm ballpark-press-default min-h-11" disabled={working} onClick={() => void actOnOffer(() => props.onClose(offer.id, 'DECLINED'), 'THE OFFER IS DECLINED.')}>DECLINE</button>
          </div>
        </article>)}
      </div>}
      {status && <p className="mt-4 font-bold uppercase" role="status">{status}</p>}
    </section>
  );
}

function teamName(teams: readonly SnakeTradeGuideTeam[], teamId: string): string {
  return (teams.find((team) => team.id === teamId)?.name ?? 'UNKNOWN TEAM').toUpperCase();
}
