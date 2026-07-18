import type { SnakePlanBill } from '../../../../../engines/snakeEconomics';
import { SNAKE_BOARD_SLOT_IDS } from '../../../../../utils/leagueBuilderStorage';
import { DeskCandidateRow } from './DeskCandidateRow';
import { DraftTruthStrip } from './DraftTruthStrip';
import { buildPlanLedger, type ChemistryStripRow, type DraftMoneyLedger } from './draftTruthModel';
import type { DeskCandidate, TaxCoreRow } from './deskModel';

export function BoardView(props: {
  candidates: readonly DeskCandidate[];
  boardSlots: Readonly<Record<string, string | undefined>>;
  brokenSlots: readonly string[];
  planBill: SnakePlanBill | null;
  planLedger?: DraftMoneyLedger | null;
  planTitle?: string;
  planChemistry?: readonly ChemistryStripRow[];
  taxCoreRows: readonly TaxCoreRow[];
  slotDepth: Readonly<Record<string, number | undefined>>;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string) => void;
  showHelp?: boolean;
  readOnly?: boolean;
  teamColors?: { primary: string; secondary: string };
}) {
  const byId = new Map(props.candidates.map((candidate) => [candidate.id, candidate]));
  const ledger = props.planLedger ?? (props.planBill ? buildPlanLedger(props.planBill) : null);
  return (
    <div data-testid={props.readOnly ? 'assistant-board-view' : 'my-board-view'}>
      {ledger && props.planChemistry ? (
        <div className="mb-4"><DraftTruthStrip title={props.planTitle ?? '22-PLAYER PLAN'} ledger={ledger} chemistry={props.planChemistry} testId={props.readOnly ? 'assistant-plan-truth-strip' : 'plan-truth-strip'} /></div>
      ) : null}
      <div
        className="grid grid-cols-1 gap-1"
        data-testid="board-slot-grid"
      >
        {SNAKE_BOARD_SLOT_IDS.map((slotId) => {
          const playerId = props.boardSlots[slotId];
          const candidate = playerId ? byId.get(playerId) : undefined;
          const slotLabel = slotId === 'BACKUP_C'
            && candidate
            && candidate.position !== 'C'
            && !candidate.eligiblePositions?.includes('C')
            ? 'FLEX5'
            : slotId;
          const state = props.brokenSlots.includes(slotId)
            ? 'PLAN BROKEN'
            : !playerId
              ? 'MISSING'
              : !candidate
                ? 'UNKNOWN PLAYER'
                : candidate.draftedByActiveTeam
                  ? 'ROSTER'
                  : candidate.drafted
                  ? 'UNAVAILABLE'
                  : (props.slotDepth[slotId] ?? 3) <= 2
                    ? `${props.slotDepth[slotId]} LEFT`
                    : null;
          return <div key={slotId} data-board-slot={slotId} data-board-state={state ?? 'READY'}>
            {candidate
              ? <DeskCandidateRow
                  candidate={candidate}
                  prefix={slotLabel}
                  selected={props.selectedCandidateId === playerId}
                  onSelect={props.onSelectCandidate}
                  warning={state}
                  teamColors={props.teamColors}
                />
              : <p className="min-h-12 border-2 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] px-2 py-3 font-black"><span className="mr-2 text-[var(--ballpark-brass)]">{slotLabel}</span>{state}</p>}
          </div>
        })}
      </div>
      {!props.readOnly ? <details className="mt-3 border-4 border-[var(--ballpark-panel-border)] p-3">
        <summary className="flex min-h-11 cursor-pointer items-center font-black">YOUR TAX CORE</summary>
        {props.showHelp ? <p className="mt-2 text-sm font-bold">THESE ARE THE PLAYERS WHO COUNT TOWARD YOUR TAX.</p> : null}
        <div className="mt-3 space-y-2">
          {props.taxCoreRows.map((row) => <p key={row.key}><strong>{row.label}{row.tax === undefined ? '' : ` · $${Math.round(row.tax).toLocaleString()} TAX`}</strong>: {row.playerNames.join(', ') || 'NONE'}</p>)}
        </div>
      </details> : null}
    </div>
  );
}
