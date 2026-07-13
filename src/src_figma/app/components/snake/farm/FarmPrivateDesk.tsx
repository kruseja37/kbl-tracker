import { useMemo, useState } from 'react';

import type { FarmFogCardModel } from './farmRoomModel';
import { AdvisorLog } from '../desk/AdvisorLog';
import type { AdvisorLogEntry } from '../desk/deskModel';
import type { FarmMoneyLedger } from '../../../../../engines/snakeFarmSlots';
import type { FarmSeatBoardRecord } from '../../../../../utils/leagueBuilderStorage';

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function FarmSelectedProspectCard(props: {
  card: FarmFogCardModel;
  slotPick: number;
  slotSalary: number;
  farmMoneyLeft: number;
  teamName: string;
  teamLogoUrl?: string;
}) {
  return (
    <section className="mb-3 border-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] p-3" data-testid="selected-farm-prospect-card">
      <div className="flex items-start gap-3">
        {props.teamLogoUrl ? <img className="h-14 w-14 shrink-0 object-contain" src={props.teamLogoUrl} alt={`${props.teamName} logo`} /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black tracking-[0.16em] text-[var(--ballpark-brass)]">SELECTED PROSPECT</p>
          <h2 className="text-xl font-black uppercase">{props.card.name}</h2>
          <p className="text-xs font-bold">{props.card.eligiblePositions.join(' · ') || props.card.position}</p>
        </div>
        <span className="border-2 border-[var(--ballpark-brass)] px-2 py-1 text-sm font-black">{props.card.scoutedGrade}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <p><span className="block text-[10px] font-bold text-[var(--ballpark-brass)]">SCOUT RANGE</span><strong>{props.card.gradeRange}</strong></p>
        <p><span className="block text-[10px] font-bold text-[var(--ballpark-brass)]">CONFIDENCE</span><strong>{props.card.confidence.toUpperCase()}</strong></p>
        <p><span className="block text-[10px] font-bold text-[var(--ballpark-brass)]">PICK {props.slotPick}</span><strong>{money(props.slotSalary)}</strong></p>
        <p><span className="block text-[10px] font-bold text-[var(--ballpark-brass)]">AFTER PICK</span><strong>{money(props.farmMoneyLeft - props.slotSalary)}</strong></p>
      </div>
      <p className="mt-3 text-xs font-black">{props.card.scoutName.toUpperCase()} · {props.card.scoutsCall}</p>
    </section>
  );
}

export function FarmPrivateDesk(props: {
  cards: readonly FarmFogCardModel[];
  selectedId: string | null;
  slotPick: number;
  slotSalary: number;
  farmMoneyLeft: number;
  advisorLog: readonly AdvisorLogEntry[];
  board?: FarmSeatBoardRecord | null;
  remainingTurns?: number;
  moneyLedger?: FarmMoneyLedger | null;
  onChoose: (playerId: string) => void;
  onReorder?: (view: string, orderedIds: string[]) => void;
}) {
  const [view, setView] = useState('OVERALL');
  const cardById = useMemo(() => new Map(props.cards.map((card) => [card.id, card])), [props.cards]);
  const positions = useMemo(() => [...new Set(props.cards.flatMap((card) => card.eligiblePositions))].sort(), [props.cards]);
  const ids = props.board
    ? view === 'OVERALL' ? props.board.overall : props.board.byPosition[view] ?? []
    : props.cards.map((card) => card.id);
  const visibleIds = ids.filter((id) => cardById.has(id));
  const visibleCards = visibleIds.flatMap((id) => cardById.get(id) ?? []);
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= visibleIds.length) return;
    const visibleOrder = [...visibleIds];
    [visibleOrder[index], visibleOrder[target]] = [visibleOrder[target], visibleOrder[index]];
    let cursor = 0;
    const ordered = ids.map((id) => cardById.has(id) ? visibleOrder[cursor++] : id);
    props.onReorder?.(view, ordered);
  };
  const plannedCards = (props.board?.plannedProspectIds ?? []).flatMap((id) => cardById.get(id) ?? []);
  const ledger = props.moneyLedger;
  return (
    <section aria-label="Farm private desk" className="mb-4 space-y-3">
      <div className="border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3">
        <p className="text-xs font-bold text-[var(--ballpark-brass)]">FARM MONEY</p>
        {ledger ? <>
          <p className="font-bold">DRAFTED {ledger.draftedCount} · SPENT {money(ledger.draftedSpend)} · LEFT {money(ledger.moneyLeft)}</p>
          <p className="font-bold">PLAN {props.board?.plannedProspectIds.length ?? ledger.plannedCount}/{props.remainingTurns ?? ledger.plannedCount} · OWED {money(ledger.futureSlotCost)} · AFTER {money(ledger.moneyAfterOwedSlots)}</p>
        </> : <p className="font-bold">{money(props.farmMoneyLeft)} LEFT AFTER YOUR RECORDED PICKS</p>}
        <p className="mt-1 text-sm">PICK {props.slotPick} PAYS {money(props.slotSalary)} — WHOEVER TAKES IT.</p>
      </div>
      {props.board ? <div className="border-4 border-[var(--ballpark-panel-border)] p-3" aria-label="Planned farm class">
        <p className="text-xs font-bold text-[var(--ballpark-brass)]">PLANNED CLASS</p>
        <p className="font-bold">{plannedCards.map((card) => card.name).join(' · ') || '—'}</p>
        {(props.remainingTurns ?? 0) > plannedCards.length ? <p className="font-bold text-[var(--ballpark-warn-text)]">OPEN {(props.remainingTurns ?? 0) - plannedCards.length}</p> : null}
      </div> : null}
      <AdvisorLog entries={props.advisorLog} />
      {props.board ? <div className="flex flex-wrap gap-1" aria-label="Farm board views">
        {['OVERALL', ...positions].map((position) => <button
          key={position}
          type="button"
          aria-pressed={view === position}
          className={`ballpark-press-button ballpark-press-sm min-h-11 ${view === position ? 'ballpark-press-gold' : 'ballpark-press-default'}`}
          onClick={() => setView(position)}
        >{position}</button>)}
      </div> : null}
      <div className="max-h-80 space-y-2 overflow-y-auto" aria-label="Scouted prospect board">
        {visibleCards.map((card, index) => (
          <div key={card.id} className="flex gap-1">
            <button
              type="button"
              className={`block min-w-0 flex-1 border-4 p-3 text-left ${card.id === props.selectedId ? 'border-[var(--ballpark-brass)]' : 'border-[var(--ballpark-panel-border)]'}`}
              onClick={() => props.onChoose(card.id)}
            >
              <span className="block text-lg font-bold uppercase">{card.name}</span>
              <span className="block text-sm">{card.position} · YOUR SCOUT · {card.scoutName}: {card.scoutedGrade} · RANGE {card.gradeRange} · {card.confidence.toUpperCase()} CONFIDENCE</span>
              <span className="mt-1 block text-sm font-bold">{card.scoutsCall}</span>
            </button>
            {props.onReorder ? <div className="flex flex-col gap-1">
              <button className="min-h-11 min-w-11 border-2 font-black" type="button" aria-label={`Move ${card.name} up`} disabled={index === 0} onClick={() => move(index, -1)}>▲</button>
              <button className="min-h-11 min-w-11 border-2 font-black" type="button" aria-label={`Move ${card.name} down`} disabled={index === visibleIds.length - 1} onClick={() => move(index, 1)}>▼</button>
            </div> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
