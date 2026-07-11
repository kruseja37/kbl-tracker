import type { DeskCandidate } from './deskModel';

export function DeskCandidateCard({ candidate, boardSlot }: { candidate: DeskCandidate; boardSlot?: string }) {
  const risk = candidate.risk === 'SAFE_TO_WAIT' ? 'SAFE TO WAIT' : candidate.risk.replaceAll('_', ' ');
  return (
    <div className="border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className={candidate.drafted ? 'line-through opacity-60' : ''}>{candidate.name}</strong>
        <span className="border-2 border-[var(--ballpark-brass)] px-2 py-0.5 text-[10px] font-bold">{candidate.archetypeChip}</span>
        <span className="text-xs font-bold">{candidate.fitWord}</span>
      </div>
      <p className="mt-2 text-sm font-bold">TRUE COST ${Math.round(candidate.trueCost).toLocaleString()}</p>
      {candidate.marginalTax < 0 && (
        <p className="mt-1 text-xs font-bold text-[var(--ballpark-brass)]">
          YOUR TAX BILL GOES DOWN ${Math.round(Math.abs(candidate.marginalTax)).toLocaleString()} IF YOU TAKE HIM
        </p>
      )}
      <p className="mt-1 text-xs font-bold">NEXT PICK — {risk}</p>
      {candidate.riskReason && <details className="mt-1 text-xs"><summary>WHY THIS READ?</summary><p>{candidate.riskReason}</p></details>}
      <p className="mt-2 text-sm">{candidate.legalFinishLine}</p>
      <p className="mt-2 text-sm font-bold">{boardSlot ? `FITS YOUR BOARD — ${boardSlot} SLOT` : candidate.boardFallout ?? 'OFF-BOARD — CHOOSE A SLOT TO PRICE THE CHANGE.'}</p>
    </div>
  );
}
