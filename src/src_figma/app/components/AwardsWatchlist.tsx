import { useEffect, useMemo, useState } from "react";
import {
  AWARD_EMBLEMS,
  AWARD_SHORT_LABELS,
} from "../../../engines/awardEmblems";
import {
  computeFranchiseAwardsPreview,
} from "../../../utils/franchiseAwardsEngine";
import {
  getFranchiseAwardRowsByScope,
  type FranchiseAwardCategory,
  type FranchiseAwardRow,
} from "../../../utils/franchiseAwardsStorage";
import { getAllFranchisePlayers } from "../../../utils/franchisePlayerStorage";
import { listManagerProfiles } from "../../../utils/managerIdentityStorage";

const AWARD_ORDER: FranchiseAwardCategory[] = [
  "MVP",
  "CY_YOUNG",
  "ROOKIE_OF_YEAR",
  "GOLD_GLOVE",
  "SILVER_SLUGGER",
  "MANAGER_OF_YEAR",
];

const AWARD_FULL_LABELS: Record<FranchiseAwardCategory, string> = {
  MVP: "Most Valuable Player",
  CY_YOUNG: "Cy Young",
  ROOKIE_OF_YEAR: "Rookie of the Year",
  GOLD_GLOVE: "Gold Glove",
  SILVER_SLUGGER: "Silver Slugger",
  MANAGER_OF_YEAR: "Manager of the Year",
  KARA_KAWAGUCHI: "Kara Kawaguchi",
  COMEBACK_PLAYER: "Comeback Player",
  BUST_OF_YEAR: "Bust of the Year",
  ALL_STAR: "All-Star",
  BENCH_PLAYER: "Bench Player",
  BOOGER_GLOVE: "Booger Glove",
  RELIEVER_OF_YEAR: "Reliever of the Year",
};

interface AwardsWatchlistProps {
  franchiseId?: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  rivalTeamId?: string | null;
}

type AwardsMode = "finalized" | "preview" | "empty";

function formatScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "0.000";
}

function formatMargin(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0.000";
  return value > 0 ? `+${value.toFixed(3)}` : value.toFixed(3);
}

function formatOptionalNumber(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(1)
    : "N/A";
}

function sortAwardRows(rows: FranchiseAwardRow[]): FranchiseAwardRow[] {
  return [...rows].sort((left, right) => {
    const leftIndex = AWARD_ORDER.indexOf(left.category);
    const rightIndex = AWARD_ORDER.indexOf(right.category);
    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
  });
}

function displayPlayerName(player: Awaited<ReturnType<typeof getAllFranchisePlayers>>[number]): string {
  return `${player.firstName} ${player.lastName}`.trim() || player.id;
}

export function AwardsWatchlist({
  franchiseId,
  seasonId,
  statsScopeId,
  seasonNumber,
  rivalTeamId = null,
}: AwardsWatchlistProps) {
  const [rows, setRows] = useState<FranchiseAwardRow[]>([]);
  const [mode, setMode] = useState<AwardsMode>("empty");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameLookup, setNameLookup] = useState<Map<string, string>>(() => new Map());
  const [managerNameLookup, setManagerNameLookup] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    let cancelled = false;

    async function loadAwards() {
      if (!franchiseId || !seasonId || !statsScopeId) {
        setRows([]);
        setMode("empty");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [storedRows, players, managers] = await Promise.all([
          getFranchiseAwardRowsByScope({ franchiseId, seasonId, statsScopeId }),
          getAllFranchisePlayers(franchiseId).catch(() => []),
          listManagerProfiles().catch(() => []),
        ]);
        if (cancelled) return;

        setNameLookup(new Map(players.map((player) => [player.id, displayPlayerName(player)])));
        setManagerNameLookup(new Map(managers.map((manager) => [manager.managerId, manager.displayName])));

        const finalizedRows = storedRows.filter((row) => row.finalized);
        if (finalizedRows.length > 0) {
          setRows(sortAwardRows(finalizedRows));
          setMode("finalized");
          return;
        }

        const previewRows = await computeFranchiseAwardsPreview({
          franchiseId,
          seasonId,
          statsScopeId,
          seasonNumber,
        });
        if (cancelled) return;
        setRows(sortAwardRows(previewRows));
        setMode(previewRows.length > 0 ? "preview" : "empty");
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setMode("empty");
        setError(err instanceof Error ? err.message : "Unable to load awards.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAwards();

    return () => {
      cancelled = true;
    };
  }, [franchiseId, seasonId, statsScopeId, seasonNumber]);

  const rowsByCategory = useMemo(
    () => new Map(rows.map((row) => [row.category, row])),
    [rows],
  );

  const resolveName = (row: FranchiseAwardRow, id: string | null | undefined): string => {
    if (!id) return "No winner";
    if (row.category === "MANAGER_OF_YEAR") {
      return managerNameLookup.get(id) ?? id;
    }
    return nameLookup.get(id) ?? id;
  };

  return (
    <section className="bg-[var(--franchise-header)] border-[5px] border-[var(--franchise-border)] p-4" data-testid="awards-watchlist">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[14px] font-bold text-[var(--franchise-text)]">AWARDS WATCHLIST</div>
          <div className="text-[9px] text-[var(--franchise-text)]/70">
            {mode === "finalized"
              ? "Final awards from the season-end D9 awards store."
              : "Projected — finalizes at season end."}
          </div>
        </div>
        <div className={`border-[3px] px-3 py-2 text-[9px] font-bold ${
          mode === "finalized"
            ? "border-[var(--franchise-gold)] bg-[var(--franchise-gold)] text-black"
            : "border-[var(--franchise-border)] bg-[var(--franchise-panel)] text-[var(--franchise-text)]"
        }`}>
          {mode === "finalized" ? "FINALIZED" : "PROJECTED"}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[var(--franchise-panel)] border-[3px] border-[var(--franchise-border)] p-4 text-sm text-[var(--franchise-text)]/75">
          Loading awards...
        </div>
      ) : error ? (
        <div role="alert" className="bg-[var(--franchise-loss)]/20 border-[3px] border-[var(--franchise-loss)] p-4 text-sm text-[var(--franchise-text)]">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-[var(--franchise-panel)] border-[3px] border-[var(--franchise-border)] p-4 text-sm text-[var(--franchise-text)]/75">
          Projected awards are pending WAR-like season evidence.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {AWARD_ORDER.map((category) => {
            const row = rowsByCategory.get(category);
            if (!row) return null;
            const winnerName = resolveName(row, row.winnerPlayerId);
            const winnerNameClass = row.winnerTeamId && row.winnerTeamId === rivalTeamId
              ? "text-[var(--franchise-rival)]"
              : "text-[var(--franchise-text)]";

            return (
              <article
                key={category}
                className="bg-[var(--franchise-panel)] border-[4px] border-[var(--franchise-border)] p-4"
                data-testid={`award-card-${category}`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--franchise-gold)]">
                      {AWARD_EMBLEMS[category]} {AWARD_SHORT_LABELS[category]}
                    </div>
                    <div className="text-sm font-bold text-[var(--franchise-text)]">{AWARD_FULL_LABELS[category]}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] uppercase text-[var(--franchise-text)]/55">Winner</div>
                    <div className={`text-[12px] font-bold ${winnerNameClass}`} data-testid={`award-winner-${category}`}>
                      {winnerName}
                    </div>
                  </div>
                </div>

                {category === "MANAGER_OF_YEAR" && (
                  <div className="mb-3 grid grid-cols-2 gap-2 text-[9px]">
                    <div className="bg-[var(--franchise-border)] p-2">
                      <div className="text-[var(--franchise-text)]/55">Actual Wins</div>
                      <div className="text-[var(--franchise-text)]">{formatOptionalNumber(row.managerActualWins)}</div>
                    </div>
                    <div className="bg-[var(--franchise-border)] p-2">
                      <div className="text-[var(--franchise-text)]/55">Expected Wins</div>
                      <div className="text-[var(--franchise-text)]">{formatOptionalNumber(row.managerExpectedWins)}</div>
                    </div>
                  </div>
                )}

                {category === "GOLD_GLOVE" && row.goldGloveSplit && (
                  <div className="mb-3 grid grid-cols-2 gap-2 text-[9px]">
                    <div className="bg-[var(--franchise-border)] p-2">
                      <div className="text-[var(--franchise-text)]/55">fWAR Split</div>
                      <div className="text-[var(--franchise-text)]">{formatOptionalNumber(row.goldGloveSplit.fWar)}</div>
                    </div>
                    <div className="bg-[var(--franchise-border)] p-2">
                      <div className="text-[var(--franchise-text)]/55">Total WAR</div>
                      <div className="text-[var(--franchise-text)]">{formatOptionalNumber(row.goldGloveSplit.totalWar)}</div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {row.candidates.map((candidate, index) => {
                    const candidateNameClass = candidate.teamId && candidate.teamId === rivalTeamId
                      ? "text-[var(--franchise-rival)]"
                      : "text-[var(--franchise-text)]";

                    return (
                      <div
                        key={`${category}-${candidate.playerId}`}
                        className="grid grid-cols-[28px_1fr_auto_auto] items-center gap-2 bg-[var(--franchise-border)] px-3 py-2 text-[9px]"
                      >
                        <div className="text-[var(--franchise-gold)]">#{index + 1}</div>
                        <div className={`min-w-0 truncate ${candidateNameClass}`}>{resolveName(row, candidate.playerId)}</div>
                        <div className="text-[var(--franchise-text)]/70">{formatScore(candidate.score)}</div>
                        <div className={candidate.marginToWinner === 0 ? "text-[var(--franchise-gold)]" : "text-[var(--franchise-text)]/60"}>
                          {formatMargin(candidate.marginToWinner)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AwardsWatchlist;
