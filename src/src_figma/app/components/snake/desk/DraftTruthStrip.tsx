import type { RosterNeedBreakdown } from '../../../../../engines/rosterNeed';
import type { ChemistryStripRow, DraftMoneyLedger } from './draftTruthModel';

function money(value: number | null): string {
  return value === null ? '—' : `$${Math.round(value).toLocaleString()}`;
}

export function ChemistryStrip({ rows, label }: { rows: readonly ChemistryStripRow[]; label: string }) {
  return (
    <div aria-label={label} className="grid grid-cols-5 gap-1">
      {rows.map((row) => (
        <div key={row.family} className="border-2 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-well)] px-1 py-2 text-center">
          <p className="truncate text-[9px] font-black uppercase text-[var(--ballpark-brass)]">{row.word}</p>
          <p className="text-xs font-black">{row.count === null ? '—' : row.count} · {row.tier ?? '—'}</p>
        </div>
      ))}
    </div>
  );
}

export function DraftTruthStrip(props: {
  title: string;
  ledger: DraftMoneyLedger;
  chemistry: readonly ChemistryStripRow[];
  testId?: string;
}) {
  return (
    <section className="border-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-panel)] p-3" data-testid={props.testId}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-black tracking-[0.14em] text-[var(--ballpark-brass)]">{props.title}</h3>
        <span className="text-xs font-black">{props.ledger.rosterCount}/22</span>
      </div>
      <div className="mb-2 grid grid-cols-4 gap-1 text-center">
        <div><p className="text-[9px] font-bold">SALARY</p><strong className="text-xs">{money(props.ledger.salary)}</strong></div>
        <div><p className="text-[9px] font-bold">TAX</p><strong className="text-xs">{money(props.ledger.tax)}</strong></div>
        <div><p className="text-[9px] font-bold">ALL-IN</p><strong className="text-xs">{money(props.ledger.allIn)}</strong></div>
        <div><p className="text-[9px] font-bold">MONEY LEFT</p><strong className="text-xs">{money(props.ledger.moneyLeft)}</strong></div>
      </div>
      <ChemistryStrip rows={props.chemistry} label={`${props.title} chemistry`} />
    </section>
  );
}

export function AssistantGmStatusRow(props: {
  need: RosterNeedBreakdown;
  chemistry: readonly ChemistryStripRow[];
  showHelp: boolean;
}) {
  const shapeTone = props.need.infeasible
    ? 'border-[var(--ballpark-warn-border)] text-[var(--ballpark-warn-text)]'
    : props.need.minimumAdditions === 0
      ? 'border-[var(--ballpark-status-green)] text-[var(--ballpark-status-green)]'
      : 'border-[var(--ballpark-brass)] text-[var(--ballpark-brass)]';
  const highestTier = props.chemistry.some((row) => row.tier === 'L3')
    ? 'L3'
    : props.chemistry.some((row) => row.tier === 'L2') ? 'L2' : 'L1';
  return (
    <section className="mb-3 border-2 border-[var(--ballpark-panel-border)] p-2" aria-label="Assistant GM status">
      <div className="flex flex-wrap items-center gap-1 text-[10px] font-black">
        <span className="mr-1 text-[var(--ballpark-brass)]">ASST GM</span>
        <span className={`border-2 px-2 py-1 ${shapeTone}`}>SHAPE {props.need.infeasible ? 'BLOCKED' : `${props.need.minimumAdditions} OPEN`}</span>
        <span className="border-2 border-[var(--ballpark-panel-border)] px-2 py-1">C {props.need.catcherCoverNeed}</span>
        <span className="border-2 border-[var(--ballpark-panel-border)] px-2 py-1">ROT {props.need.rotationDeficit}</span>
        <span className="border-2 border-[var(--ballpark-panel-border)] px-2 py-1">PEN {props.need.bullpenDeficit}</span>
        <span className="border-2 border-[var(--ballpark-panel-border)] px-2 py-1">CP {props.need.closerDeficit}</span>
        <span className="border-2 border-[var(--ballpark-panel-border)] px-2 py-1">CHEM {highestTier}</span>
      </div>
      {props.showHelp ? (
        <p className="mt-2 border-l-4 border-[var(--ballpark-brass)] bg-[var(--ballpark-well)] px-3 py-2 text-xs">
          SHAPE READS THE CANONICAL ROSTER REQUIREMENTS. CHEM SHOWS THE HIGHEST CURRENT FAMILY TIER.
        </p>
      ) : null}
    </section>
  );
}
