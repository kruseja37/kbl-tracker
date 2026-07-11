import type { AskedPickGuideResult } from './tradeGuideModel';

export interface SnakeTradeGuideTeam {
  id: string;
  name: string;
}

function pickLabel(pick: number | null): string {
  return pick === null ? 'NONE' : `#${pick}`;
}

export function TradePackageCard(props: {
  answer: AskedPickGuideResult;
  teams: readonly SnakeTradeGuideTeam[];
}) {
  return (
    <div className="mt-4 border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-4" aria-live="polite">
      <p className="font-bold uppercase">{props.answer.message}</p>
      {props.answer.nextPickMoves.map((move) => (
        <p key={move.teamId} className="mt-2 text-sm font-bold">
          {(props.teams.find((team) => team.id === move.teamId)?.name ?? 'CLUB').toUpperCase()} NEXT PICK MOVES: {pickLabel(move.before)} → {pickLabel(move.after)}
        </p>
      ))}
    </div>
  );
}
