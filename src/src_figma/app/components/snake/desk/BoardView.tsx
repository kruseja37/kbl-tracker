import type { SnakePlanBill } from '../../../../../engines/snakeEconomics';
import type { SnakeBoardSlotId } from '../../../../../utils/leagueBuilderStorage';
import { DeskCandidateRow } from './DeskCandidateRow';
import { DraftTruthStrip } from './DraftTruthStrip';
import { buildPlanLedger, type ChemistryStripRow } from './draftTruthModel';
import type { DeskCandidate, TaxCoreRow } from './deskModel';

export function BoardView(props: {
  candidates: readonly DeskCandidate[];
  boardSlots: Partial<Record<SnakeBoardSlotId, string>>;
  brokenSlots: readonly SnakeBoardSlotId[];
  planBill: SnakePlanBill | null;
  planChemistry?: readonly ChemistryStripRow[];
  taxCoreRows: readonly TaxCoreRow[];
  slotDepth: Partial<Record<SnakeBoardSlotId, number>>;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
  showHelp?: boolean;
}) {
  const byId = new Map(props.candidates.map((candidate) => [candidate.id, candidate]));
  return (
    <div>
      <div
        className="grid grid-cols-1 gap-1"
        data-testid="board-slot-grid"
      >
        {Object.entries(props.boardSlots).map(([slotId, playerId]) => (
          <div key={slotId}>
            {byId.get(playerId)
              ? <DeskCandidateRow
                  candidate={byId.get(playerId)!}
                  prefix={slotId}
                  selected={props.selectedCandidateId === playerId}
                  onSelect={props.onSelectCandidate}
                  warning={props.brokenSlots.includes(slotId as SnakeBoardSlotId)
                    ? 'PLAN BROKEN'
                    : (props.slotDepth[slotId as SnakeBoardSlotId] ?? 3) <= 2
                      ? `${props.slotDepth[slotId as SnakeBoardSlotId]} LEFT`
                      : null}
                />
              : <p className="font-bold">{playerId}</p>}
          </div>
        ))}
      </div>
      {props.planBill && props.planChemistry ? (
        <div className="mt-4"><DraftTruthStrip title="22-PLAYER PLAN" ledger={buildPlanLedger(props.planBill)} chemistry={props.planChemistry} testId="plan-truth-strip" /></div>
      ) : props.planBill ? (
        <div className="mt-4 border-4 border-[var(--ballpark-brass)] p-3 text-center">
          <div className="grid grid-cols-3 gap-2">
            <div><p className="text-xs font-bold">PLAN COST</p><strong>${Math.round(props.planBill.planCost).toLocaleString()}</strong></div>
            <div><p className="text-xs font-bold">PLAN TAX</p><strong>${Math.round(props.planBill.planTax).toLocaleString()}</strong></div>
            <div><p className="text-xs font-bold">PLAN CUSHION</p><strong>${Math.round(props.planBill.planCushion).toLocaleString()}</strong></div>
          </div>
          {props.showHelp ? <p className="mt-2 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 text-xs">PLAN CUSHION IS THE MONEY LEFT IF THESE 22 ARE STILL THERE.</p> : null}
        </div>
      ) : null}
      <details className="mt-3 border-4 border-[var(--ballpark-panel-border)] p-3">
        <summary className="cursor-pointer font-black">YOUR TAX CORE</summary>
        {props.showHelp ? <p className="mt-2 text-sm font-bold">THESE ARE THE PLAYERS WHO COUNT TOWARD YOUR TAX.</p> : null}
        <div className="mt-3 space-y-2">
          {props.taxCoreRows.map((row) => <p key={row.key}><strong>{row.label}</strong>: {row.playerNames.join(', ') || 'NONE'}</p>)}
        </div>
      </details>
    </div>
  );
}
