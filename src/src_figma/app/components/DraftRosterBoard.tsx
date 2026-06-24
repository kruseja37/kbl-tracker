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
  tier: "mlb" | "farm";
  entries: DraftBoardEntry[];
  target: number;
  payroll: number;
  walletRemaining: number | null;
  priorityGaps?: BoardPriorityGap[];
  budgetWarning?: string | null;
};

type MlbSlotGroup = "FIELD" | "ROTATION" | "BULLPEN" | "DEPTH / BENCH";
type MlbSlotKind = "field" | "starter" | "reliever" | "closer" | "depth";

type MlbBoardSlot = {
  id: string;
  label: string;
  group: MlbSlotGroup;
  kind: MlbSlotKind;
};

type SlotState = {
  slot: MlbBoardSlot;
  entry: DraftBoardEntry | null;
};

export const MLB_BOARD_TARGET = 22;
export const FARM_BOARD_TARGET = 10;

export const MLB_BOARD_SLOTS: readonly MlbBoardSlot[] = [
  { id: "C", label: "C", group: "FIELD", kind: "field" },
  { id: "1B", label: "1B", group: "FIELD", kind: "field" },
  { id: "2B", label: "2B", group: "FIELD", kind: "field" },
  { id: "3B", label: "3B", group: "FIELD", kind: "field" },
  { id: "SS", label: "SS", group: "FIELD", kind: "field" },
  { id: "LF", label: "LF", group: "FIELD", kind: "field" },
  { id: "CF", label: "CF", group: "FIELD", kind: "field" },
  { id: "RF", label: "RF", group: "FIELD", kind: "field" },
  { id: "DH", label: "DH", group: "FIELD", kind: "field" },
  { id: "SP-1", label: "SP", group: "ROTATION", kind: "starter" },
  { id: "SP-2", label: "SP", group: "ROTATION", kind: "starter" },
  { id: "SP-3", label: "SP", group: "ROTATION", kind: "starter" },
  { id: "SP-4", label: "SP", group: "ROTATION", kind: "starter" },
  { id: "SP-5", label: "SP", group: "ROTATION", kind: "starter" },
  { id: "RP-1", label: "RP", group: "BULLPEN", kind: "reliever" },
  { id: "RP-2", label: "RP", group: "BULLPEN", kind: "reliever" },
  { id: "RP-3", label: "RP", group: "BULLPEN", kind: "reliever" },
  { id: "RP-4", label: "RP", group: "BULLPEN", kind: "reliever" },
  { id: "RP-5", label: "RP", group: "BULLPEN", kind: "reliever" },
  { id: "RP-6", label: "RP", group: "BULLPEN", kind: "reliever" },
  { id: "CP", label: "CP", group: "BULLPEN", kind: "closer" },
  { id: "DEPTH-BENCH", label: "DEPTH / BENCH", group: "DEPTH / BENCH", kind: "depth" },
] as const;

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

const FIELD_SLOT_IDS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;
const OUTFIELD_SLOT_IDS = ["LF", "CF", "RF"] as const;
const STARTER_SLOT_IDS = ["SP-1", "SP-2", "SP-3", "SP-4", "SP-5"] as const;
const RELIEVER_SLOT_IDS = ["RP-1", "RP-2", "RP-3", "RP-4", "RP-5", "RP-6"] as const;
const CLOSER_SLOT_IDS = ["CP"] as const;
const MLB_REQUIRED_SLOT_GROUPS: readonly MlbSlotGroup[] = ["FIELD", "ROTATION", "BULLPEN"];

function formatBoardMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function positionTokens(position: string | undefined): string[] {
  const normalized = position?.trim().toUpperCase();
  if (!normalized) return [];
  return unique([normalized, ...normalized.split("/").map((part) => part.trim()).filter(Boolean)]);
}

function displayPosition(position: string | undefined): string {
  return position?.trim().toUpperCase() || "POS";
}

function isOutfieldToken(token: string): boolean {
  return token === "LF" || token === "CF" || token === "RF" || token === "OF";
}

function isStarterCapable(tokens: readonly string[]): boolean {
  return tokens.some((token) => token === "SP" || token === "SP/RP" || token === "TWO-WAY");
}

function isBullpenCapable(tokens: readonly string[]): boolean {
  return tokens.some((token) => token === "RP" || token === "CP" || token === "SP/RP" || token === "TWO-WAY");
}

function slotPriorityForEntry(entry: DraftBoardEntry): string[] {
  const tokens = positionTokens(entry.primaryPosition);
  const priorities: string[] = [];

  if (isStarterCapable(tokens)) {
    priorities.push(...STARTER_SLOT_IDS, ...RELIEVER_SLOT_IDS, ...CLOSER_SLOT_IDS);
    return unique(priorities);
  }

  if (tokens.includes("CP")) {
    priorities.push(...CLOSER_SLOT_IDS, ...RELIEVER_SLOT_IDS);
    return unique(priorities);
  }

  if (isBullpenCapable(tokens)) {
    priorities.push(...RELIEVER_SLOT_IDS, ...CLOSER_SLOT_IDS);
    return unique(priorities);
  }

  for (const token of tokens) {
    if ((FIELD_SLOT_IDS as readonly string[]).includes(token) && !OUTFIELD_SLOT_IDS.includes(token as typeof OUTFIELD_SLOT_IDS[number])) {
      priorities.push(token);
    }
    if (isOutfieldToken(token)) {
      if (token === "LF" || token === "CF" || token === "RF") {
        priorities.push(token);
      }
      priorities.push(...OUTFIELD_SLOT_IDS);
    }
  }

  return unique(priorities);
}

function fillMlbSlots(entries: readonly DraftBoardEntry[]): { slots: SlotState[]; depthEntries: DraftBoardEntry[] } {
  const slots: SlotState[] = MLB_BOARD_SLOTS
    .filter((slot) => slot.kind !== "depth")
    .map((slot) => ({ slot, entry: null }));
  const slotById = new Map(slots.map((slotState) => [slotState.slot.id, slotState]));
  const depthEntries: DraftBoardEntry[] = [];

  for (const entry of entries) {
    const slot = slotPriorityForEntry(entry)
      .map((slotId) => slotById.get(slotId))
      .find((slotState): slotState is SlotState => Boolean(slotState && !slotState.entry));

    if (slot) {
      slot.entry = entry;
    } else {
      depthEntries.push(entry);
    }
  }

  return { slots, depthEntries };
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
  const gapLabel = label === "LF" || label === "CF" || label === "RF" ? "OF GAP" : `${label} GAP`;

  return (
    <div data-testid={testId} className="bg-[#4A6844] border-4 border-dashed border-[#FFD27A] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">{label}</span>
        <span className="text-xs text-[#E8E8D8]/60">{group}</span>
      </div>
      <div className="mt-3 text-lg font-black text-[#FFD27A]">OPEN</div>
      <div className="mt-1 text-xs text-[#E8E8D8]/60">{gapLabel}</div>
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

function MlbBoardGrid({ entries }: { entries: DraftBoardEntry[] }) {
  const { slots, depthEntries } = fillMlbSlots(entries);
  const depthSlot = MLB_BOARD_SLOTS.find((slot) => slot.kind === "depth")!;

  return (
    <div className="mt-6 space-y-6">
      {MLB_REQUIRED_SLOT_GROUPS.map((group) => {
        const groupSlots = slots.filter((slotState) => slotState.slot.group === group);
        return (
          <BoardGroup key={group} title={group}>
            {groupSlots.map(({ slot, entry }) => (
              entry ? (
                <EntryCard
                  key={slot.id}
                  entry={entry}
                  slotLabel={slot.label}
                  testId={`draft-roster-slot-${slot.id}`}
                />
              ) : (
                <GapCard
                  key={slot.id}
                  label={slot.label}
                  group={slot.group}
                  testId={`draft-roster-slot-${slot.id}`}
                />
              )
            ))}
          </BoardGroup>
        );
      })}

      <BoardGroup title={depthSlot.group}>
        {depthEntries.length > 0 ? depthEntries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            slotLabel={depthSlot.label}
            testId={`draft-roster-slot-${depthSlot.id}-${entry.id}`}
          />
        )) : (
          <GapCard label={depthSlot.label} group={depthSlot.group} testId={`draft-roster-slot-${depthSlot.id}`} />
        )}
      </BoardGroup>
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
  tier,
  entries,
  target,
  payroll,
  walletRemaining,
  priorityGaps,
  budgetWarning,
}: DraftRosterBoardProps) {
  const title = tier === "mlb" ? "MLB ROSTER VISIBILITY BOARD" : "FARM ROSTER VISIBILITY BOARD";

  return (
    <section className="mt-6 bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs text-[#E8E8D8]/60 font-bold tracking-[0.12em]">ROSTER BOARD</div>
          <h2 className="text-xl font-black">{title}</h2>
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

      {tier === "mlb" ? (
        <MlbBoardGrid entries={entries} />
      ) : (
        <FarmBoardGrid entries={entries} target={target} />
      )}
    </section>
  );
}
