import { useEffect, useState } from 'react';
import type { SnakeBoardSlotId } from '../../../../../utils/leagueBuilderStorage';
import type { DeskCandidate } from './deskModel';

export interface DeskWhatIf {
  slotId: SnakeBoardSlotId;
  playerId: string;
  planCost: number;
  planTax: number;
  planCushion: number;
  legal: boolean;
  legalityLine: string;
  legalFinishLine: string;
}

export function WhatIfSandbox(props: {
  candidates: readonly DeskCandidate[];
  boardSlots: Partial<Record<SnakeBoardSlotId, string>>;
  whatIf: DeskWhatIf | null;
  onStart: (slotId: SnakeBoardSlotId, playerId: string) => void;
  onKeep: () => void;
  onRevert: () => void;
  showHelp?: boolean;
}) {
  const firstSlot = Object.keys(props.boardSlots)[0] as SnakeBoardSlotId | undefined;
  const [slotId, setSlotId] = useState<SnakeBoardSlotId | ''>(firstSlot ?? '');
  const [playerId, setPlayerId] = useState(props.candidates[0]?.id ?? '');
  useEffect(() => {
    if (props.candidates.some((candidate) => candidate.id === playerId)) return;
    setPlayerId(props.candidates[0]?.id ?? '');
  }, [playerId, props.candidates]);
  return (
    <div className="border-4 border-[var(--ballpark-panel-border)] p-3">
      <h3 className="font-black">WHAT-IF</h3>
      {props.showHelp ? <p className="mb-3 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 text-xs">CHOOSE ONE CHANGE. THE DESK SHOWS THE MONEY. YOU DECIDE.</p> : null}
      {!props.whatIf ? (
        <div className="flex flex-wrap gap-2">
          <select className="min-h-11" aria-label="What-if board slot" value={slotId} onChange={(event) => setSlotId(event.target.value as SnakeBoardSlotId)}>
            {Object.keys(props.boardSlots).map((slot) => <option key={slot} value={slot}>{slot}</option>)}
          </select>
          <select className="min-h-11" aria-label="What-if player" value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
            {props.candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
          </select>
          <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" disabled={!slotId || !playerId} onClick={() => props.onStart(slotId as SnakeBoardSlotId, playerId)}>PRICE THIS CHANGE</button>
        </div>
      ) : (
        <div>
          <p className="font-bold">PLAN COST ${Math.round(props.whatIf.planCost).toLocaleString()} · PLAN TAX ${Math.round(props.whatIf.planTax).toLocaleString()} · PLAN CUSHION ${Math.round(props.whatIf.planCushion).toLocaleString()}</p>
          <p className={`mt-2 font-bold ${props.whatIf.legal ? '' : 'text-[var(--ballpark-warn-text)]'}`}>{props.whatIf.legalityLine}</p>
          <p className="mt-2">{props.whatIf.legalFinishLine}</p>
          <div className="mt-3 flex gap-2">
            <button className="ballpark-press-button ballpark-press-sm ballpark-press-gold" disabled={!props.whatIf.legal} onClick={props.onKeep}>KEEP</button>
            <button className="ballpark-press-button ballpark-press-sm ballpark-press-default" onClick={props.onRevert}>REVERT</button>
          </div>
        </div>
      )}
    </div>
  );
}
