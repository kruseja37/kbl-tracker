import type { FarmFogCardModel } from './farmRoomModel';
import { AdvisorLog } from '../desk/AdvisorLog';
import type { AdvisorLogEntry } from '../desk/deskModel';

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function FarmPrivateDesk(props: {
  cards: readonly FarmFogCardModel[];
  selectedId: string | null;
  slotPick: number;
  slotSalary: number;
  farmMoneyLeft: number;
  advisorLog: readonly AdvisorLogEntry[];
  onChoose: (playerId: string) => void;
}) {
  return (
    <section aria-label="Farm private desk" className="mb-4 space-y-3">
      <div className="border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] p-3">
        <p className="text-xs font-bold text-[var(--ballpark-brass)]">FARM MONEY</p>
        <p className="font-bold">{money(props.farmMoneyLeft)} LEFT AFTER YOUR RECORDED PICKS</p>
        <p className="mt-1 text-sm">PICK {props.slotPick} PAYS {money(props.slotSalary)} — WHOEVER TAKES IT.</p>
      </div>
      <AdvisorLog entries={props.advisorLog} />
      <div className="max-h-80 space-y-2 overflow-y-auto" aria-label="Scouted prospect board">
        {props.cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`block w-full border-4 p-3 text-left ${card.id === props.selectedId ? 'border-[var(--ballpark-brass)]' : 'border-[var(--ballpark-panel-border)]'}`}
            onClick={() => props.onChoose(card.id)}
          >
            <span className="block text-lg font-bold">{card.name}</span>
            <span className="block text-sm">{card.position} · YOUR SCOUT: {card.scoutedGrade} · RANGE {card.gradeRange} · {card.confidence.toUpperCase()} CONFIDENCE</span>
            <span className="mt-1 block text-sm font-bold">{card.scoutsCall}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
