import type { DeskCandidate } from './deskModel';

export function DeskCandidateCard({
  candidate,
  boardSlot,
  legalFinishLine,
  selected = false,
  selectable = true,
  onSelect,
}: {
  candidate: DeskCandidate;
  boardSlot?: string;
  legalFinishLine?: string;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: (candidateId: string) => void;
}) {
  const risk = candidate.risk === 'SAFE_TO_WAIT' ? 'SAFE TO WAIT' : candidate.risk.replaceAll('_', ' ');
  return (
    <div className={`border-4 bg-[var(--ballpark-well)] p-3 ${selected ? 'border-[var(--ballpark-brass)] shadow-[inset_0_0_0_2px_var(--ballpark-brass)]' : 'border-[var(--ballpark-panel-border)]'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <strong className={`uppercase ${candidate.drafted ? 'line-through opacity-60' : ''}`}>{candidate.name}</strong>
        <span className="border-2 border-[var(--ballpark-brass)] px-2 py-0.5 text-[10px] font-bold">{candidate.archetypeChip}</span>
        <span className="text-xs font-bold">{candidate.fitWord}</span>
        {selected && <span className="bg-[var(--ballpark-brass)] px-2 py-0.5 text-[10px] font-black text-[var(--ballpark-page-bg)]">SELECTED</span>}
      </div>
      <p className="mt-2 text-sm font-bold">TRUE COST ${Math.round(candidate.trueCost).toLocaleString()}</p>
      {candidate.marginalTax < 0 && (
        <p className="mt-1 text-xs font-bold text-[var(--ballpark-brass)]">
          YOUR TAX BILL GOES DOWN ${Math.round(Math.abs(candidate.marginalTax)).toLocaleString()} WITH THIS PLAYER
        </p>
      )}
      <p className="mt-1 text-xs font-bold">NEXT PICK — {risk}</p>
      {candidate.riskReason && <details className="mt-1 text-xs"><summary>WHY THIS READ?</summary><p>{candidate.riskReason}</p></details>}
      <p className="mt-2 text-sm">{legalFinishLine ?? candidate.legalFinishLine}</p>
      <p className="mt-2 text-sm font-bold">{boardSlot ? `FITS YOUR BOARD — ${boardSlot} SLOT` : candidate.boardFallout ?? 'NOT ON YOUR BOARD — CHOOSE A SLOT TO PRICE THE CHANGE.'}</p>
      {onSelect && (
        <button
          type="button"
          className="ballpark-press-button ballpark-press-sm ballpark-press-default mt-3"
          aria-label={`SELECT ${candidate.name}`}
          aria-pressed={selected}
          data-player-id={candidate.id}
          disabled={Boolean(candidate.drafted) || !selectable}
          onClick={() => onSelect(candidate.id)}
        >
          {selected ? 'SELECTED' : candidate.drafted ? 'DRAFTED' : !selectable ? 'BLOCKED' : 'SELECT'}
        </button>
      )}
    </div>
  );
}
