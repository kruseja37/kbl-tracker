import type { OpposingPitcherHand } from "../../../types/managerWpa";
import {
  formatLineupSnapshotSlot,
  type LineupSnapshotComparison,
} from "../../../utils/optimalLineup";
import { formatWpaPoints } from "../../../utils/wpaDisplay";

interface OptimalLineupComparisonPanelProps {
  hand: OpposingPitcherHand;
  comparison: LineupSnapshotComparison;
  sourceConfidence?: string;
  generatedFallback?: boolean;
  onClose?: () => void;
}

function formatSignedWpa(value: number): string {
  return `${formatWpaPoints(value)} WPA`;
}

export function OptimalLineupComparisonPanel({
  hand,
  comparison,
  sourceConfidence,
  generatedFallback,
  onClose,
}: OptimalLineupComparisonPanelProps) {
  const rows = comparison.deviations.slice(0, 4);
  const hiddenCount = Math.max(0, comparison.deviations.length - rows.length);

  return (
    <div
      className="mt-3 border-2 border-[#C4A853]/60 bg-[#3A5A3A] p-3 text-[8px]"
      data-testid={`optimal-lineup-comparison-${hand}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold text-[#C4A853]">
            CURRENT VS OPTIMAL, VS {hand}HP
          </div>
          <div className="mt-1 text-[#E8E8D8]/60">
            {sourceConfidence?.replace(/_/g, " ") ?? "engine calculated"}
            {generatedFallback ? " preview" : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#E8E8D8]/60">PROJECTED GAP</div>
          <div className={comparison.projectedOpportunityCostTotal < 0 ? "text-[#FF7777]" : "text-[#40DFA0]"}>
            {formatSignedWpa(comparison.projectedOpportunityCostTotal)}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-[#E8E8D8]/30 bg-[#4A6844] px-2 py-1 text-[7px] text-[#E8E8D8] hover:border-[#C4A853]"
          >
            CLOSE
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="border-2 border-[#E8E8D8]/20 bg-[#4A6844] p-2 text-[#E8E8D8]/80">
          Current lineup matches optimal.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={`${row.chosenSlot.playerId}:${row.chosenSlot.battingOrderSlot}:${row.optimalSlot.playerId}:${row.optimalSlot.battingOrderSlot}`}
              className="grid gap-2 border-2 border-[#E8E8D8]/20 bg-[#4A6844] p-2 md:grid-cols-[1fr,1fr,auto]"
            >
              <div>
                <div className="text-[#E8E8D8]/50">CURRENT</div>
                <div className="text-[#E8E8D8]">{formatLineupSnapshotSlot(row.chosenSlot)}</div>
              </div>
              <div>
                <div className="text-[#E8E8D8]/50">OPTIMAL</div>
                <div className="text-[#E8E8D8]">{formatLineupSnapshotSlot(row.optimalSlot)}</div>
              </div>
              <div className="md:text-right">
                <div className="text-[#E8E8D8]/50">GAP</div>
                <div className={row.projectedOpportunityCost < 0 ? "text-[#FF7777]" : "text-[#40DFA0]"}>
                  {formatSignedWpa(row.projectedOpportunityCost)}
                </div>
              </div>
            </div>
          ))}
          {hiddenCount > 0 && (
            <div className="text-[#E8E8D8]/60">
              {hiddenCount} more lineup difference{hiddenCount === 1 ? "" : "s"}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
