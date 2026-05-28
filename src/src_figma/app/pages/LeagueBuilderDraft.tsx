import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, FileText, RefreshCw, ShieldAlert, Shuffle, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useLeagueBuilderData,
  type Player,
  type Team,
} from "../../hooks/useLeagueBuilderData";
import {
  applyLeagueBuilderStartupFarmDraft,
  createLeagueBuilderStartupFarmDraftPreview,
  STARTUP_FARM_TARGET_SIZE,
  type ApplyStartupFarmDraftReport,
  type LeagueBuilderStartupFarmDraftPreview,
} from "../../../utils/leagueBuilderStartupFarmDraft";

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

export function LeagueBuilderDraft() {
  const navigate = useNavigate();
  const { leagues, teams, players, isLoading, error, refresh } = useLeagueBuilderData();
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [seed, setSeed] = useState("startup-farm-v1");
  const [preview, setPreview] = useState<LeagueBuilderStartupFarmDraftPreview | null>(null);
  const [applyReport, setApplyReport] = useState<ApplyStartupFarmDraftReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!activeLeagueId && leagues.length > 0) {
      setActiveLeagueId(leagues[0].id);
    }
  }, [activeLeagueId, leagues]);

  useEffect(() => {
    setPreview(null);
    setApplyReport(null);
  }, [activeLeagueId]);

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
      };
    });
  }, [activeLeagueId, leagueTeams, players]);

  const displayTeams = preview?.teams ?? currentTeamCounts;
  const canGenerate = Boolean(activeLeagueId && leagueTeams.length > 0 && !isGenerating && !isApplying);
  const canApply = Boolean(preview?.valid && !preview.prepared && preview.selectedPicks.length > 0 && !isApplying);

  const handleGenerate = async () => {
    if (!activeLeagueId) return;
    setIsGenerating(true);
    setApplyReport(null);
    try {
      const nextPreview = await createLeagueBuilderStartupFarmDraftPreview(activeLeagueId, {
        seasonNumber: 1,
        rounds: STARTUP_FARM_TARGET_SIZE,
        seed: seed.trim() || undefined,
      });
      setPreview(nextPreview);
    } catch (err) {
      setPreview({
        workflowVersion: "league-builder-startup-farm-draft-v1",
        engineMethodVersion: "league-builder-startup-prospect-scouting-draft-v1",
        leagueId: activeLeagueId,
        seasonNumber: 1,
        rounds: STARTUP_FARM_TARGET_SIZE,
        seed,
        valid: false,
        prepared: false,
        totalVacancies: 0,
        blockers: [err instanceof Error ? err.message : "Failed to generate startup farm draft."],
        warnings: [],
        limitations: [],
        teams: [],
        selectedPicks: [],
        visibleReports: [],
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    setIsApplying(true);
    try {
      const report = await applyLeagueBuilderStartupFarmDraft(preview);
      setApplyReport(report);
      if (report.applied) {
        await refresh();
        const updatedPreview = await createLeagueBuilderStartupFarmDraftPreview(activeLeagueId, {
          seasonNumber: preview.seasonNumber,
          rounds: preview.rounds,
          seed: preview.seed,
        });
        setPreview(updatedPreview);
      }
    } finally {
      setIsApplying(false);
    }
  };

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
      <div className="max-w-6xl mx-auto">
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
                STARTUP FARM DRAFT
              </h1>
            </div>
          </div>
        </div>

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
              className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none mb-4"
            />

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">TEAMS</div>
                <div className="font-bold text-xl">{leagueTeams.length}</div>
              </div>
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">TARGET</div>
                <div className="font-bold text-xl">{STARTUP_FARM_TARGET_SIZE} FARM</div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#7733DD] hover:bg-[#6622CC] disabled:opacity-50 disabled:hover:bg-[#7733DD] border-4 border-[#E8E8D8] transition font-bold"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              <span>{isGenerating ? "GENERATING" : "GENERATE STARTUP FARM DRAFT"}</span>
            </button>

            {leagueTeams.length === 0 && (
              <p className="text-sm text-[#FFD27A] mt-4">Selected league has no teams.</p>
            )}

            {canApply && (
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-[#2F7D46] hover:bg-[#3E9959] disabled:opacity-50 border-4 border-[#E8E8D8] transition font-bold"
              >
                {isApplying ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                <span>{isApplying ? "APPLYING" : "APPLY DRAFT TO LEAGUE BUILDER"}</span>
              </button>
            )}

            {applyReport && (
              <div className={`mt-4 border-4 p-3 text-sm ${applyReport.applied ? "bg-[#2F7D46] border-[#E8E8D8]/40" : "bg-[#6B3A3A] border-[#FFD27A]"}`}>
                {applyReport.applied
                  ? `Applied ${applyReport.createdPlayerIds.length} FARM prospects.`
                  : applyReport.issues.join(" ")}
                {applyReport.rollbackErrors.length > 0 && (
                  <div className="mt-2 text-[#FFD27A]">{applyReport.rollbackErrors.join(" ")}</div>
                )}
              </div>
            )}
          </section>

          <section className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">TEAM FARM READINESS</h2>
              {preview?.prepared && (
                <span className="flex items-center gap-2 text-sm font-bold text-[#9DFFB0]">
                  <CheckCircle2 className="w-4 h-4" />
                  PREPARED
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayTeams.map((team) => (
                <div key={team.teamId} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold truncate">{team.teamName}</div>
                    <div className="text-sm font-bold">{team.farmCount}/{STARTUP_FARM_TARGET_SIZE} FARM</div>
                  </div>
                  <div className="text-xs text-[#E8E8D8]/70 mt-1">
                    MLB {team.mlbCount} · Missing FARM {team.missingFarm}
                  </div>
                </div>
              ))}
            </div>

            {preview?.blockers.length ? (
              <div className="mt-5 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  BLOCKED
                </div>
                <ul className="space-y-1 text-sm text-[#FFE8B0]">
                  {preview.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview?.prepared && (
              <div className="mt-5 bg-[#2F7D46] border-4 border-[#E8E8D8]/40 p-4 text-sm">
                This league already has 10 FARM players per team. Franchise Setup can validate and copy this prepared League Builder state.
              </div>
            )}

            {preview && !preview.prepared && preview.valid && (
              <div className="mt-5 bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-[#E8E8D8]/60">PICKS</div>
                    <div className="font-bold text-xl">{preview.selectedPicks.length}</div>
                  </div>
                  <div>
                    <div className="text-[#E8E8D8]/60">SEED</div>
                    <div className="font-bold truncate">{preview.seed}</div>
                  </div>
                  <div>
                    <div className="text-[#E8E8D8]/60">ENGINE</div>
                    <div className="font-bold text-xs">{preview.engineMethodVersion}</div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">VISIBLE SCOUTING REPORTS</h2>
            <div className="text-sm text-[#E8E8D8]/60">{preview?.visibleReports.length ?? 0} reports</div>
          </div>

          {!preview || preview.visibleReports.length === 0 ? (
            <div className="text-center py-10 text-[#E8E8D8]/60">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              Generate a startup farm draft to review visible scouting reports.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[540px] overflow-y-auto">
              {preview.visibleReports.map((report) => (
                <div key={report.playerId} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="font-bold truncate">{report.playerName}</div>
                    <span className="bg-[#7733DD] px-2 py-0.5 text-xs font-bold">{report.position}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#E8E8D8]/75">
                    <div>Round {report.round}</div>
                    <div>Pick {report.pickNumber}</div>
                    <div>Scouted {report.scoutedGrade}</div>
                    <div>Potential {report.potentialGrade}</div>
                    <div>Confidence {report.scoutConfidence}</div>
                    <div>Salary ${report.salary.toFixed(1)}M</div>
                  </div>
                  <div className="mt-3 text-xs text-[#E8E8D8]/70">
                    <div className="font-bold text-[#E8E8D8]">{report.scoutName}</div>
                    <div>Specialties: {report.scoutSpecialtiesVisible.join(", ") || "None"}</div>
                    <div>Weaknesses: {report.scoutWeaknessesVisible.join(", ") || "None"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-[#7733DD] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm mb-1">League Builder Startup Farm Draft</h4>
              <p className="text-xs text-[#E8E8D8]/70">
                Drafted players are saved into League Builder FARM rosters with hidden reveal state. Franchise Setup remains the validation and copy step for prepared League Builder state.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
