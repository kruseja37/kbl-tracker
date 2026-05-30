import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, ClipboardList, RefreshCw, ShieldAlert, Shuffle, UserCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useLeagueBuilderData,
  type Player,
  type Team,
} from "../../hooks/useLeagueBuilderData";
import {
  confirmLeagueBuilderProspectPick,
  createLeagueBuilderStartupDraftSession,
  draftLeagueBuilderScout,
  getLeagueBuilderStartupDraftView,
  STARTUP_FARM_TARGET_SIZE,
  STARTUP_SCOUTS_PER_TEAM,
  type LeagueBuilderStartupDraftView,
  type StartupProspectBoardCandidate,
} from "../../../utils/leagueBuilderStartupFarmDraft";
import type { LeagueBuilderScoutProfile } from "../../../utils/leagueBuilderStorage";

function hasAssignment(player: Player, leagueId: string, teamId: string, rosterStatus: "MLB" | "FARM"): boolean {
  return Boolean(player.leagueAssignments?.some((assignment) =>
    assignment.leagueId === leagueId &&
    assignment.teamId === teamId &&
    assignment.rosterStatus === rosterStatus,
  ));
}

function teamDisplayName(team: Team): string {
  return team.location ? `${team.location} ${team.name}` : team.name;
}

function formatAccuracy(scout: LeagueBuilderScoutProfile): string {
  const highlights = Object.entries(scout.accuracyByPosition)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([position, accuracy]) => `${position} ${accuracy}%`);
  return highlights.join(" · ");
}

export function LeagueBuilderDraft() {
  const navigate = useNavigate();
  const { leagues, teams, players, isLoading, error, refresh } = useLeagueBuilderData();
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [seed, setSeed] = useState("startup-farm-v1");
  const [teamOrder, setTeamOrder] = useState<string[]>([]);
  const [draftView, setDraftView] = useState<LeagueBuilderStartupDraftView | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeLeagueId && leagues.length > 0) {
      setActiveLeagueId(leagues[0].id);
    }
  }, [activeLeagueId, leagues]);

  const activeLeague = useMemo(
    () => leagues.find((league) => league.id === activeLeagueId) ?? null,
    [activeLeagueId, leagues],
  );

  const leagueTeams = useMemo(() => {
    if (!activeLeague?.teamIds?.length) return [];
    return activeLeague.teamIds
      .map((teamId) => teams.find((team) => team.id === teamId))
      .filter(Boolean) as Team[];
  }, [activeLeague, teams]);

  useEffect(() => {
    setDraftView(null);
    setActionError(null);
    setTeamOrder(leagueTeams.map((team) => team.id));
    if (!activeLeagueId) return;
    getLeagueBuilderStartupDraftView(activeLeagueId)
      .then(setDraftView)
      .catch((err) => setActionError(err instanceof Error ? err.message : String(err)));
  }, [activeLeagueId, leagueTeams.length]);

  const currentTeamCounts = useMemo(() => {
    return leagueTeams.map((team) => {
      const farmCount = players.filter((player) => hasAssignment(player, activeLeagueId, team.id, "FARM")).length;
      const mlbCount = players.filter((player) => hasAssignment(player, activeLeagueId, team.id, "MLB")).length;
      return {
        teamId: team.id,
        teamName: teamDisplayName(team),
        farmCount,
        mlbCount,
        missingFarm: Math.max(0, STARTUP_FARM_TARGET_SIZE - farmCount),
        scoutCount: 0,
        prepared: farmCount === STARTUP_FARM_TARGET_SIZE,
      };
    });
  }, [activeLeagueId, leagueTeams, players]);

  const displayTeams = draftView?.teams.length ? draftView.teams : currentTeamCounts;
  const scoutDraftComplete = draftView?.scoutDraftComplete === true;
  const prospectDraftComplete = draftView?.prospectDraftComplete === true;
  const prepared = draftView?.prepared === true;
  const normalScoutRestartBlocked = Boolean(draftView?.blockers.some((blocker) =>
    blocker.toLowerCase().includes("normal startup scout draft restart is blocked"),
  ));
  const showStartControls = !draftView?.session && !prepared && !normalScoutRestartBlocked;
  const canStart = Boolean(activeLeagueId && leagueTeams.length > 0 && !isWorking);

  const moveTeam = (teamId: string, direction: -1 | 1) => {
    const index = teamOrder.indexOf(teamId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= teamOrder.length) return;
    const next = [...teamOrder];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setTeamOrder(next);
  };

  const runAction = async (action: () => Promise<LeagueBuilderStartupDraftView>) => {
    setIsWorking(true);
    setActionError(null);
    try {
      const nextView = await action();
      setDraftView(nextView);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsWorking(false);
    }
  };

  const handleStartDraft = () => runAction(() =>
    createLeagueBuilderStartupDraftSession({
      leagueId: activeLeagueId,
      seasonNumber: 1,
      seed,
      scoutOrder: teamOrder,
    }),
  );

  const handleHireScout = (scoutId: string) => runAction(() =>
    draftLeagueBuilderScout({ leagueId: activeLeagueId, seasonNumber: 1, scoutId }),
  );

  const handleDraftProspect = (candidateId: string) => runAction(() =>
    confirmLeagueBuilderProspectPick({ leagueId: activeLeagueId, seasonNumber: 1, candidateId }),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-lg">Loading startup farm draft...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-xl text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              aria-label="Back to League Builder"
              onClick={() => navigate("/league-builder")}
              className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <ArrowLeft className="w-6 h-6 text-[#E8E8D8]" />
            </button>
            <div className="flex items-center gap-3 bg-[#5A8352] border-[6px] border-[#E8E8D8] px-8 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
              <Shuffle className="w-6 h-6" style={{ color: "#7733DD" }} />
              <h1
                className="text-2xl font-bold text-[#E8E8D8] tracking-wider"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              >
                STARTUP SCOUT + PROSPECT DRAFT
              </h1>
            </div>
          </div>
          {prepared && (
            <span className="flex items-center gap-2 bg-[#2F7D46] border-4 border-[#E8E8D8]/40 px-4 py-2 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              PREPARED
            </span>
          )}
        </div>

        {actionError && (
          <div className="mb-6 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4 text-[#FFE8B0] font-bold">
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <section className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <h2 className="font-bold mb-4 text-lg">LEAGUE BUILDER SETUP</h2>

            <label htmlFor="startup-farm-draft-league" className="block text-xs text-[#E8E8D8]/70 mb-1">LEAGUE</label>
            <select
              id="startup-farm-draft-league"
              value={activeLeagueId}
              onChange={(event) => setActiveLeagueId(event.target.value)}
              className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none mb-4"
            >
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>

            <label htmlFor="startup-farm-draft-seed" className="block text-xs text-[#E8E8D8]/70 mb-1">DETERMINISTIC SEED</label>
            <input
              id="startup-farm-draft-seed"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              disabled={Boolean(draftView?.session)}
              className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none mb-4 disabled:opacity-60"
            />

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">TEAMS</div>
                <div className="font-bold text-xl">{leagueTeams.length}</div>
              </div>
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">SCOUTS</div>
                <div className="font-bold text-xl">{STARTUP_SCOUTS_PER_TEAM}/TEAM</div>
              </div>
            </div>

            {showStartControls && (
              <>
                <h3 className="text-sm font-bold mb-2">SCOUT DRAFT ORDER</h3>
                <div className="space-y-2 mb-4">
                  {teamOrder.map((teamId, index) => {
                    const team = leagueTeams.find((candidate) => candidate.id === teamId);
                    return (
                      <div key={teamId} className="bg-[#4A6844] border-2 border-[#E8E8D8]/30 p-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-bold truncate">#{index + 1} {team ? teamDisplayName(team) : teamId}</span>
                        <span className="flex gap-1">
                          <button className="px-2 bg-[#2d3d2f] border border-[#E8E8D8]/30" onClick={() => moveTeam(teamId, -1)}>UP</button>
                          <button className="px-2 bg-[#2d3d2f] border border-[#E8E8D8]/30" onClick={() => moveTeam(teamId, 1)}>DOWN</button>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={handleStartDraft}
                  disabled={!canStart}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#7733DD] hover:bg-[#6622CC] disabled:opacity-50 disabled:hover:bg-[#7733DD] border-4 border-[#E8E8D8] transition font-bold"
                >
                  {isWorking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                  <span>{isWorking ? "STARTING" : "BEGIN SCOUT DRAFT"}</span>
                </button>
              </>
            )}

            {!draftView?.session && (prepared || normalScoutRestartBlocked) && (
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4 text-sm text-[#E8E8D8]/80">
                Startup scout/FARM state is already durable for this league. Normal scout draft restart is blocked in v1; Franchise Setup will validate and copy the prepared League Builder state.
              </div>
            )}

            {leagueTeams.length === 0 && (
              <p className="text-sm text-[#FFD27A] mt-4">Selected league has no teams.</p>
            )}
          </section>

          <section className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">TEAM FARM READINESS</h2>
              <div className="text-sm text-[#E8E8D8]/60">{STARTUP_FARM_TARGET_SIZE} FARM TARGET</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayTeams.map((team) => {
                const scouts = draftView?.session?.hiredScoutIdsByTeamId[team.teamId]?.length ?? team.scoutCount ?? 0;
                return (
                  <div key={team.teamId} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-bold truncate">{team.teamName}</div>
                      <div className="text-sm font-bold">{team.farmCount}/{STARTUP_FARM_TARGET_SIZE} FARM</div>
                    </div>
                    <div className="text-xs text-[#E8E8D8]/70 mt-1">
                      MLB {team.mlbCount} · Missing FARM {team.missingFarm} · Scouts {scouts}/{STARTUP_SCOUTS_PER_TEAM}
                    </div>
                  </div>
                );
              })}
            </div>

            {draftView?.blockers.length ? (
              <div className="mt-5 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  BLOCKED
                </div>
                <ul className="space-y-1 text-sm text-[#FFE8B0]">
                  {draftView.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {prepared && (
              <div className="mt-5 bg-[#2F7D46] border-4 border-[#E8E8D8]/40 p-4 text-sm">
                League Builder is prepared: each team has two hired scouts and 10 hidden-safe FARM prospects. Franchise Setup can validate and copy this state.
              </div>
            )}
          </section>
        </div>

        {draftView?.session && !scoutDraftComplete && (
          <section className="mt-6 bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">SCOUT DRAFT</h2>
              <div className="font-bold text-[#FFD27A]">
                ON THE CLOCK: {draftView.currentScoutPick?.teamName ?? draftView.currentScoutPick?.teamId}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto">
              {draftView.availableScouts.map((scout) => (
                <div key={scout.id} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                  <div className="font-bold text-lg mb-2">{scout.name}</div>
                  <div className="text-xs text-[#E8E8D8]/75 space-y-1 mb-3">
                    <div>Specialties: {scout.specialties.join(", ")}</div>
                    <div>Weaknesses: {scout.weaknesses.join(", ")}</div>
                    <div>Accuracy: {formatAccuracy(scout)}</div>
                  </div>
                  <button
                    onClick={() => handleHireScout(scout.id)}
                    disabled={isWorking}
                    className="w-full px-3 py-2 bg-[#2F7D46] border-4 border-[#E8E8D8] font-bold disabled:opacity-50"
                  >
                    HIRE SCOUT
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {draftView?.session && scoutDraftComplete && (
          <section className="mt-6 bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">PROSPECT DRAFT BOARD</h2>
              {draftView.currentProspectPick ? (
                <div className="font-bold text-[#FFD27A]">
                  ON THE CLOCK: {draftView.currentProspectPick.teamName ?? draftView.currentProspectPick.teamId}
                </div>
              ) : (
                <div className="font-bold text-[#9DFFB0]">DRAFT COMPLETE</div>
              )}
            </div>

            {draftView.currentProspectPick && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto">
                {draftView.prospectBoard.map((candidate: StartupProspectBoardCandidate) => (
                  <div key={candidate.candidateId} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="font-bold truncate">{candidate.playerName}</div>
                      <span className="bg-[#7733DD] px-2 py-0.5 text-xs font-bold">{candidate.position}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#E8E8D8]/75 mb-3">
                      <div>Potential {candidate.potentialGrade}</div>
                      <div>Age {candidate.age}</div>
                      <div>Chemistry {candidate.chemistry}</div>
                      <div>Personality {candidate.personality}</div>
                      <div>Salary ${candidate.salary.toFixed(1)}M</div>
                      <div>Traits {[candidate.trait1, candidate.trait2].filter(Boolean).join(", ") || "None"}</div>
                    </div>
                    <div className="space-y-2 mb-3">
                      {candidate.reports.map((report) => (
                        <div key={report.scoutId} className="bg-[#2d3d2f] border-2 border-[#E8E8D8]/20 p-2 text-xs">
                          <div className="font-bold">{report.scoutName}</div>
                          <div>Scouted {report.scoutedGrade} · {report.scoutConfidence} · {report.scoutAccuracy}%</div>
                          <div>Specialties: {report.scoutSpecialtiesVisible.join(", ")}</div>
                          <div>Weaknesses: {report.scoutWeaknessesVisible.join(", ")}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => handleDraftProspect(candidate.candidateId)}
                      disabled={isWorking}
                      className="w-full px-3 py-2 bg-[#2F7D46] border-4 border-[#E8E8D8] font-bold disabled:opacity-50"
                    >
                      DRAFT TO FARM
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {draftView?.completedPicks.length ? (
          <section className="mt-6 bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-[#FFD27A]" />
              <h2 className="font-bold text-lg">RECENT PICKS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {draftView.completedPicks.slice(-12).reverse().map((pick) => (
                <div key={pick.playerId} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3 text-sm">
                  <div className="font-bold">{pick.playerName}</div>
                  <div className="text-[#E8E8D8]/70">
                    Round {pick.round}, Pick {pick.pickNumber} · {pick.position} · Scouted {pick.scoutedGrade} · Potential {pick.potentialGrade}
                  </div>
                  <div className="text-[#9DFFB0] mt-1">→ {pick.teamName ?? pick.teamId} FARM</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-[#7733DD] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm mb-1">League Builder Startup Draft</h4>
              <p className="text-xs text-[#E8E8D8]/70">
                Hire two scouts for every team, then draft prospects one pick at a time. Only the team on the clock sees its own scouts' reports. True ratings and hidden personality modifiers stay hidden until call-up.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
