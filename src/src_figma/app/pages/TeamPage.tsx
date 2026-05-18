import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import {
  getArchiveInstanceMode,
  getManagerTeamTenures,
  getTeamRosterFromGames,
  type AlmanacInstanceMode,
  type ManagerTeamTenureAggregate,
} from "../../../utils/almanacQueries";
import {
  resolveEliminationTeamIdentity,
  resolveLiveTeamIdentity,
  type AlmanacTeamIdentity,
} from "../../../utils/almanacTeamIdentity";
import {
  getTeamImpactSummary,
  type PlayerImpactSummary,
  type RoleWpaBreakdown,
  type TeamImpactMode,
  type TeamImpactSummary,
} from "../../../utils/teamImpact";

interface RosterEntry {
  playerId: string;
  playerName: string;
  canonicalId: string;
  instanceId: string;
  games: number;
}

const IMPACT_ROLE_KEYS: Array<Exclude<keyof RoleWpaBreakdown, "total">> = [
  "batting",
  "pitching",
  "fielding",
  "baserunning",
  "catching",
];

function isTeamImpactMode(mode: AlmanacInstanceMode): mode is TeamImpactMode {
  return mode === "exhibition" || mode === "elimination";
}

function formatWpa(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  const rounded = value.toFixed(3);
  return value > 0 ? `+${rounded}` : rounded;
}

function formatPoints(value: number): string {
  return `${value} ${value === 1 ? "PT" : "PTS"}`;
}

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}TH`;
  const mod10 = value % 10;
  if (mod10 === 1) return `${value}ST`;
  if (mod10 === 2) return `${value}ND`;
  if (mod10 === 3) return `${value}RD`;
  return `${value}TH`;
}

function formatRank(rank: number, teamCount: number): string {
  if (rank <= 0 || teamCount <= 0) return "UNRANKED";
  return `${ordinal(rank)} OF ${teamCount}`;
}

function formatRoleLabel(role: Exclude<keyof RoleWpaBreakdown, "total">): string {
  if (role === "baserunning") return "BASERUNNING";
  return role.toUpperCase();
}

function hasPlayerWpaDetail(summary: TeamImpactSummary): boolean {
  return (
    summary.dataQuality.fullKblWpaGames > 0 ||
    summary.dataQuality.legacyAtBatWpaGames > 0
  );
}

function hasFullPlayerWpaDetail(summary: TeamImpactSummary): boolean {
  return summary.dataQuality.fullKblWpaGames > 0;
}

function renderPlayContext(label: string, play: PlayerImpactSummary["biggestPositivePlay"]) {
  if (!play) return null;
  return (
    <div className="mt-1 text-[8px] leading-4 text-[#8F96A3]">
      <span className="text-[#2D7A46]">{label}: {formatWpa(play.value)}</span>
      {" - "}
      {play.label}
      {play.inningLabel ? ` (${play.inningLabel})` : ""}
    </div>
  );
}

function TeamImpactPanel({
  summary,
  mode,
  loading,
  error,
}: {
  summary: TeamImpactSummary | null;
  mode: AlmanacInstanceMode;
  loading: boolean;
  error: string | null;
}) {
  const supported = isTeamImpactMode(mode);
  const hasAnyWpa = summary ? hasPlayerWpaDetail(summary) : false;
  const hasFullWpa = summary ? hasFullPlayerWpaDetail(summary) : false;
  const leaders = summary?.playerLeaders.slice(0, 5) ?? [];

  return (
    <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(45,122,70,0.35)] sm:p-8">
      <h2 className="mb-5 text-xs text-[#2D7A46]">TEAM IMPACT</h2>

      {!supported ? (
        <p className="text-[10px] leading-5 text-[#8F96A3]">
          TEAM IMPACT IS NOT AVAILABLE FOR FRANCHISE TEAM PAGES YET.
        </p>
      ) : loading ? (
        <p className="text-[10px] leading-5 text-[#8F96A3]">LOADING TEAM IMPACT...</p>
      ) : error ? (
        <p className="text-[10px] leading-5 text-[#FF9A9A]">
          TEAM IMPACT COULD NOT LOAD. {error}
        </p>
      ) : !summary ? (
        <p className="text-[10px] leading-5 text-[#8F96A3]">
          NO TEAM IMPACT SUMMARY AVAILABLE FOR THIS INSTANCE YET.
        </p>
      ) : (
        <div className="space-y-5">
          {summary.dataQuality.warnings.length > 0 && (
            <div className="border-4 border-[#7A622D] bg-black/30 p-4">
              <div className="mb-2 text-[9px] text-[#D6B25E]">DATA QUALITY</div>
              <div className="space-y-2 text-[9px] leading-4 text-[#D6B25E]">
                {summary.dataQuality.warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border-4 border-[#2B2B2B] bg-black/30 p-4">
              <div className="text-[9px] text-[#8F96A3]">
                {hasAnyWpa ? (hasFullWpa ? "TEAM WPA" : "LIMITED WPA") : "TEAM WPA"}
              </div>
              {hasAnyWpa ? (
                <>
                  <div className="mt-2 text-xl text-white">{formatWpa(summary.playerWpa.total)}</div>
                  <div className="mt-2 text-[9px] leading-4 text-[#8F96A3]">
                    {formatRank(summary.benchmarks.totalPlayerWpaRank, summary.benchmarks.teamCount)}
                    {" | INSTANCE AVG "}
                    {formatWpa(summary.benchmarks.instanceAverageTotalPlayerWpa)}
                    {" | "}
                    {formatWpa(summary.benchmarks.perGameTotalPlayerWpa)}
                    {" PER GAME"}
                  </div>
                  <div className="mt-3 text-[9px] leading-4 text-[#2D7A46]">
                    {summary.benchmarks.identityLabel.toUpperCase()}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-[10px] leading-5 text-[#8F96A3]">
                  PLAYER WPA DETAIL IS UNAVAILABLE FOR THIS TEAM.
                </p>
              )}
            </div>

            <div className="border-4 border-[#2B2B2B] bg-black/30 p-4">
              <div className="text-[9px] text-[#8F96A3]">MANAGER VALUE</div>
              <div className="mt-2 text-xl text-white">{formatWpa(summary.managerWpa.managerValue)}</div>
              <div className="mt-2 grid gap-2 text-[8px] leading-4 text-[#8F96A3] sm:grid-cols-3">
                <div>TACTICAL {formatWpa(summary.managerWpa.tacticalManagerWpa)}</div>
                <div>DEPLOY {formatWpa(summary.managerWpa.deploymentWpa)}</div>
                <div>LINEUP {formatWpa(summary.managerWpa.lineupDeltaWpa)}</div>
              </div>
            </div>
          </div>

          {hasFullWpa ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {IMPACT_ROLE_KEYS.map((role) => (
                <div key={role} className="border-4 border-[#2B2B2B] bg-black/30 p-3">
                  <div className="text-[8px] text-[#8F96A3]">{formatRoleLabel(role)} WPA</div>
                  <div className="mt-2 text-[11px] text-white">{formatWpa(summary.playerWpa[role])}</div>
                </div>
              ))}
            </div>
          ) : summary.dataQuality.legacyAtBatWpaGames > 0 ? (
            <div className="border-4 border-[#2B2B2B] bg-black/30 p-4 text-[9px] leading-4 text-[#8F96A3]">
              LEGACY BATTING WPA {formatWpa(summary.playerWpa.batting)} IS AVAILABLE, BUT FULL ROLE BUCKETS AND ROLE AWARDS ARE LIMITED.
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[0.9fr,1.1fr]">
            <div className="border-4 border-[#2B2B2B] bg-black/30 p-4">
              <div className="text-[9px] text-[#8F96A3]">POG POINTS</div>
              <div className="mt-2 text-xl text-white">{formatPoints(summary.pog.points)}</div>
              <div className="mt-2 text-[9px] leading-4 text-[#8F96A3]">
                {formatRank(summary.pog.rank, summary.pog.teamCount)}
                {" | OVERALL "}
                {summary.pog.overallWins}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[8px] leading-4 text-[#8F96A3]">
                <div>BEST HITTER {summary.pog.bestHitter}</div>
                <div>BEST PITCHER {summary.pog.bestPitcher}</div>
                <div>BEST BASERUNNER {summary.pog.bestBaserunner}</div>
                <div>BEST FIELDER {summary.pog.bestFielder}</div>
                <div>BEST MANAGER {summary.pog.bestManagerWins}</div>
              </div>
              {summary.pog.mostDecoratedPlayer ? (
                <div className="mt-3 text-[9px] leading-4 text-[#2D7A46]">
                  MOST DECORATED: {summary.pog.mostDecoratedPlayer.playerName.toUpperCase()}, {formatPoints(summary.pog.mostDecoratedPlayer.points)}
                </div>
              ) : null}
            </div>

            <div className="border-4 border-[#2B2B2B] bg-black/30 p-4">
              <div className="mb-3 text-[9px] text-[#8F96A3]">PLAYER IMPACT LEADERS</div>
              {leaders.length === 0 ? (
                <p className="text-[10px] leading-5 text-[#8F96A3]">
                  NO PLAYER IMPACT LEADERS AVAILABLE FOR THIS TEAM YET.
                </p>
              ) : (
                <div className="space-y-3">
                  {leaders.map((leader) => (
                    <div
                      key={leader.playerId}
                      data-testid={`team-impact-player-${leader.playerId}`}
                      className="border-b border-[#2B2B2B] pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="flex flex-wrap justify-between gap-3 text-[9px] leading-4">
                        <span className="text-white">{leader.playerName}</span>
                        <span className="text-[#2D7A46]">{formatPoints(leader.pogPoints)}</span>
                      </div>
                      {hasAnyWpa ? (
                        <div className="mt-2 text-[8px] leading-4 text-[#8F96A3]">
                          TOTAL {formatWpa(leader.wpa.total)}
                          {" | BAT "}
                          {formatWpa(leader.wpa.batting)}
                          {" | PIT "}
                          {formatWpa(leader.wpa.pitching)}
                          {" | FIELD "}
                          {formatWpa(leader.wpa.fielding + leader.wpa.catching)}
                          {" | RUN "}
                          {formatWpa(leader.wpa.baserunning)}
                          {" | "}
                          {formatWpa(leader.perGameWpa)}
                          {" PER GAME"}
                        </div>
                      ) : null}
                      {renderPlayContext("BEST PLAY", leader.biggestPositivePlay)}
                      {renderPlayContext("COSTLIEST", leader.biggestNegativePlay)}
                      {typeof leader.highLeverageWpa === "number" ? (
                        <div className="mt-1 text-[8px] leading-4 text-[#8F96A3]">
                          HIGH LEVERAGE WPA {formatWpa(leader.highLeverageWpa)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TeamPage() {
  const { leagueId, runId, teamId } = useParams<{
    leagueId?: string;
    runId?: string;
    teamId?: string;
  }>();
  const instanceId = runId ?? leagueId;
  const [team, setTeam] = useState<AlmanacTeamIdentity | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [managerTenures, setManagerTenures] = useState<ManagerTeamTenureAggregate[]>([]);
  const [instanceMode, setInstanceMode] = useState<AlmanacInstanceMode>("exhibition");
  const [loading, setLoading] = useState(true);
  const [teamImpact, setTeamImpact] = useState<TeamImpactSummary | null>(null);
  const [impactLoading, setImpactLoading] = useState(true);
  const [impactError, setImpactError] = useState<string | null>(null);

  useEffect(() => {
    if (!instanceId || !teamId) return;

    let cancelled = false;

    async function load() {
      const [rosterData, resolvedMode] = await Promise.all([
        getTeamRosterFromGames(instanceId!, teamId!),
        getArchiveInstanceMode(instanceId!),
      ]);
      const routeIndicatesElimination =
        Boolean(runId) || (!resolvedMode && /^elim(?:ination)?[-_]/i.test(instanceId!));
      const mode = resolvedMode ?? (routeIndicatesElimination ? "elimination" : "exhibition");
      const [teamData, tenureData] = await Promise.all([
        mode === "elimination"
          ? resolveEliminationTeamIdentity(instanceId!, teamId!)
          : resolveLiveTeamIdentity(teamId!),
        getManagerTeamTenures({
          mode,
          instanceId: instanceId!,
          teamId: teamId!,
        }),
      ]);

      if (!cancelled) {
        setTeam(teamData);
        setRoster(rosterData);
        setManagerTenures(tenureData);
        setInstanceMode(mode);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [instanceId, runId, teamId]);

  useEffect(() => {
    if (!instanceId || !teamId || loading) return;

    if (!isTeamImpactMode(instanceMode)) {
      setTeamImpact(null);
      setImpactError(null);
      setImpactLoading(false);
      return;
    }

    let cancelled = false;

    async function loadImpact() {
      try {
        setImpactLoading(true);
        setImpactError(null);
        const summary = await getTeamImpactSummary(instanceMode as TeamImpactMode, instanceId!, teamId!);
        if (!cancelled) {
          setTeamImpact(summary ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setTeamImpact(null);
          setImpactError(err instanceof Error ? err.message : "Failed to load Team Impact.");
        }
      } finally {
        if (!cancelled) setImpactLoading(false);
      }
    }

    void loadImpact();
    return () => { cancelled = true; };
  }, [instanceId, teamId, instanceMode, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-['Press_Start_2P'] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl text-center pt-20 text-[10px] text-[#8F96A3]">
          LOADING...
        </div>
      </div>
    );
  }

  const teamName = team?.name ?? teamId ?? "Unknown Team";
  const stadium = team?.stadium ?? "Unknown Stadium";
  const primaryColor = team?.colors?.primary ?? "#3366FF";
  const secondaryColor = team?.colors?.secondary ?? "#DD0000";
  const formatSigned = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
  const backLink =
    instanceMode === "elimination"
      ? "/almanac/elimination"
      : instanceMode === "franchise"
        ? "/almanac"
        : "/almanac/exhibition";
  const backLabel =
    instanceMode === "elimination"
      ? "ELIMINATION"
      : instanceMode === "franchise"
        ? "ALMANAC"
        : "EXHIBITION";

  return (
    <div className="min-h-screen bg-black text-white font-['Press_Start_2P'] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to={backLink}
            className="inline-flex items-center gap-3 border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-white" />
            {backLabel}
          </Link>
        </div>

        {/* Team Info */}
        <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-8">
          {/* Color accent bar */}
          <div
            data-testid="team-color-accent"
            className="mb-5 h-3 w-full"
            style={{
              background: `linear-gradient(90deg, ${primaryColor} 50%, ${secondaryColor} 50%)`,
            }}
          />

          <div className="flex items-center gap-5">
            {team?.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={`${teamName} logo`}
                className="h-16 w-16 shrink-0 object-contain"
              />
            ) : null}
            <div>
              <h1 className="text-sm leading-6 text-white sm:text-base">
                {teamName.toUpperCase()}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-[#8F96A3]">
                {team?.abbreviation ? <span>{team.abbreviation.toUpperCase()}</span> : null}
                <span>{stadium.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        <TeamImpactPanel
          summary={teamImpact}
          mode={instanceMode}
          loading={impactLoading}
          error={impactError}
        />

        <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-8">
          <h2 className="mb-5 text-xs text-[#2D7A46]">MANAGER TENURE</h2>

          {managerTenures.length === 0 ? (
            <p className="text-[10px] leading-5 text-[#8F96A3]">
              NO COMMITTED MANAGER RECORDS FOR THIS TEAM YET.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b-2 border-[#2D7A46] text-[9px] text-[#8F96A3]">
                    <th className="pb-3 pr-6">MANAGER</th>
                    <th className="pb-3 pr-6 text-right">W-L</th>
                    <th className="pb-3 pr-6 text-right">DEC</th>
                    <th className="pb-3 pr-6 text-right">TACTICAL</th>
                    <th className="pb-3 pr-6 text-right">DEPLOY</th>
                    <th className="pb-3 pr-6 text-right">LINEUP</th>
                    <th className="pb-3 pr-6 text-right">VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  {managerTenures.map((entry) => (
                    <tr
                      key={`${entry.managerId}-${entry.mode}-${entry.instanceId}`}
                      className="border-b border-[#2B2B2B]"
                    >
                      <td className="py-3 pr-6 text-white">{entry.managerName}</td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">
                        {entry.wins}-{entry.losses}
                      </td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">
                        {entry.decisionCount}
                      </td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">
                        {formatSigned(entry.tacticalManagerWpa)}
                      </td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">
                        {formatSigned(entry.deploymentWpa)}
                      </td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">
                        {formatSigned(entry.lineupDeltaWpa)}
                      </td>
                      <td className="py-3 pr-6 text-right text-white">
                        {formatSigned(entry.managerValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Roster */}
        <div className="border-[6px] border-[#2B2B2B] bg-[#101010] p-5 shadow-[8px_8px_0px_0px_rgba(51,102,255,0.35)] sm:p-8">
          <h2 className="mb-5 text-xs text-[#3366FF]">ROSTER</h2>

          {roster.length === 0 ? (
            <p className="text-[10px] leading-5 text-[#8F96A3]">
              NO GAMES RECORDED FOR THIS TEAM YET.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b-2 border-[#3366FF] text-[9px] text-[#8F96A3]">
                    <th className="pb-3 pr-6">PLAYER</th>
                    <th className="pb-3 pr-6 text-right">GP</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((entry) => (
                    <tr key={entry.playerId} className="border-b border-[#2B2B2B]">
                      <td className="py-3 pr-6">
                        <Link
                          to={`/almanac/players/${entry.canonicalId}/${entry.instanceId}`}
                          className="text-[#3366FF] transition hover:text-white"
                        >
                          {entry.playerName}
                        </Link>
                      </td>
                      <td className="py-3 pr-6 text-right text-[#E8E8D8]">{entry.games}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
