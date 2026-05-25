import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic2 } from "lucide-react";
import type { BeatReporter } from "../../../types/reporter";
import type { ReporterAssignmentTeam } from "../../../utils/reporterAssignment";
import {
  assignReporterToTeam,
  autoGenerateReporterForTeam,
} from "../../../utils/reporterAssignment";
import {
  getReporterForTeam,
  listReporters,
} from "../../../utils/reporterStorage";

export interface ReporterAssignmentPanelTeam {
  label: string;
  team: ReporterAssignmentTeam;
}

interface ReporterAssignmentPanelProps {
  leagueId?: string;
  teams: ReporterAssignmentPanelTeam[];
  liveEnabled: boolean;
  onLiveEnabledChange: (enabled: boolean) => void;
  postGameEnabled: boolean;
  onPostGameEnabledChange: (enabled: boolean) => void;
}

function ReporterAvatar({ reporter }: { reporter: BeatReporter }) {
  return (
    <div
      className="h-12 w-12 shrink-0 border-2 border-[#E8E8D8] bg-[#1f2b21] flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.35)]"
      style={{ color: reporter.avatarColors.secondary }}
      aria-label={`${reporter.name} avatar`}
    >
      <div
        className="h-7 w-7 rounded-full border-2 flex items-center justify-center"
        style={{
          backgroundColor: reporter.avatarColors.primary,
          borderColor: reporter.avatarColors.secondary,
        }}
      >
        <Mic2 className="h-4 w-4" />
      </div>
    </div>
  );
}

export function ReporterAssignmentPanel({
  leagueId,
  teams,
  liveEnabled,
  onLiveEnabledChange,
  postGameEnabled,
  onPostGameEnabledChange,
}: ReporterAssignmentPanelProps) {
  // Either toggle being on means we still want reporter assignments made.
  const enabled = liveEnabled || postGameEnabled;
  const [assignedReporters, setAssignedReporters] = useState<Record<string, BeatReporter | null>>({});
  const [availableReporters, setAvailableReporters] = useState<BeatReporter[]>([]);
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshRequestIdRef = useRef(0);

  const teamIds = useMemo(() => teams.map(({ team }) => team.id).join("|"), [teams]);
  const visibleTeamIds = useMemo(
    () => new Set(teams.map(({ team }) => team.id)),
    [teams],
  );

  const getReporterAssignedTeamId = useCallback(
    (reporterId: string, currentTeamId: string): string | null => {
      for (const [teamId, reporter] of Object.entries(assignedReporters)) {
        if (teamId !== currentTeamId && reporter?.id === reporterId) {
          return teamId;
        }
      }

      const reporter = availableReporters.find((entry) => entry.id === reporterId);
      if (
        reporter?.teamId &&
        reporter.teamId !== "unassigned" &&
        reporter.teamId !== currentTeamId &&
        visibleTeamIds.has(reporter.teamId)
      ) {
        return reporter.teamId;
      }

      return null;
    },
    [assignedReporters, availableReporters, visibleTeamIds],
  );

  const refreshReporters = useCallback(async () => {
    const requestId = (refreshRequestIdRef.current += 1);
    const [reporters, assignments] = await Promise.all([
      listReporters({ leagueId }),
      Promise.all(
        teams.map(async ({ team }) => [
          team.id,
          await getReporterForTeam(team.id, leagueId),
        ] as const),
      ),
    ]);

    if (requestId !== refreshRequestIdRef.current) return;
    setAvailableReporters(reporters);
    setAssignedReporters(Object.fromEntries(assignments));
  }, [leagueId, teams]);

  useEffect(() => {
    let cancelled = false;
    refreshReporters().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Reporter assignments failed to load.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshReporters, teamIds]);

  const handleGenerate = async (team: ReporterAssignmentTeam) => {
    if (!enabled) return;
    refreshRequestIdRef.current += 1;
    setBusyTeamId(team.id);
    setError(null);
    try {
      await autoGenerateReporterForTeam(team, leagueId);
      await refreshReporters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reporter could not be generated.");
    } finally {
      setBusyTeamId(null);
    }
  };

  const handleAssign = async (teamId: string, reporterId: string) => {
    if (!enabled || !reporterId) return;
    if (getReporterAssignedTeamId(reporterId, teamId)) {
      setError("That reporter is already assigned to the other team.");
      return;
    }
    refreshRequestIdRef.current += 1;
    setBusyTeamId(teamId);
    setError(null);
    try {
      const assigned = await assignReporterToTeam(reporterId, teamId);
      setAssignedReporters((current) => {
        const next = { ...current };
        for (const existingTeamId of Object.keys(next)) {
          if (next[existingTeamId]?.id === reporterId) {
            next[existingTeamId] = null;
          }
        }
        next[teamId] = assigned;
        return next;
      });
      setAvailableReporters((current) =>
        current.map((reporter) =>
          reporter.id === assigned.id ? assigned : reporter,
        ),
      );
      await refreshReporters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reporter could not be assigned.");
    } finally {
      setBusyTeamId(null);
    }
  };

  return (
    <section className="border-2 border-[#556B55] bg-[#3d4a42] p-4 space-y-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]">
      <div>
        <div className="text-sm text-[#C4A853] font-bold tracking-[0.2em]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.6)" }}>
          BEAT REPORTERS
        </div>
        <div className="text-xs text-[#a0a898] mt-1">
          Assign a reporter to each team. Two independent toggles control
          historical in-game tidbits and the post-game newspaper columns.
        </div>
      </div>

      <div className="space-y-2">
        {[
          {
            key: "live",
            label: "Historical In-Game Tidbits",
            value: liveEnabled,
            onChange: onLiveEnabledChange,
          },
          {
            key: "post",
            label: "Post-game columns",
            value: postGameEnabled,
            onChange: onPostGameEnabledChange,
          },
        ].map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 border border-[#2f3a31] bg-[#26332b] px-3 py-2"
          >
            <div className="text-xs text-[#E8E8D8]">{row.label}</div>
            <div className="flex gap-2">
              {[
                { label: "ON", value: true },
                { label: "OFF", value: false },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => row.onChange(option.value)}
                  className={`px-3 py-1 border-2 text-[10px] font-bold ${
                    row.value === option.value
                      ? "border-[#C4A853] bg-[#C4A853]/20 text-[#C4A853]"
                      : "border-[#556B55] bg-[#1f2b21] text-[#E8E8D8] hover:border-[#C4A853]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${enabled ? "" : "opacity-55"}`}>
        {teams.map(({ label, team }) => {
          const reporter = assignedReporters[team.id] ?? null;
          const isBusy = busyTeamId === team.id;
          const pickerValue = reporter?.id ?? "";

          return (
            <div key={team.id} className="border-2 border-[#556B55] bg-[#1f2b21] p-3 space-y-3">
              <div className="text-[10px] text-[#a0a898] tracking-[0.2em]">{label.toUpperCase()}</div>
              <div className="flex items-center gap-3 min-h-[48px]">
                {reporter ? (
                  <>
                    <ReporterAvatar reporter={reporter} />
                    <div>
                      <div className="text-sm text-[#E8E8D8] font-bold">{reporter.name}</div>
                      <div className="text-[10px] text-[#a0a898] mt-1">{team.name.toUpperCase()}</div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="text-sm text-[#E8E8D8] font-bold">{team.name}</div>
                    <div className="text-[10px] text-[#a0a898] mt-1">No reporter assigned</div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={!enabled || isBusy}
                  onClick={() => void handleGenerate(team)}
                  className="px-3 py-2 border-2 border-[#C4A853] bg-[#3d4a42] text-[#C4A853] disabled:border-[#556B55] disabled:text-[#8A9A82] disabled:bg-[#26332b] disabled:cursor-not-allowed text-[10px] font-bold tracking-wider hover:bg-[#4a5a50]"
                >
                  {isBusy ? "WORKING..." : reporter ? "RE-GENERATE" : "AUTO-GENERATE"}
                </button>
                <select
                  aria-label={`${team.name} reporter picker`}
                  disabled={!enabled || isBusy || availableReporters.length === 0}
                  value={pickerValue}
                  onChange={(event) => void handleAssign(team.id, event.target.value)}
                  className="flex-1 bg-[#26332b] text-[#E8E8D8] border-2 border-[#556B55] px-2 py-2 text-[10px] font-bold disabled:text-[#8A9A82] disabled:cursor-not-allowed"
                >
                  <option value="">PICK EXISTING...</option>
                  {availableReporters.map((existing) => {
                    const assignedTeamId = getReporterAssignedTeamId(existing.id, team.id);
                    return (
                      <option
                        key={existing.id}
                        value={existing.id}
                        disabled={assignedTeamId !== null}
                      >
                        {existing.name}{assignedTeamId ? " (assigned)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="text-xs text-[#CC3433]">{error}</div>}
    </section>
  );
}
