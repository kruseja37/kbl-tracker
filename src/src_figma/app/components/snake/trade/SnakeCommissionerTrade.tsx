import { useEffect, useMemo, useState } from 'react';
import type { SnakeGuidePackage } from '../../../../../engines/snakeGuideTrade';
import { TradePackageCard, type SnakeTradeGuideTeam } from './TradePackageCard';
import type { AskedPickGuideResult, ExecutedAskedPickTrade } from './tradeGuideModel';

export function SnakeCommissionerTrade(props: {
  teams: readonly SnakeTradeGuideTeam[];
  ownedPicksByTeamId: Readonly<Record<string, readonly number[]>>;
  sessionRevision: number;
  onAsk: (buyerTeamId: string, targetPick: number) => AskedPickGuideResult | Promise<AskedPickGuideResult>;
  onExecute: (proposal: SnakeGuidePackage) => ExecutedAskedPickTrade | Promise<ExecutedAskedPickTrade>;
}) {
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

  const check = async () => {
    if (!canCheck) return;
    setWorking(true);
    setStatus(null);
    try {
      const next = await props.onAsk(buyerTeamId, askedPick);
      setAnswer(next.proposal?.sellerTeamId === sellerTeamId ? next : {
        message: `No legal guide trade reaches pick ${askedPick}.`, proposal: null, nextPickMoves: [],
      });
    } finally {
      setWorking(false);
    }
  };

  const execute = async () => {
    if (!answer?.proposal) return;
    setWorking(true);
    try {
      const result = await props.onExecute(answer.proposal);
      setStatus(result.message);
      setAnswer(null);
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
      <p className="mt-2 text-sm">BOTH GMS AGREE IN THE ROOM. THE COMMISSIONER CHECKS THE GUIDE, THEN MAKES THE TRADE OR SAYS NO.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">BUYING CLUB
          <select aria-label="BUYING CLUB" className="mt-1 block w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2" value={buyerTeamId} onChange={(event) => { setBuyerTeamId(event.target.value); resetPackage(); }}>
            <option value="">CHOOSE A CLUB</option>
            {props.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">SELLING CLUB
          <select aria-label="SELLING CLUB" className="mt-1 block w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2" value={sellerTeamId} onChange={(event) => { setSellerTeamId(event.target.value); setTargetPick(''); resetPackage(); }}>
            <option value="">CHOOSE A CLUB</option>
            {props.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
      </div>
      <label className="mt-3 block text-sm font-bold">TARGET PICK
        <select aria-label="TARGET PICK" className="mt-1 block w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2" value={targetPick} onChange={(event) => { setTargetPick(event.target.value); resetPackage(); }}>
          <option value="">CHOOSE A PICK</option>
          {sellerPicks.map((pick) => <option key={pick} value={pick}>PICK {pick}</option>)}
        </select>
      </label>
      <button className="ballpark-press-button ballpark-press-md ballpark-press-gold mt-3" disabled={!canCheck || working} onClick={() => void check()}>CHECK THE GUIDE</button>

      {answer && <>
        <TradePackageCard answer={answer} teams={props.teams} />
        {answer.proposal && <div className="mt-3 flex flex-wrap gap-2">
          <button className="ballpark-press-button ballpark-press-md ballpark-press-gold" disabled={working} onClick={() => void execute()}>EXECUTE TRADE</button>
          <button className="ballpark-press-button ballpark-press-md ballpark-press-default" disabled={working} onClick={resetPackage}>DECLINE</button>
        </div>}
      </>}
      {status && <p className="mt-4 font-bold uppercase" role="status">{status}</p>}
    </section>
  );
}
