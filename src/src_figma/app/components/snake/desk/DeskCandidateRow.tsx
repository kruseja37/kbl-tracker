import type { DeskCandidate } from './deskModel';
import { fitToneForWord } from './draftTruthModel';
import type { SnakeDraftDecision } from './snakeDraftDecisionModel';

export function DeskCandidateRow(props: {
  candidate: DeskCandidate;
  prefix?: string;
  selected?: boolean;
  warning?: string | null;
  onSelect?: (candidateId: string) => void;
  decision?: SnakeDraftDecision | null;
  onTradeDecision?: (decision: Extract<SnakeDraftDecision, { kind: 'TRADE_TO_PICK' }>) => void;
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
  const decision = props.decision?.playerId === props.candidate.id ? props.decision : null;
  const decisionLabel = decision?.kind === 'SAFE_TO_WAIT'
    ? 'SAFE TO WAIT'
    : decision?.kind === 'TAKE_NOW'
      ? 'TAKE NOW'
      : decision?.kind === 'PASS'
        ? 'PASS'
        : null;
  return (
    <div className="grid min-h-12 w-full grid-cols-[minmax(0,1fr)_auto] items-stretch gap-1">
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
    {decision?.kind === 'TRADE_TO_PICK' ? (
      <button
        type="button"
        className="ballpark-press-button ballpark-press-sm ballpark-press-gold min-h-11 whitespace-nowrap"
        onClick={() => props.onTradeDecision?.(decision)}
      >TRADE TO #{decision.targetPick}</button>
    ) : decisionLabel ? (
      <span
        className="flex min-h-11 items-center border-2 border-[var(--ballpark-brass)] px-2 text-[10px] font-black whitespace-nowrap"
        data-testid="snake-decision-label"
      >{decisionLabel}</span>
    ) : null}
    </div>
  );
}
