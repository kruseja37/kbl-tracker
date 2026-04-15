import type { RunFameStanding } from "../../../utils/eliminationRunFameStorage";

import { formatFameValue, getFameColor } from "../engines/fameIntegration";

export interface RunStandingsEntry extends RunFameStanding {
  teamId: string;
  teamName: string;
  isCurrentGamePlayer: boolean;
}

interface RunStandingsTableProps {
  standings: RunStandingsEntry[];
  isLoading?: boolean;
}

function formatTeamLabel(teamName: string, teamId: string): string {
  if (teamName.trim().length > 0) {
    return teamName;
  }

  if (teamId.trim().length === 0) {
    return "Run Squad";
  }

  return teamId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function EmptyState({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="border-[4px] border-dashed border-[#5F6F57] bg-[#18211A] px-4 py-5 text-[9px] leading-5 text-[#A8B8A2] sm:text-[10px]">
      {isLoading
        ? "Loading elimination run standings..."
        : "No run Fame recorded yet. This table will fill in as the bracket run earns editorial Fame."}
    </div>
  );
}

export function buildRunStandingsEntries(
  standings: RunFameStanding[],
  currentGamePlayerIds: Set<string>,
  teamNamesById: Record<string, string>,
): RunStandingsEntry[] {
  return [...standings]
    .sort((left, right) => {
      if (right.totalFame !== left.totalFame) {
        return right.totalFame - left.totalFame;
      }

      if (right.events.length !== left.events.length) {
        return right.events.length - left.events.length;
      }

      return left.playerName.localeCompare(right.playerName);
    })
    .map((entry) => {
      const latestTeamId =
        [...entry.events].sort((left, right) => right.timestamp - left.timestamp)[0]?.playerTeam ?? "";

      return {
        ...entry,
        teamId: latestTeamId,
        teamName: formatTeamLabel(teamNamesById[latestTeamId] ?? "", latestTeamId),
        isCurrentGamePlayer: currentGamePlayerIds.has(entry.playerId),
      };
    });
}

export function RunStandingsTable({
  standings,
  isLoading = false,
}: RunStandingsTableProps) {
  return (
    <section
      className="bg-[#1f2b21] border-2 border-[#314437] p-4 mb-4 rounded-sm"
      data-testid="run-standings-table"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#C4A853]/30 pb-3">
        <div>
          <div className="text-xs text-[#C4A853] tracking-[0.3em] font-bold">
            RUN STANDINGS
          </div>
          <div className="mt-2 text-[9px] uppercase tracking-[0.18em] text-[#A8B8A2] sm:text-[10px]">
            Cumulative Fame across this elimination run
          </div>
        </div>
        <div className="text-[9px] uppercase tracking-[0.18em] text-[#CBB89C] sm:text-[10px]">
          Elimination
        </div>
      </div>

      <div className="mt-4">
        {standings.length === 0 ? (
          <EmptyState isLoading={isLoading} />
        ) : (
          <>
            <div className="hidden grid-cols-[52px_minmax(0,1.7fr)_minmax(0,1fr)_90px_90px] gap-3 border-b border-[#556B55]/60 px-3 pb-2 text-[8px] uppercase tracking-[0.18em] text-[#A8B8A2] md:grid">
              <div>Rank</div>
              <div>Player</div>
              <div>Team</div>
              <div className="text-right">Total Fame</div>
              <div className="text-right">Games</div>
            </div>

            <div className="space-y-3 md:space-y-2">
              {standings.map((entry, index) => (
                <article
                  key={`${entry.playerId}-${index}`}
                  className={`border-[3px] px-3 py-3 md:grid md:grid-cols-[52px_minmax(0,1.7fr)_minmax(0,1fr)_90px_90px] md:items-center md:gap-3 ${
                    entry.isCurrentGamePlayer
                      ? "border-[#C4A853] bg-[#243227] shadow-[0_0_0_1px_rgba(196,168,83,0.28)]"
                      : "border-[#314437] bg-[#18211A]"
                  }`}
                  data-testid={`run-standings-row-${entry.playerId}`}
                >
                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#C4A853]">
                      #{index + 1}
                    </span>
                    {entry.isCurrentGamePlayer ? (
                      <span className="inline-flex border border-[#C4A853]/60 bg-[#111814] px-2 py-1 text-[8px] uppercase tracking-[0.18em] text-[#F0DFC2] md:hidden">
                        This Game
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 min-w-0 md:mt-0">
                    <div
                      className="truncate text-sm text-[#E8E8D8]"
                      style={{ fontFamily: "'Tox Typewriter', monospace" }}
                    >
                      {entry.playerName}
                    </div>
                    {entry.isCurrentGamePlayer ? (
                      <div className="mt-1 hidden text-[8px] uppercase tracking-[0.16em] text-[#F0DFC2] md:block">
                        Featured in this game
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[#CBB89C] md:mt-0 md:text-[9px]">
                    {entry.teamName}
                  </div>

                  <div
                    className="mt-2 text-right text-base md:mt-0"
                    style={{ color: getFameColor(entry.totalFame) }}
                  >
                    {formatFameValue(entry.totalFame)}
                  </div>

                  <div className="mt-1 text-right text-[10px] uppercase tracking-[0.14em] text-[#A8B8A2] md:mt-0">
                    {entry.gamesPlayed} GP
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default RunStandingsTable;
