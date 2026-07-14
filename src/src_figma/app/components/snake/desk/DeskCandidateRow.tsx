import type { DeskCandidate } from './deskModel';
import { fitToneForWord } from './draftTruthModel';

export function DeskCandidateRow(props: {
  candidate: DeskCandidate;
  prefix?: string;
  selected?: boolean;
  warning?: string | null;
  onSelect?: (candidateId: string) => void;
}) {
  const identity = props.candidate.identityChips?.join(' · ') ?? '';
  const fit = props.candidate.consequencesKnown === false ? 'UNKNOWN' : props.candidate.fitWord;
  const tone = fitToneForWord(fit);
  const fitClass = tone === 'green'
    ? 'text-[var(--ballpark-status-green)]'
    : tone === 'red'
      ? 'text-[var(--ballpark-warn-text)]'
      : 'text-[var(--ballpark-brass)]';
  const risk = props.candidate.risk !== 'SAFE_TO_WAIT'
    ? props.candidate.risk.replaceAll('_', ' ')
    : props.candidate.riskPending
      ? 'CALCULATING'
      : props.candidate.riskUnavailable
        ? 'RISK UNAVAILABLE'
        : null;
  return (
    <div className="grid min-h-12 w-full min-w-0 grid-cols-1 items-stretch gap-1">
    <button
      type="button"
      data-player-id={props.candidate.id}
      className={`grid min-h-12 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-2 px-2 py-1 text-left ${props.selected ? 'border-[var(--ballpark-brass)] bg-[var(--ballpark-action-green)]' : 'border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)]'}`}
      aria-label={`SELECT ${props.candidate.name}${identity ? ` · ${identity}` : ''}`}
      aria-pressed={props.selected}
      disabled={props.candidate.drafted}
      onClick={() => props.onSelect?.(props.candidate.id)}
    >
      <span className="min-w-0">
        {props.prefix ? <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-[var(--ballpark-brass)]">{props.prefix}</span> : null}
        <span className="block break-words font-black uppercase leading-tight">{props.candidate.name}</span>
        {identity ? <span className="block break-words text-[10px] font-black text-[var(--ballpark-brass)]">{identity}</span> : null}
        <span className="block break-words text-[11px] font-bold">{props.candidate.position} · <span className={fitClass}>{fit}</span>{risk ? ` · ${risk}` : ''}{props.warning ? ` · ${props.warning}` : ''}</span>
      </span>
      <span className="text-right text-[11px] font-black">
        <span className="block">${Math.round(props.candidate.trueCost).toLocaleString()}</span>
        {props.candidate.marginalTax !== 0 ? <span className={`block ${props.candidate.marginalTax < 0 ? 'text-[var(--ballpark-status-green)]' : 'text-[var(--ballpark-warn-text)]'}`}>TAX {props.candidate.marginalTax > 0 ? '+' : '−'}${Math.round(Math.abs(props.candidate.marginalTax)).toLocaleString()}</span> : null}
      </span>
    </button>
    </div>
  );
}
