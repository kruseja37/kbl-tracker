import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, ChevronRight, Eye, RefreshCw, Target } from "lucide-react";

import { getScoutProfilesForLeague } from "../../../utils/leagueBuilderStorage";
import { useLeagueBuilderData, type Team } from "../../hooks/useLeagueBuilderData";
import {
  draftRouteForLeague,
  leagueIdFromSearch,
  reservePriceKFromSearch,
  resolveInitialLeagueId,
  shillCountFromSearch,
} from "../utils/draftRouting";
import {
  buildLiveScoutPool,
  isHumanControlledTeam,
  persistScoutHiresForLeague,
  type LiveScoutCandidate,
} from "../utils/draftStaffingPersistence";

function teamDisplayName(team: Team): string {
  return `${team.location} ${team.nickname}`.trim() || team.name;
}

function selectedTeamForScout(
  scoutId: string,
  selectedByTeamId: Record<string, string | undefined>,
  teams: readonly Team[],
): Team | null {
  const teamId = Object.entries(selectedByTeamId).find(([, selectedScoutId]) => selectedScoutId === scoutId)?.[0];
  return teamId ? teams.find((team) => team.id === teamId) ?? null : null;
}

export function ScoutHire() {
  const navigate = useNavigate();
  const requestedLeagueId = useMemo(() => leagueIdFromSearch(window.location.search), []);
  const requestedShillCount = useMemo(() => shillCountFromSearch(window.location.search), []);
  const requestedReservePriceK = useMemo(() => reservePriceKFromSearch(window.location.search), []);
  const { leagues, teams, isLoading, error } = useLeagueBuilderData();
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [selectedByTeamId, setSelectedByTeamId] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeLeagueId && leagues.length > 0) {
      setActiveLeagueId(resolveInitialLeagueId(leagues, requestedLeagueId));
    }
  }, [activeLeagueId, leagues, requestedLeagueId]);

  const activeLeague = useMemo(
    () => leagues.find((league) => league.id === activeLeagueId) ?? null,
    [activeLeagueId, leagues],
  );
  const leagueTeams = useMemo(() => {
    if (!activeLeague) return [];
    return activeLeague.teamIds
      .map((teamId) => teams.find((team) => team.id === teamId))
      .filter((team): team is Team => Boolean(team));
  }, [activeLeague, teams]);
  const humanTeams = useMemo(
    () => leagueTeams.filter((team) => isHumanControlledTeam(team)),
    [leagueTeams],
  );
  const scoutPool = useMemo<LiveScoutCandidate[]>(
    () => activeLeague ? buildLiveScoutPool(activeLeague.id, leagueTeams.length) : [],
    [activeLeague, leagueTeams.length],
  );

  useEffect(() => {
    if (!activeLeague) return;
    let cancelled = false;
    const scoutPoolIds = new Set(scoutPool.map((scout) => scout.id));
    void getScoutProfilesForLeague(activeLeague.id).then((savedScouts) => {
      if (cancelled) return;
      setSelectedByTeamId((current) => {
        const next = { ...current };
        for (const scout of savedScouts) {
          if (scout.teamId && scoutPoolIds.has(scout.id)) next[scout.teamId] = scout.id;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeLeague, scoutPool]);

  const allHumanTeamsReady = humanTeams.every((team) => selectedByTeamId[team.id]);

  const chooseScout = (teamId: string, scoutId: string): void => {
    setSaveError(null);
    setSelectedByTeamId((current) => {
      const next = { ...current };
      for (const [candidateTeamId, selectedScoutId] of Object.entries(next)) {
        if (selectedScoutId === scoutId && candidateTeamId !== teamId) {
          next[candidateTeamId] = undefined;
        }
      }
      next[teamId] = next[teamId] === scoutId ? undefined : scoutId;
      return next;
    });
  };

  const continueToDraft = async (): Promise<void> => {
    if (!activeLeague || !allHumanTeamsReady) return;
    setSaving(true);
    setSaveError(null);
    try {
      await persistScoutHiresForLeague({
        leagueId: activeLeague.id,
        teams: leagueTeams,
        selectedScoutIdsByTeamId: selectedByTeamId,
        pool: scoutPool,
      });
      navigate(draftRouteForLeague(activeLeague, {
        shillCount: requestedShillCount,
        reservePriceK: requestedReservePriceK,
      }));
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Could not save scout hires.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 font-bold">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading scout hire...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-xl text-[#E0857A] font-bold">Error: {error}</div>
      </div>
    );
  }

  if (!activeLeague) {
    return (
      <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-xl font-bold">No league found for scout hire.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1120px] mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            aria-label="Back to draft setup"
            type="button"
            onClick={() => {
              const params = new URLSearchParams({ leagueId: activeLeague.id });
              if (requestedShillCount !== null) params.set("shills", String(requestedShillCount));
              if (requestedReservePriceK !== null) params.set("reserveK", String(requestedReservePriceK));
              navigate(`/league-builder/draft-setup?${params.toString()}`);
            }}
            className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="mb-1 text-xs font-bold tracking-[0.2em] text-[#C4A853]">SCOUT DRAFT</div>
            <h1 className="text-2xl font-bold" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>Hire Your Draft Scouts</h1>
            <div className="text-sm text-[#E8E8D8]/65">{activeLeague.name}</div>
          </div>
        </div>

        <div className="mb-5 bg-[#2d3d2f] border-4 border-[#4A6844] p-4 text-sm text-[#E8E8D8]/75">
          Human clubs choose from the shared pool. CPU clubs auto-fill when you continue, so the farm draft scouting gate still has one hired scout per team.
        </div>

        {humanTeams.length === 0 ? (
          <div className="mb-5 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4 text-[#FFE8B0] font-bold">
            No human-controlled teams are assigned in this league. Return to draft setup and assign at least one team.
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          <section className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4 h-fit">
            <h2 className="text-sm font-bold tracking-[0.12em] text-[#C4A853] mb-3">HUMAN CLUBS</h2>
            <div className="space-y-3">
              {humanTeams.map((team) => {
                const chosenScout = scoutPool.find((scout) => scout.id === selectedByTeamId[team.id]);
                return (
                  <div key={team.id} className="bg-[#34472f] border-2 border-[#4A6844] p-3">
                    <div className="font-bold">{teamDisplayName(team)}</div>
                    <div className="text-[11px] text-[#E8E8D8]/55">
                      {chosenScout ? `Scout: ${chosenScout.name}` : "Pick a scout"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-[11px] text-[#E8E8D8]/55">
              CPU auto-fill: {Math.max(0, leagueTeams.length - humanTeams.length)} clubs
            </div>
          </section>

          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {scoutPool.map((scout) => {
                const assignedTeam = selectedTeamForScout(scout.id, selectedByTeamId, humanTeams);
                return (
                  <div key={scout.id} className="relative text-left border-4 border-[#4A6844] bg-[#34472f] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)]">
                    {assignedTeam ? (
                      <span className="absolute top-2 right-2 flex items-center gap-1 bg-[#C4A853] text-[#1A1A1A] text-[9px] font-bold tracking-wider px-1.5 py-0.5">
                        <Check className="w-2.5 h-2.5" /> {assignedTeam.abbreviation}
                      </span>
                    ) : null}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] text-[#C4A853] mb-2">
                      <Target className="w-3 h-3" /> {scout.specialtyLabel.toUpperCase()}
                    </div>
                    <div className="text-lg font-bold text-[#E8E8D8] pr-16" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
                      {scout.name}
                    </div>
                    <div className="text-[12px] text-[#E8E8D8]/65 leading-snug my-2 min-h-[48px]">{scout.summary}</div>
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-3.5 h-3.5 text-[#9FE0A0]" />
                      <div className="flex-1 h-2 bg-[#243024] border border-[#4A6844]">
                        <div className="h-full bg-[#9FE0A0]" style={{ width: `${Math.min(100, scout.eye)}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-[#9FE0A0]">{scout.eye}</span>
                      <span className="text-[9px] text-[#E8E8D8]/40">eye</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {humanTeams.map((team) => {
                        const isSelected = selectedByTeamId[team.id] === scout.id;
                        const isTakenByOther = Boolean(assignedTeam && assignedTeam.id !== team.id);
                        return (
                          <button
                            key={team.id}
                            type="button"
                            disabled={isTakenByOther || saving}
                            onClick={() => chooseScout(team.id, scout.id)}
                            className={`text-[11px] font-bold border-2 px-2 py-1 text-left transition ${
                              isSelected
                                ? "border-[#C4A853] bg-[#C4A853] text-[#1A1A1A]"
                                : isTakenByOther
                                  ? "border-[#4A6844]/40 bg-[#2a352b] text-[#E8E8D8]/35"
                                  : "border-[#4A6844] bg-[#2d3d2f] hover:border-[#C4A853]"
                            }`}
                          >
                            {isSelected ? "Hired by " : "Hire for "}{team.abbreviation}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {saveError ? (
              <div className="mt-4 bg-[#6B3A3A] border-4 border-[#FFD27A] p-3 text-[#FFE8B0] font-bold">
                {saveError}
              </div>
            ) : null}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                disabled={!allHumanTeamsReady || saving || humanTeams.length === 0}
                onClick={() => void continueToDraft()}
                className="flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] disabled:opacity-40 text-[#1A1A1A] border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
              >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
                Continue to MLB Auction <ChevronRight className="w-5 h-5" />
              </button>
              {!allHumanTeamsReady && humanTeams.length > 0 ? (
                <span className="text-[11px] text-[#E8E8D8]/50">hire one scout for every human club</span>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ScoutHire;
