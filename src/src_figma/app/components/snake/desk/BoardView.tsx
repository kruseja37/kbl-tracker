import type { SnakePlanBill } from '../../../../../engines/snakeEconomics';
import { SNAKE_BOARD_SLOT_IDS } from '../../../../../utils/leagueBuilderStorage';
import { DeskCandidateRow } from './DeskCandidateRow';
import { DraftTruthStrip } from './DraftTruthStrip';
import { buildPlanLedger, type ChemistryStripRow, type DraftMoneyLedger } from './draftTruthModel';
import type { DeskCandidate, TaxCoreRow } from './deskModel';

const RATING_ROOM_GROUPS: ReadonlyArray<{ id: TaxCoreRow['group']; label: string }> = [
  { id: 'hitters', label: 'HITTERS' },
  { id: 'rotation', label: 'ROTATION' },
  { id: 'bullpen', label: 'BULLPEN' },
];

function ratingPoints(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

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
      {props.taxCoreRows.length > 0 ? <details className="mt-3 border-4 border-[var(--ballpark-panel-border)] p-3" data-testid={props.readOnly ? 'assistant-rating-room' : 'rating-room'}>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-black">
          <span>RATING ROOM</span>
          <span>${Math.round(props.taxCoreRows.reduce((sum, row) => sum + row.tax, 0)).toLocaleString()} TAX</span>
        </summary>
        {props.showHelp ? <p className="mt-2 text-sm font-bold">USED IS THE EXACT TOP-N RATING TOTAL. LIMIT IS YOUR ARCHETYPE-ADJUSTED TAX LINE.</p> : null}
        <div className="mt-3 space-y-4">
          {RATING_ROOM_GROUPS.map((group) => {
            const rows = props.taxCoreRows.filter((row) => row.group === group.id);
            if (rows.length === 0) return null;
            return <section key={group.id} aria-label={`${group.label} rating room`}>
              <h4 className="mb-1 text-xs font-black text-[var(--ballpark-brass)]">{group.label}</h4>
              <div className="space-y-1">
                {rows.map((row) => {
                  const selected = props.selectedCandidateId
                    ? row.contributors.find((contributor) => contributor.playerId === props.selectedCandidateId)
                    : undefined;
                  return <div
                    key={row.key}
                    className="border-2 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] px-2 py-2"
                    data-testid={`rating-room-row-${row.key}`}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-[10px] font-black sm:text-xs">
                      <strong>{row.stat} · TOP {row.topN}</strong>
                      <span>USED {ratingPoints(row.used)} / LIMIT {ratingPoints(row.allowed)}</span>
                      <strong className={row.room < 0 ? 'text-[var(--ballpark-status-red-bright)]' : 'text-[var(--ballpark-status-green)]'}>
                        {ratingPoints(Math.abs(row.room))} {row.room < 0 ? 'OVER' : 'LEFT'}
                      </strong>
                    </div>
                    <p className="mt-1 text-[9px] font-bold text-[var(--ballpark-chalk)]/75">
                      {row.contributors.length > 0
                        ? row.contributors.map((contributor) => `${contributor.playerName} ${ratingPoints(contributor.points)}`).join(' · ')
                        : 'NONE'}
                    </p>
                    {selected ? <p className="mt-1 text-[9px] font-black text-[var(--ballpark-brass)]">SELECTED · {ratingPoints(selected.points)} PTS</p> : null}
                    {row.tax > 0 ? <p className="mt-1 text-[9px] font-black text-[var(--ballpark-status-red-bright)]">${Math.round(row.tax).toLocaleString()} TAX</p> : null}
                  </div>;
                })}
              </div>
            </section>;
          })}
        </div>
      </details> : null}
    </div>
  );
}
