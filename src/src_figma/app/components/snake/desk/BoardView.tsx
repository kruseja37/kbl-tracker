import type { SnakePlanBill } from '../../../../../engines/snakeEconomics';
import type { SnakeBoardSlotId } from '../../../../../utils/leagueBuilderStorage';
import { DeskCandidateCard } from './DeskCandidateCard';
import type { DeskCandidate, TaxCoreRow } from './deskModel';

export function BoardView(props: {
  candidates: readonly DeskCandidate[];
  boardSlots: Partial<Record<SnakeBoardSlotId, string>>;
  brokenSlots: readonly SnakeBoardSlotId[];
  planBill: SnakePlanBill | null;
  taxCoreRows: readonly TaxCoreRow[];
  slotDepth: Partial<Record<SnakeBoardSlotId, number>>;
  resolveLegalFinishLine?: (candidateId: string) => string;
  showHelp?: boolean;
}) {
  const byId = new Map(props.candidates.map((candidate) => [candidate.id, candidate]));
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(props.boardSlots).map(([slotId, playerId]) => (
          <div key={slotId} className="border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-2">
            <p className="text-[10px] font-bold text-[var(--ballpark-brass)]">{slotId}</p>
            {byId.get(playerId)
              ? <DeskCandidateCard candidate={byId.get(playerId)!} boardSlot={slotId} legalFinishLine={props.resolveLegalFinishLine?.(playerId)} />
              : <p className="font-bold">{playerId}</p>}
            {props.brokenSlots.includes(slotId as SnakeBoardSlotId) && <p className="text-sm font-black text-[var(--ballpark-warn-text)]">PLAN BROKEN</p>}
            {(props.slotDepth[slotId as SnakeBoardSlotId] ?? 3) <= 2 && !props.brokenSlots.includes(slotId as SnakeBoardSlotId) && (
              <p className="mt-2 text-xs font-black text-[var(--ballpark-warn-text)]">YOUR {slotId} SLOT IS DOWN TO DEPTH — {props.slotDepth[slotId as SnakeBoardSlotId]} LEFT YOU'VE RANKED</p>
            )}
          </div>
        ))}
      </div>
      {props.planBill && (
        <div className="mt-4 border-4 border-[var(--ballpark-brass)] p-3 text-center">
          <div className="grid grid-cols-3 gap-2">
            <div><p className="text-xs font-bold">PLAN COST</p><strong>${Math.round(props.planBill.planCost).toLocaleString()}</strong></div>
            <div><p className="text-xs font-bold">PLAN TAX</p><strong>${Math.round(props.planBill.planTax).toLocaleString()}</strong></div>
            <div><p className="text-xs font-bold">PLAN CUSHION</p><strong>${Math.round(props.planBill.planCushion).toLocaleString()}</strong></div>
          </div>
          {props.showHelp ? <p className="mt-2 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 text-xs">PLAN CUSHION IS THE MONEY LEFT IF THESE 22 ARE STILL THERE.</p> : null}
        </div>
      )}
      <details className="mt-3 border-4 border-[var(--ballpark-panel-border)] p-3">
        <summary className="cursor-pointer font-black">YOUR TAX CORE</summary>
        <p className="mt-2 text-sm font-bold">THESE ARE THE PLAYERS WHO COUNT TOWARD YOUR TAX.</p>
        <div className="mt-3 space-y-2">
          {props.taxCoreRows.map((row) => <p key={row.key}><strong>{row.label}</strong>: {row.playerNames.join(', ') || 'NONE'}</p>)}
        </div>
      </details>
    </div>
  );
}
