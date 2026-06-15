import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, ClipboardList, RefreshCw, ShieldAlert, Shuffle, UserCheck, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  toConstructionPlayer,
  useLeagueBuilderData,
  type LeagueBuilderMlbDraftSession,
  type Player,
  type RegisteredPool,
  type Team,
  type TeamRoster,
} from "../../hooks/useLeagueBuilderData";
import {
  assessSolvency,
  buildSnakeOrder,
  shiftLuxuryCaps,
  type SolvencyAssessment,
} from "../../../engines/leagueConstruction";
import { createMlbDraftSessionId } from "../../../utils/leagueBuilderStorage";

const MLB_DRAFT_ROUNDS = 22;
const MLB_DRAFT_SEASON = 1;
const MLB_DRAFT_WORKFLOW_VERSION = "startup-mlb-draft-v1";
const MLB_DRAFT_ENGINE_METHOD_VERSION = "leagueConstruction.t8d-1";

type DraftCandidate = {
  poolPlayer: RegisteredPool["players"][number];
  player: Player;
  assessment: SolvencyAssessment | null;
};

type CommitPayloadInput = {
  leagueId: string;
  teamId: string;
  player: Player;
  roster: TeamRoster | null;
  session: LeagueBuilderMlbDraftSession;
  pick: { round: number; pick: number; teamId: string };
};

function teamDisplayName(team: Team): string {
  return team.location ? `${team.location} ${team.name}` : team.name;
}

function playerDisplayName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim() || player.id;
}

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function signalClass(signal: SolvencyAssessment["signal"]): string {
  switch (signal) {
    case "GREEN":
      return "bg-[#2F7D46] text-[#E8E8D8]";
    case "YELLOW":
      return "bg-[#C4A853] text-[#1A1A1A]";
    case "RED":
      return "bg-[#9B2F2F] text-[#FFE8B0]";
    case "BLOCKED":
      return "bg-[#4A1F1F] text-[#FFD27A]";
  }
}

function assessmentMessage(assessment: SolvencyAssessment | null): string {
  if (!assessment) return "Missing full player ratings; cannot assess.";
  if (!assessment.confirmable) {
    return `Blocked: ${formatMoney(Math.abs(assessment.slack))} short after reserving ${formatMoney(assessment.reserve)} for ${assessment.slotsRemaining} remaining slots.`;
  }
  if (assessment.signal === "RED") {
    return `High risk: ${formatMoney(assessment.slack)} slack after pick; marginal tax ${formatMoney(assessment.wouldBePickMarginalTax)}.`;
  }
  if (assessment.signal === "YELLOW") {
    return `Tax warning: marginal tax ${formatMoney(assessment.wouldBePickMarginalTax)}; slack ${formatMoney(assessment.slack)}.`;
  }
  return `Safe: ${formatMoney(assessment.slack)} slack after reserved fill.`;
}

export function createEmptyMlbDraftRoster(teamId: string): TeamRoster {
  return {
    teamId,
    mlbRoster: [],
    farmRoster: [],
    lineupWithDH: [],
    lineupWithoutDH: [],
    startingRotation: [],
    longRelievers: [],
    closingPitcher: "",
    setupPitchers: [],
    depthChart: {
      C: [],
      "1B": [],
      "2B": [],
      SS: [],
      "3B": [],
      LF: [],
      CF: [],
      RF: [],
      DH: [],
      SP: [],
      RP: [],
      CP: [],
    },
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
    lastModified: new Date().toISOString(),
  };
}

export function buildMlbDraftCommitPayloads(input: CommitPayloadInput): {
  roster: TeamRoster;
  player: Player;
  session: LeagueBuilderMlbDraftSession;
} {
  const baseRoster = input.roster ?? createEmptyMlbDraftRoster(input.teamId);
  return {
    roster: {
      ...baseRoster,
      mlbRoster: [...baseRoster.mlbRoster, input.player.id],
    },
    player: {
      ...input.player,
      leagueAssignments: [
        ...(input.player.leagueAssignments ?? []).filter((assignment) => assignment.leagueId !== input.leagueId),
        { leagueId: input.leagueId, teamId: input.teamId, rosterStatus: "MLB" },
      ],
    },
    session: {
      ...input.session,
      completedPicks: [
        ...input.session.completedPicks,
        {
          round: input.pick.round,
          pick: input.pick.pick,
          teamId: input.teamId,
          playerId: input.player.id,
        },
      ],
      currentPickIndex: input.session.currentPickIndex + 1,
    },
  };
}

export function LeagueBuilderSnakeDraft() {
  const navigate = useNavigate();
  const {
    leagues,
    teams,
    players,
    isLoading,
    error,
    refresh,
    getRoster,
    updateRoster,
    updatePlayer,
    registerLeaguePool,
    getRegisteredPool,
    getMlbDraftSession,
    saveMlbDraftSession,
  } = useLeagueBuilderData();
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [seed, setSeed] = useState("startup-mlb-v1");
  const [teamOrder, setTeamOrder] = useState<string[]>([]);
  const [pool, setPool] = useState<RegisteredPool | null>(null);
  const [session, setSession] = useState<LeagueBuilderMlbDraftSession | null>(null);
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

  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const poolById = useMemo(() => new Map((pool?.players ?? []).map((player) => [player.id, player])), [pool]);

  const loadDraftState = useCallback(async (leagueId: string) => {
    setActionError(null);
    try {
      const existingPool = await getRegisteredPool(leagueId);
      const nextPool = existingPool ?? await registerLeaguePool(leagueId);
      const nextSession = await getMlbDraftSession(leagueId, MLB_DRAFT_SEASON);
      setPool(nextPool);
      setSession(nextSession);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [getMlbDraftSession, getRegisteredPool, registerLeaguePool]);

  useEffect(() => {
    setSession(null);
    setPool(null);
    setActionError(null);
    setTeamOrder(leagueTeams.map((team) => team.id));
    if (activeLeagueId) {
      void loadDraftState(activeLeagueId);
    }
  }, [activeLeagueId, leagueTeams.length, loadDraftState]);

  const currentPick = session?.pickOrder[session.currentPickIndex] ?? null;
  const currentTeam = currentPick ? teams.find((team) => team.id === currentPick.teamId) ?? null : null;
  const completedPlayerIds = useMemo(
    () => new Set(session?.completedPicks.map((pick) => pick.playerId) ?? []),
    [session],
  );

  const completedByTeam = useMemo(() => {
    const byTeam = new Map<string, string[]>();
    for (const pick of session?.completedPicks ?? []) {
      const list = byTeam.get(pick.teamId) ?? [];
      list.push(pick.playerId);
      byTeam.set(pick.teamId, list);
    }
    return byTeam;
  }, [session]);

  const teamSummaries = useMemo(() => {
    return leagueTeams.map((team) => ({
      teamId: team.id,
      teamName: teamDisplayName(team),
      mlbCount: completedByTeam.get(team.id)?.length ?? 0,
    }));
  }, [completedByTeam, leagueTeams]);

  const draftComplete = Boolean(session && session.currentPickIndex >= session.pickOrder.length);

  const candidates = useMemo<DraftCandidate[]>(() => {
    if (!pool || !session || !currentPick || !currentTeam) return [];

    const teamPickIds = completedByTeam.get(currentPick.teamId) ?? [];
    const committedRoster = teamPickIds
      .map((playerId) => playerById.get(playerId))
      .filter(Boolean)
      .map((player) => toConstructionPlayer(player as Player));
    const committedSalaries = teamPickIds.reduce((sum, playerId) => sum + (poolById.get(playerId)?.salary ?? 0), 0);
    const caps = currentTeam.capIdentity
      ? shiftLuxuryCaps(pool.luxuryCaps, currentTeam.capIdentity)
      : pool.luxuryCaps;

    return pool.players
      .filter((poolPlayer) => !completedPlayerIds.has(poolPlayer.id))
      .map((poolPlayer) => {
        const player = playerById.get(poolPlayer.id);
        if (!player) return null;
        const remainingPoolSalaries = pool.players
          .filter((candidate) => candidate.id !== poolPlayer.id && !completedPlayerIds.has(candidate.id))
          .map((candidate) => candidate.salary);
        const assessment = assessSolvency({
          committedRoster,
          committedSalaries,
          candidate: toConstructionPlayer(player),
          candidateSalary: poolPlayer.salary,
          caps,
          mode: pool.balanceMode,
          tierCap: pool.tierCap,
          rosterSize: MLB_DRAFT_ROUNDS,
          remainingPoolSalaries,
        });
        return { poolPlayer, player, assessment };
      })
      .filter(Boolean)
      .sort((left, right) => right!.poolPlayer.iv - left!.poolPlayer.iv) as DraftCandidate[];
  }, [completedByTeam, completedPlayerIds, currentPick, currentTeam, playerById, pool, poolById, session]);

  const blockers = useMemo(() => {
    const messages: string[] = [];
    if (!activeLeagueId) messages.push("Select a league to load the MLB draft.");
    if (activeLeagueId && leagueTeams.length === 0) messages.push("Selected league has no teams.");
    if (pool && pool.players.length === 0) messages.push("RegisteredPool has no players for this league.");
    if (session && !draftComplete && !currentPick) messages.push("Draft session has no current pick.");
    if (session && !draftComplete && candidates.length === 0) messages.push("No draftable joined full Player records remain.");
    return messages;
  }, [activeLeagueId, candidates.length, currentPick, draftComplete, leagueTeams.length, pool, session]);

  const moveTeam = (teamId: string, direction: -1 | 1) => {
    const index = teamOrder.indexOf(teamId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= teamOrder.length) return;
    const next = [...teamOrder];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setTeamOrder(next);
  };

  const runAction = async (action: () => Promise<void>) => {
    setIsWorking(true);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsWorking(false);
    }
  };

  const handleStartDraft = () => runAction(async () => {
    if (!activeLeague) throw new Error("League not found");
    const nextPool = pool ?? await registerLeaguePool(activeLeague.id);
    const order = buildSnakeOrder(teamOrder.length ? teamOrder : activeLeague.teamIds, MLB_DRAFT_ROUNDS);
    const saved = await saveMlbDraftSession({
      id: createMlbDraftSessionId(activeLeague.id, MLB_DRAFT_SEASON),
      leagueId: activeLeague.id,
      seasonNumber: MLB_DRAFT_SEASON,
      seed,
      workflowVersion: MLB_DRAFT_WORKFLOW_VERSION,
      engineMethodVersion: MLB_DRAFT_ENGINE_METHOD_VERSION,
      tier: nextPool.tier,
      balanceMode: nextPool.balanceMode,
      rounds: MLB_DRAFT_ROUNDS,
      pickOrder: order,
      completedPicks: [],
      currentPickIndex: 0,
    });
    setPool(nextPool);
    setSession(saved);
  });

  const handleDraftPlayer = (playerId: string, assessment: SolvencyAssessment | null) => runAction(async () => {
    if (!activeLeague || !session || !currentPick) throw new Error("Draft session is not ready.");
    if (!assessment?.confirmable) throw new Error(assessmentMessage(assessment));
    const player = playerById.get(playerId);
    if (!player) throw new Error("Player record not found.");

    const currentRoster = await getRoster(currentPick.teamId);
    const payloads = buildMlbDraftCommitPayloads({
      leagueId: activeLeague.id,
      teamId: currentPick.teamId,
      player,
      roster: currentRoster,
      session,
      pick: currentPick,
    });

    await updateRoster(payloads.roster);
    await updatePlayer(payloads.player);
    const savedSession = await saveMlbDraftSession(payloads.session);
    setSession(savedSession);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-lg">Loading MLB draft...</div>
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
              <Shuffle className="w-6 h-6" style={{ color: "#3B7DD8" }} />
              <h1
                className="text-2xl font-bold text-[#E8E8D8] tracking-wider"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              >
                MLB SNAKE DRAFT
              </h1>
            </div>
          </div>
          {draftComplete && (
            <span className="flex items-center gap-2 bg-[#2F7D46] border-4 border-[#E8E8D8]/40 px-4 py-2 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              DRAFT COMPLETE
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

            <label htmlFor="startup-mlb-draft-league" className="block text-xs text-[#E8E8D8]/70 mb-1">LEAGUE</label>
            <select
              id="startup-mlb-draft-league"
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

            <label htmlFor="startup-mlb-draft-seed" className="block text-xs text-[#E8E8D8]/70 mb-1">DETERMINISTIC SEED</label>
            <input
              id="startup-mlb-draft-seed"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              disabled={Boolean(session)}
              className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none mb-4 disabled:opacity-60"
            />

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">TEAMS</div>
                <div className="font-bold text-xl">{leagueTeams.length}</div>
              </div>
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">ROUNDS</div>
                <div className="font-bold text-xl">{MLB_DRAFT_ROUNDS}</div>
              </div>
            </div>

            {!session && (
              <>
                <h3 className="text-sm font-bold mb-2">MLB DRAFT ORDER</h3>
                <div className="space-y-2 mb-4">
                  {teamOrder.map((teamId, index) => {
                    const team = leagueTeams.find((candidateTeam) => candidateTeam.id === teamId);
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
                  disabled={!activeLeagueId || leagueTeams.length === 0 || isWorking}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#3B7DD8] hover:bg-[#4B8DE8] disabled:opacity-50 disabled:hover:bg-[#3B7DD8] border-4 border-[#E8E8D8] transition font-bold"
                >
                  {isWorking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                  <span>{isWorking ? "STARTING" : "BEGIN MLB DRAFT"}</span>
                </button>
              </>
            )}

            {pool && (
              <div className="mt-5 bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4 text-sm text-[#E8E8D8]/80">
                <div className="font-bold text-[#FFD27A] mb-1">REGISTERED POOL</div>
                <div>Tier {pool.tier.toUpperCase()} · {pool.balanceMode.toUpperCase()}</div>
                <div>{pool.players.length.toLocaleString()} players · Cap {formatMoney(pool.tierCap)}</div>
              </div>
            )}
          </section>

          <section className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">TEAM MLB READINESS</h2>
              <div className="text-sm text-[#E8E8D8]/60">{MLB_DRAFT_ROUNDS} MLB TARGET</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teamSummaries.map((team) => (
                <div key={team.teamId} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold truncate">{team.teamName}</div>
                    <div className="text-sm font-bold">{team.mlbCount}/{MLB_DRAFT_ROUNDS} MLB</div>
                  </div>
                </div>
              ))}
            </div>

            {blockers.length ? (
              <div className="mt-5 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  BLOCKED
                </div>
                <ul className="space-y-1 text-sm text-[#FFE8B0]">
                  {blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        {session && (
          <section className="mt-6 bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">MLB DRAFT BOARD</h2>
              {currentPick && currentTeam ? (
                <div className="font-bold text-[#FFD27A]">
                  ON THE CLOCK: {teamDisplayName(currentTeam)} · Round {currentPick.round}, Pick {currentPick.pick}
                </div>
              ) : (
                <div className="font-bold text-[#9DFFB0]">DRAFT COMPLETE</div>
              )}
            </div>

            {currentPick && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto">
                {candidates.map((candidate) => (
                  <div key={candidate.player.id} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="font-bold truncate">{playerDisplayName(candidate.player)}</div>
                      <span className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">{candidate.player.primaryPosition}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#E8E8D8]/75 mb-3">
                      <div>IV {formatMoney(candidate.poolPlayer.iv)}</div>
                      <div>Salary {formatMoney(candidate.poolPlayer.salary)}</div>
                      <div>Age {candidate.player.age}</div>
                      <div>Chemistry {candidate.player.chemistry}</div>
                      <div>POW {candidate.player.power}</div>
                      <div>CON {candidate.player.contact}</div>
                      <div>VEL {candidate.player.velocity}</div>
                      <div>ACC {candidate.player.accuracy}</div>
                    </div>
                    <div className="mb-3 bg-[#2d3d2f] border-2 border-[#E8E8D8]/20 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`px-2 py-0.5 font-bold ${signalClass(candidate.assessment?.signal ?? "BLOCKED")}`}>
                          {candidate.assessment?.signal ?? "BLOCKED"}
                        </span>
                        <span className="text-[#E8E8D8]/70">
                          Slack {formatMoney(candidate.assessment?.slack ?? Number.NaN)}
                        </span>
                      </div>
                      <div className="text-[#E8E8D8]/75">{assessmentMessage(candidate.assessment)}</div>
                    </div>
                    <button
                      onClick={() => handleDraftPlayer(candidate.player.id, candidate.assessment)}
                      disabled={isWorking || !candidate.assessment?.confirmable}
                      className="w-full px-3 py-2 bg-[#2F7D46] border-4 border-[#E8E8D8] font-bold disabled:opacity-50"
                    >
                      DRAFT TO MLB
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {session?.completedPicks.length ? (
          <section className="mt-6 bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-[#FFD27A]" />
              <h2 className="font-bold text-lg">RECENT PICKS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {session.completedPicks.slice(-12).reverse().map((pick) => {
                const pickedPlayer = playerById.get(pick.playerId);
                const pickedTeam = teams.find((team) => team.id === pick.teamId);
                return (
                  <div key={`${pick.pick}-${pick.playerId}`} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3 text-sm">
                    <div className="font-bold">{pickedPlayer ? playerDisplayName(pickedPlayer) : pick.playerId}</div>
                    <div className="text-[#E8E8D8]/70">
                      Round {pick.round}, Pick {pick.pick} · {pickedPlayer?.primaryPosition ?? "UNK"}
                    </div>
                    <div className="text-[#9DFFB0] mt-1">→ {pickedTeam ? teamDisplayName(pickedTeam) : pick.teamId} MLB</div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="mt-6 bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-[#3B7DD8] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm mb-1">League Builder MLB Draft</h4>
              <p className="text-xs text-[#E8E8D8]/70">
                Draft 22 MLB players per team from the registered pool. Each confirmed pick immediately writes the team roster, the player league assignment, and the draft session cursor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
