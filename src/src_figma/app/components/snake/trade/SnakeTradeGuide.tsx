import { useEffect, useState } from 'react';
import type { PickValue } from '../../../../../engines/leagueConstruction';
import { TradePackageCard, type SnakeTradeGuideTeam } from './TradePackageCard';
import type { AskedPickGuideResult } from './tradeGuideModel';

export function SnakeTradeGuide(props: {
  teams: readonly SnakeTradeGuideTeam[];
  fixedBuyerTeamId?: string | null;
  pickValueChart: readonly PickValue[];
  sessionRevision: number;
  onAsk: (buyerTeamId: string, targetPick: number) => AskedPickGuideResult | Promise<AskedPickGuideResult>;
}) {
  const [buyerTeamId, setBuyerTeamId] = useState(props.fixedBuyerTeamId ?? props.teams[0]?.id ?? '');
  const [targetPick, setTargetPick] = useState('');
  const [answer, setAnswer] = useState<AskedPickGuideResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setAnswer(null);
    if (props.fixedBuyerTeamId) setBuyerTeamId(props.fixedBuyerTeamId);
  }, [props.fixedBuyerTeamId, props.sessionRevision]);

  const askedPick = Number(targetPick);
  const validPick = Number.isInteger(askedPick) && props.pickValueChart.some((row) => row.pick === askedPick);
  const ask = async () => {
    if (!buyerTeamId || !validPick) return;
    setChecking(true);
    try {
      setAnswer(await props.onAsk(buyerTeamId, askedPick));
    } finally {
      setChecking(false);
    }
  };

  return (
    <section aria-label="The trade guide">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--ballpark-brass)]">POSTED PICK PRICES</p>
      <h2 className="ballpark-title mt-1 text-2xl">THE GUIDE</h2>
      <p className="mt-2 text-sm">CHOOSE A PICK. THE GUIDE CHECKS THE PRICE AND MAKES SURE BOTH CLUBS CAN STILL FINISH THEIR TEAMS.</p>

      {!props.fixedBuyerTeamId && (
        <label className="mt-4 block text-sm font-bold">
          YOUR CLUB
          <select className="mt-1 block w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2" value={buyerTeamId} onChange={(event) => { setBuyerTeamId(event.target.value); setAnswer(null); }}>
            {props.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
      )}

      <label className="mt-4 block text-sm font-bold">
        WHAT WOULD IT COST TO REACH PICK N?
        <span className="mt-1 block text-xs">ENTER THE PICK NUMBER YOU WANT.</span>
        <input
          aria-label="WHAT WOULD IT COST TO REACH PICK N?"
          className="mt-1 block w-full border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2"
          type="number"
          min={1}
          max={props.pickValueChart.at(-1)?.pick ?? 1}
          value={targetPick}
          onChange={(event) => { setTargetPick(event.target.value); setAnswer(null); }}
        />
      </label>
      <button className="ballpark-press-button ballpark-press-md ballpark-press-gold mt-3" disabled={!validPick || checking} onClick={() => void ask()}>
        {validPick ? `CHECK PICK ${askedPick}` : 'ENTER A PICK'}
      </button>

      {answer && <TradePackageCard answer={answer} teams={props.teams} />}

      <details className="mt-5 border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3" open>
        <summary className="cursor-pointer font-bold">FULL POSTED PRICE CHART</summary>
        <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {props.pickValueChart.map((row) => (
            <div key={row.pick} className="flex justify-between border-2 border-[var(--ballpark-panel-border)] p-2 text-sm">
              <span className="font-bold">PICK {row.pick}</span>
              <span>${Math.round(row.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
