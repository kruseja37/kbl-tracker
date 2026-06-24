import { useState, useCallback, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { parseSeasonNumberFromSeasonId } from "../utils/franchiseOffseasonGuards";
import {
  FRANCHISE_RATINGS_SALARY_CALCULATION_VERSION,
  runFranchiseRatingsSalaryRecalculation,
  type FranchiseRatingsSalaryAdapterData,
} from "../../../utils/franchiseRatingsSalaryAdapter";
import type { FranchiseOffseasonAdapterIssue } from "../../../utils/franchiseOffseasonAdapters";

interface RatingsAdjustmentFlowProps {
  seasonId: string;
  franchiseId?: string;
  onClose: () => void;
}

export function RatingsAdjustmentFlow({ seasonId, franchiseId, onClose }: RatingsAdjustmentFlowProps) {
  const seasonNumber = parseSeasonNumberFromSeasonId(seasonId);

  const [franchisePreviewData, setFranchisePreviewData] = useState<FranchiseRatingsSalaryAdapterData | null>(null);
  const [franchisePreviewIssues, setFranchisePreviewIssues] = useState<FranchiseOffseasonAdapterIssue[]>([]);
  const [franchisePreviewLoading, setFranchisePreviewLoading] = useState(false);
  const [franchisePreviewError, setFranchisePreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!franchiseId) return;

    let cancelled = false;
    setFranchisePreviewLoading(true);
    setFranchisePreviewError(null);

    runFranchiseRatingsSalaryRecalculation(
      {
        franchiseId,
        seasonId,
        seasonNumber,
        offseasonStateId: `offseason-${seasonId}`,
        phase: "RATINGS_ADJUSTMENTS",
        dryRun: true,
      },
      { dryRun: true },
    )
      .then((result) => {
        if (cancelled) return;
        setFranchisePreviewData(result.data ?? null);
        setFranchisePreviewIssues(result.issues ?? []);
        if (!result.success) {
          setFranchisePreviewError(result.message || "Ratings/salary preview failed validation.");
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setFranchisePreviewData(null);
        setFranchisePreviewIssues([]);
        setFranchisePreviewError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setFranchisePreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [franchiseId, seasonId, seasonNumber]);

  if (franchiseId) {
    return (
      <FranchiseRatingsSalaryDryRunSurface
        franchiseId={franchiseId}
        seasonId={seasonId}
        seasonNumber={seasonNumber}
        data={franchisePreviewData}
        issues={franchisePreviewIssues}
        isLoading={franchisePreviewLoading}
        error={franchisePreviewError}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#1F2A36] border-[5px] border-[#C4A853] p-6 text-center">
        <div className="text-xl text-[#E8E8D8] mb-2">Ratings adjustment not available</div>
        <div className="text-sm text-[#E8E8D8]/75 mb-6">
          Ratings adjustment is only available inside a franchise.
        </div>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-[#4A4A4A] hover:bg-[#5A5A5A] text-[#E8E8D8] px-5 py-3 border-[3px] border-[#C4A853] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Offseason Hub</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function formatPreviewSalary(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return `$${value.toFixed(1)}M`;
}

function FranchiseRatingsSalaryDryRunSurface({
  franchiseId,
  seasonId,
  seasonNumber,
  data,
  issues,
  isLoading,
  error,
  onClose,
}: {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  data: FranchiseRatingsSalaryAdapterData | null;
  issues: FranchiseOffseasonAdapterIssue[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const proposals = data?.proposals ?? [];
  const changedCount = data?.changedPlayerIds.length ?? 0;
  const [showConfirm, setShowConfirm] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyData, setApplyData] = useState<FranchiseRatingsSalaryAdapterData | null>(null);
  const [applyIssues, setApplyIssues] = useState<FranchiseOffseasonAdapterIssue[]>([]);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySucceeded, setApplySucceeded] = useState(false);

  const handleApplyConfirmed = useCallback(async () => {
    setIsApplying(true);
    setApplyError(null);
    setApplyIssues([]);
    setApplyData(null);
    setApplySucceeded(false);

    try {
      const result = await runFranchiseRatingsSalaryRecalculation(
        {
          franchiseId,
          seasonId,
          seasonNumber,
          offseasonStateId: `offseason-${seasonId}`,
          phase: "RATINGS_ADJUSTMENTS",
          dryRun: false,
        },
        { apply: true },
      );

      setApplyData(result.data ?? null);
      setApplyIssues(result.issues ?? []);
      setApplySucceeded(result.success);
      if (!result.success) {
        setApplyError(result.message || "Ratings/salary update failed.");
      }
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : String(error));
      setApplySucceeded(false);
    } finally {
      setIsApplying(false);
      setShowConfirm(false);
    }
  }, [franchiseId, seasonId, seasonNumber]);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto mb-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[#E8E8D8] hover:text-[#DD0000] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Offseason Hub</span>
          </button>
          <div className="text-center">
            <div className="text-xl text-[#E8E8D8]">RATINGS/SALARY PREVIEW</div>
            <div className="text-xs text-[#E8E8D8]/60">Season {seasonNumber} → Season {seasonNumber + 1}</div>
          </div>
          <div className="w-40" />
        </div>

        <div className="max-w-6xl mx-auto space-y-4">
          <div className="bg-[#253C5A] border-[5px] border-[#C4A853] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl text-[#E8E8D8] mb-2">Preview first, explicit commit required</div>
                <div className="text-sm text-[#E8E8D8]/80">
                  Franchise Mode v1 previews app-native grade and salary recalculation before any commit. Raw ratings are not changed.
                </div>
                <div className="text-xs text-[#E8E8D8]/60 mt-2">
                  Method: <span className="font-mono">{data?.calculationVersion ?? FRANCHISE_RATINGS_SALARY_CALCULATION_VERSION}</span>
                </div>
                <div className="text-xs text-[#E8E8D8]/60 mt-1">
                  Boundary: grade/salary preview only, not the full true-value or 50% salary-delta offseason model.
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl text-[#F5D06F] font-bold">{changedCount}</div>
                <div className="text-xs text-[#E8E8D8]/70">changed players</div>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="bg-[#1F2A36] border-[4px] border-[#C4A853] p-4 text-[#E8E8D8]">
              Loading franchise ratings/salary preview...
            </div>
          )}

          {error && (
            <div className="bg-[#7A341F] border-[4px] border-[#C4A853] p-4 text-sm text-[#E8E8D8]">
              {error}
            </div>
          )}

          {issues.length > 0 && (
            <div className="bg-[#3A2F1F] border-[4px] border-[#C4A853] p-4">
              <div className="text-lg text-[#F5D06F] mb-2">Preview warnings and validation notes</div>
              <IssueList issues={issues} />
            </div>
          )}

          {showConfirm && (
            <div className="bg-[#253C5A] border-[5px] border-[#F5D06F] p-5">
              <div className="text-xl text-[#E8E8D8] mb-2">Confirm grade/salary update</div>
              <div className="text-sm text-[#E8E8D8]/80">
                This will re-run validation and then apply the current adapter output to {changedCount} franchise-owned players.
              </div>
              <div className="text-xs text-[#E8E8D8]/65 mt-3">
                Method: <span className="font-mono">{data?.calculationVersion ?? FRANCHISE_RATINGS_SALARY_CALCULATION_VERSION}</span>
              </div>
              <div className="text-xs text-[#E8E8D8]/65 mt-1">Raw ratings are not changed.</div>
              <div className="text-xs text-[#E8E8D8]/65 mt-1">
                This is not the full true-value or 50% salary-delta offseason model.
              </div>
              {issues.length > 0 && (
                <div className="mt-4 bg-black/25 border border-[#E8E8D8]/20 p-3">
                  <div className="text-sm text-[#F5D06F] mb-2">Warnings carried into confirmation</div>
                  <IssueList issues={issues} />
                </div>
              )}
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isApplying}
                  className="bg-[#4A4A4A] hover:bg-[#5A5A5A] disabled:opacity-60 text-[#E8E8D8] px-5 py-3 border-[3px] border-[#C4A853] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyConfirmed}
                  disabled={isApplying || changedCount === 0}
                  className="bg-[#6B9462] hover:bg-[#7AA872] disabled:opacity-60 text-[#E8E8D8] px-5 py-3 border-[3px] border-[#C4A853] transition-colors"
                >
                  {isApplying ? "Applying..." : "Apply confirmed grade/salary update"}
                </button>
              </div>
            </div>
          )}

          {(applySucceeded || applyError || applyIssues.length > 0 || applyData) && (
            <div className={`border-[5px] p-5 ${applySucceeded ? "bg-[#234D34] border-[#6B9462]" : "bg-[#7A341F] border-[#C4A853]"}`}>
              <div className="text-xl text-[#E8E8D8] mb-2">Apply result</div>
              {applySucceeded && (
                <div className="text-sm text-[#E8E8D8]/85">
                  Updated {applyData?.appliedPlayerIds.length ?? 0} franchise-owned players.
                </div>
              )}
              {applyError && (
                <div className="text-sm text-[#E8E8D8]/85">{applyError}</div>
              )}
              {applyData?.rollbackStatus && (
                <div className="text-xs text-[#E8E8D8]/70 mt-2">
                  Rollback status: <span className="font-mono">{applyData.rollbackStatus}</span>. Compensating rollback is not true cross-store atomicity.
                </div>
              )}
              {applyData?.rollbackErrors?.length ? (
                <div className="mt-3 text-xs text-[#E8E8D8]/80">
                  <div className="text-[#F5D06F] mb-1">Rollback error details</div>
                  {applyData.rollbackErrors.map((rollbackError) => (
                    <div key={`${rollbackError.playerId}-${rollbackError.message}`} className="font-mono">
                      {rollbackError.playerId}: {rollbackError.message}
                    </div>
                  ))}
                </div>
              ) : null}
              {applyIssues.length > 0 && (
                <div className="mt-3">
                  <IssueList issues={applyIssues} />
                </div>
              )}
            </div>
          )}

          <div className="bg-[#1F2A36] border-[5px] border-[#C4A853] p-5">
            <div className="text-xl text-[#E8E8D8] mb-3">Player proposals</div>
            {proposals.length === 0 && !isLoading ? (
              <div className="text-sm text-[#E8E8D8]/70">No grade or salary changes are currently proposed.</div>
            ) : (
              <div className="space-y-2">
                {proposals.slice(0, 50).map((proposal) => (
                  <div
                    key={proposal.playerId}
                    className="grid grid-cols-[1.5fr_1fr_1fr] gap-3 bg-black/25 border border-[#E8E8D8]/15 p-3 text-sm"
                  >
                    <div>
                      <div className="text-[#E8E8D8] font-bold">
                        {proposal.before.firstName} {proposal.before.lastName}
                      </div>
                      <div className="text-xs text-[#E8E8D8]/55">{proposal.before.primaryPosition} · {proposal.playerId}</div>
                    </div>
                    <div className="text-[#E8E8D8]/85">
                      Grade: <span className="font-bold">{proposal.before.overallGrade ?? "N/A"}</span>
                      {" → "}
                      <span className="font-bold text-[#F5D06F]">{proposal.after.overallGrade ?? "N/A"}</span>
                    </div>
                    <div className="text-[#E8E8D8]/85">
                      Salary: <span className="font-bold">{formatPreviewSalary(proposal.before.salary)}</span>
                      {" → "}
                      <span className="font-bold text-[#F5D06F]">{formatPreviewSalary(proposal.after.salary)}</span>
                    </div>
                  </div>
                ))}
                {proposals.length > 50 && (
                  <div className="text-xs text-[#E8E8D8]/60">Showing first 50 of {proposals.length} proposals.</div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            {!applySucceeded && (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={isLoading || Boolean(error) || changedCount === 0}
                className="bg-[#6B9462] hover:bg-[#7AA872] disabled:opacity-60 text-[#E8E8D8] px-6 py-3 border-[3px] border-[#C4A853] transition-colors"
              >
                Confirm grade/salary update
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-[#4A4A4A] hover:bg-[#5A5A5A] text-[#E8E8D8] px-6 py-3 border-[3px] border-[#C4A853] transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueList({ issues }: { issues: FranchiseOffseasonAdapterIssue[] }) {
  return (
    <div className="space-y-2">
      {issues.map((issue, index) => (
        <div key={`${issue.code}-${index}`} className="text-sm text-[#E8E8D8]/85">
          <span className="font-mono text-xs text-[#E8E8D8]/60">{issue.severity.toUpperCase()} · {issue.code}</span>
          <div>{issue.message}</div>
        </div>
      ))}
    </div>
  );
}
