import type { PregameBenchmarkRow } from "../utils/pregameLineupBenchmarks";

interface PregameBenchmarkChecklistProps {
  rows: PregameBenchmarkRow[];
  actionLabel?: string;
  actionPendingLabel?: string;
  isActionPending?: boolean;
  message?: string | null;
  onAction?: () => void;
}

function statusClass(status: PregameBenchmarkRow["status"]): string {
  if (status === "official") return "border-[#40DFA0]/60 text-[#40DFA0]";
  if (status === "stale") return "border-[#C4A853]/70 text-[#C4A853]";
  return "border-[#FF7777]/65 text-[#FF7777]";
}

export function PregameBenchmarkChecklist({
  rows,
  actionLabel = "REGISTER CURRENT LINEUPS",
  actionPendingLabel = "REGISTERING...",
  isActionPending = false,
  message,
  onAction,
}: PregameBenchmarkChecklistProps) {
  const blockedRows = rows.filter((row) => row.status !== "official");
  const isBlocked = blockedRows.length > 0;

  return (
    <div
      className="mt-4 border-2 border-[#556B55] bg-[#1f2b21] p-3 text-[10px] text-[#E8E8D8]"
      data-testid="pregame-benchmark-checklist"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-bold text-[#C4A853] tracking-[0.16em]">
            LINEUP DELTA BENCHMARKS
          </div>
          <div className="mt-1 max-w-xl text-[#E8E8D8]/70">
            Register the SMB4 optimal lineup for this pitcher hand before first pitch.
            Manager Lineup Delta is tracked only from official benchmarks.
          </div>
        </div>
        <div className={isBlocked ? "text-[#FF7777]" : "text-[#40DFA0]"}>
          {isBlocked ? `${blockedRows.length} needed` : "Ready"}
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map((row) => (
          <div
            key={`${row.teamName}:${row.contextLabel}`}
            className="border-2 border-[#3d4a42] bg-[#263629] p-2"
            data-testid={`pregame-benchmark-row-${row.teamName}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="break-words font-bold text-[#E8E8D8]">{row.teamName}</div>
                <div className="mt-1 text-[#E8E8D8]/60">{row.contextLabel}</div>
              </div>
              <div className={`shrink-0 border-2 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] ${statusClass(row.status)}`}>
                {row.statusLabel}
              </div>
            </div>
            <div className="mt-2 text-[#E8E8D8]/75">
              Benchmark: <span className="text-[#F0DFC2]">{row.sourceLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {isBlocked && (
        <div className="mt-3 border-l-2 border-[#C4A853] pl-3 text-[#E8E8D8]/75">
          {blockedRows.map((row) => row.issueText).join(" • ")}
        </div>
      )}

      {onAction && isBlocked && (
        <button
          type="button"
          onClick={onAction}
          disabled={isActionPending}
          className="mt-3 border-2 border-[#C4A853] bg-[#3d4a42] px-3 py-2 text-[9px] font-bold tracking-[0.16em] text-[#C4A853] hover:bg-[#4a5a50] disabled:opacity-60"
        >
          {isActionPending ? actionPendingLabel : actionLabel}
        </button>
      )}

      {message && (
        <div className="mt-3 border-2 border-[#556B55] bg-[#1f2b21] p-2 text-[#E8E8D8]/80">
          {message}
        </div>
      )}
    </div>
  );
}
