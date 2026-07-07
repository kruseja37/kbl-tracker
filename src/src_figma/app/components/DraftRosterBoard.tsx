import type { ReactNode } from "react";

export type DraftBoardEntry = {
  id: string;
  name: string;
  primaryPosition: string;
  secondaryPosition?: string;
  salary: number;
};

export type BoardPriorityGap = {
  id: string;
  severity: string;
  label: string;
};

export type DraftRosterBoardProps = {
  tier: "farm";
  entries: DraftBoardEntry[];
  target: number;
  payroll: number;
  walletRemaining: number | null;
  priorityGaps?: BoardPriorityGap[];
  budgetWarning?: string | null;
};

export const FARM_BOARD_TARGET = 10;

export const FARM_BOARD_SLOTS = [
  "FARM-1",
  "FARM-2",
  "FARM-3",
  "FARM-4",
  "FARM-5",
  "FARM-6",
  "FARM-7",
  "FARM-8",
  "FARM-9",
  "FARM-10",
] as const;

function formatBoardMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function displayPosition(position: string | undefined): string {
  return position?.trim().toUpperCase() || "POS";
}

function groupFarmEntries(entries: readonly DraftBoardEntry[]): Array<[string, DraftBoardEntry[]]> {
  const groups = new Map<string, DraftBoardEntry[]>();
  for (const entry of entries) {
    const position = displayPosition(entry.primaryPosition);
    groups.set(position, [...(groups.get(position) ?? []), entry]);
  }

  return [...groups.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}

function EntryCard({ entry, slotLabel, testId }: { entry: DraftBoardEntry; slotLabel: string; testId?: string }) {
  const positions = unique([entry.primaryPosition, entry.secondaryPosition].filter(Boolean).map(displayPosition));

  return (
    <div data-testid={testId} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">{slotLabel}</span>
        <span className="text-xs text-[#E8E8D8]/60">{formatBoardMoney(entry.salary)}</span>
      </div>
      <div className="mt-3 font-bold leading-tight">{entry.name}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {positions.length > 0 ? positions.map((position) => (
          <span key={position} className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">
            {position}
          </span>
        )) : (
          <span className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">POS</span>
        )}
      </div>
    </div>
  );
}

function GapCard({ label, group, testId }: { label: string; group: string; testId?: string }) {
  return (
    <div data-testid={testId} className="bg-[#4A6844] border-4 border-dashed border-[#FFD27A] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">{label}</span>
        <span className="text-xs text-[#E8E8D8]/60">{group}</span>
      </div>
      <div className="mt-3 text-lg font-black text-[#FFD27A]">OPEN</div>
      <div className="mt-1 text-xs text-[#E8E8D8]/60">{label} GAP</div>
    </div>
  );
}

function BoardGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs text-[#E8E8D8]/60 font-bold tracking-[0.12em]">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
    </div>
  );
}

function BoardAlerts({
  priorityGaps,
  budgetWarning,
}: {
  priorityGaps?: BoardPriorityGap[];
  budgetWarning?: string | null;
}) {
  const hasPriorityGaps = Boolean(priorityGaps?.length);
  if (!hasPriorityGaps && !budgetWarning) return null;

  return (
    <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,auto)]">
      {hasPriorityGaps && (
        <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <div className="text-xs text-[#E8E8D8]/60 font-bold tracking-[0.12em]">PRIORITY GAPS</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {priorityGaps!.map((gap) => (
              <span
                key={gap.id}
                data-testid={`draft-roster-priority-gap-${gap.id}`}
                className="bg-[#3B7DD8] border-2 border-[#E8E8D8]/30 px-2 py-1 text-xs font-bold"
              >
                {gap.severity.toUpperCase()} · {gap.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {budgetWarning && (
        <div
          role="alert"
          data-testid="draft-roster-budget-warning"
          className="bg-[#6B3A3A] border-4 border-[#FFD27A] p-4 text-sm font-bold text-[#FFE8B0]"
        >
          {budgetWarning}
        </div>
      )}
    </div>
  );
}

function FarmBoardGrid({ entries, target }: { entries: DraftBoardEntry[]; target: number }) {
  const groups = groupFarmEntries(entries);
  const openCount = Math.max(0, target - entries.length);
  const openSlots = FARM_BOARD_SLOTS.slice(0, openCount);

  return (
    <div className="mt-6 space-y-6">
      {groups.map(([position, positionEntries]) => (
        <BoardGroup key={position} title={position}>
          {positionEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              slotLabel={position}
              testId={`draft-roster-farm-entry-${entry.id}`}
            />
          ))}
        </BoardGroup>
      ))}

      {openSlots.length > 0 && (
        <BoardGroup title="OPEN FARM SLOTS">
          {openSlots.map((slotId, index) => (
            <GapCard
              key={slotId}
              label={`FARM ${index + 1}`}
              group="FARM"
              testId={`draft-roster-slot-${slotId}`}
            />
          ))}
        </BoardGroup>
      )}
    </div>
  );
}

export function DraftRosterBoard({
  entries,
  target,
  payroll,
  walletRemaining,
  priorityGaps,
  budgetWarning,
}: DraftRosterBoardProps) {
  return (
    <section className="mt-6 bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs text-[#E8E8D8]/60 font-bold tracking-[0.12em]">ROSTER BOARD</div>
          <h2 className="text-xl font-black">FARM ROSTER VISIBILITY BOARD</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px]">
          <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
            <div className="text-xs text-[#E8E8D8]/60">SLOTS FILLED</div>
            <div className="mt-1 text-2xl font-black">{entries.length}/{target} slots</div>
          </div>
          <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
            <div className="text-xs text-[#E8E8D8]/60">RUNNING PAYROLL</div>
            <div className="mt-1 text-2xl font-black">{formatBoardMoney(payroll)}</div>
          </div>
          <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
            <div className="text-xs text-[#E8E8D8]/60">WALLET REMAINING</div>
            <div className="mt-1 text-2xl font-black">{formatBoardMoney(walletRemaining)}</div>
          </div>
        </div>
      </div>

      <BoardAlerts priorityGaps={priorityGaps} budgetWarning={budgetWarning} />
      <FarmBoardGrid entries={entries} target={target} />
    </section>
  );
}
