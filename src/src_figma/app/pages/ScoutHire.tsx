import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, ChevronRight, CircleHelp, Eye, RefreshCw, Target } from "lucide-react";

import { useLeagueBuilderData, type Team } from "../../hooks/useLeagueBuilderData";
import {
  draftRouteForLeague,
  farmDraftRouteForLeague,
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
import { getMlbDraftSession } from "../../../utils/leagueBuilderStorage";
import { assertSnakeRosterHandoffReady } from "../../../utils/snakeRosterHandoff";
import { companionTeamBranding } from "../components/snake/companion/companionBranding";
import { HISTORICAL_ARCHETYPES } from "../../../data/historicalArchetypes";
import { updateMlbDraftSessionAtomically } from "../../../utils/leagueBuilderStorage";

function teamDisplayName(team: Team): string {
  return `${team.location} ${team.nickname}`.trim() || team.name;
}

export function ScoutHire() {
  const navigate = useNavigate();
  const requestedLeagueId = useMemo(() => leagueIdFromSearch(window.location.search), []);
  const requestedShillCount = useMemo(() => shillCountFromSearch(window.location.search), []);
  const requestedReservePriceK = useMemo(() => reservePriceKFromSearch(window.location.search), []);
  const { leagues, teams, isLoading, error, refresh, updateTeam } = useLeagueBuilderData();
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [handoffState, setHandoffState] = useState<"checking" | "ready" | "blocked">("checking");
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [handoffRevision, setHandoffRevision] = useState(0);
  const [farmIdentityRepairByTeamId, setFarmIdentityRepairByTeamId] = useState<Record<string, string>>({});

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
  const missingFarmIdentityTeams = useMemo(
    () => leagueTeams.filter((team) => !team.farmArchetypeKey?.trim()),
    [leagueTeams],
  );
  const farmIdentitiesReady = leagueTeams.length > 0 && missingFarmIdentityTeams.length === 0;
  const scoutPool = useMemo<LiveScoutCandidate[]>(
    () => activeLeague && farmIdentitiesReady ? buildLiveScoutPool(activeLeague.id, leagueTeams) : [],
    [activeLeague, farmIdentitiesReady, leagueTeams],
  );
  const scoutByTeamId = useMemo(
    () => new Map(scoutPool.map((scout) => [scout.teamId, scout])),
    [scoutPool],
  );
  const allHumanTeamsReady = farmIdentitiesReady
    && humanTeams.length > 0
    && humanTeams.every((team) => scoutByTeamId.has(team.id));

  const saveMissingFarmIdentities = async (): Promise<void> => {
    if (!activeLeague || activeLeague.draftFormat !== "snake" || missingFarmIdentityTeams.length === 0) return;
    const selected = Object.fromEntries(missingFarmIdentityTeams.map((team) => [
      team.id,
      farmIdentityRepairByTeamId[team.id]?.trim() ?? "",
    ]));
    const firstMissing = missingFarmIdentityTeams.find((team) => !selected[team.id]);
    if (firstMissing) {
      setSaveError(`SELECT A FARM IDENTITY FOR ${teamDisplayName(firstMissing).toUpperCase()}.`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateMlbDraftSessionAtomically(activeLeague.id, 1, (current) => {
        if (!current.snakeSetup) throw new Error("THE COMPLETED MLB DRAFT SETUP IS MISSING.");
        return {
          ...current,
          snakeSetup: {
            ...current.snakeSetup,
            clubs: current.snakeSetup.clubs.map((club) => {
              const repair = selected[club.teamId];
              if (!repair) return club;
              if (club.farmArchetypeId && club.farmArchetypeId !== repair) {
                throw new Error(`THE FROZEN FARM IDENTITY DOES NOT MATCH ${club.teamId}.`);
              }
              return { ...club, farmArchetypeId: repair };
            }),
          },
        };
      });
      for (const team of missingFarmIdentityTeams) {
        await updateTeam({ ...team, farmArchetypeKey: selected[team.id] });
      }
      await refresh();
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "THE FARM IDENTITIES COULD NOT BE SAVED.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!activeLeague) return;
    if (activeLeague.draftFormat !== "snake") {
      setHandoffState("ready");
      setHandoffError(null);
      return;
    }
    let cancelled = false;
    setHandoffState("checking");
    setHandoffError(null);
    void getMlbDraftSession(activeLeague.id, 1)
      .then(async (session) => {
        if (!session) throw new Error("THE MLB SNAKE DRAFT HANDOFF IS MISSING.");
        await assertSnakeRosterHandoffReady(session, "MLB");
        if (!cancelled) setHandoffState("ready");
      })
      .catch((caught) => {
        if (cancelled) return;
        setHandoffError(caught instanceof Error ? caught.message : "THE MLB DRAFT HANDOFF IS NOT READY.");
        setHandoffState("blocked");
      });
    return () => { cancelled = true; };
  }, [activeLeague, handoffRevision]);

  const continueToDraft = async (): Promise<void> => {
    if (!activeLeague || !allHumanTeamsReady || handoffState !== "ready") return;
    setSaving(true);
    setSaveError(null);
    try {
      await persistScoutHiresForLeague({
        leagueId: activeLeague.id,
        teams: leagueTeams,
        selectedScoutIdsByTeamId: {},
        pool: scoutPool,
      });
      navigate(farmDraftRouteForLeague(activeLeague));
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
        <div className="max-w-lg border-4 border-[#E0857A] bg-[#2d3d2f] p-5 text-center">
          <div className="text-xl text-[#E0857A] font-bold">SCOUT HIRE COULD NOT LOAD</div>
          <div className="mt-2 text-sm text-[#E8E8D8]/75">{error}</div>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 border-4 border-[#E8E8D8] bg-[#C4A853] px-4 py-2 font-bold text-[#1A1A1A]"
            onClick={() => void refresh()}
          >
            <RefreshCw className="h-4 w-4" /> RETRY
          </button>
        </div>
      </div>
    );
  }

  if (!activeLeague) {
    return (
      <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="max-w-lg border-4 border-[#E0857A] bg-[#2d3d2f] p-5 text-center">
          <div className="text-xl font-bold text-[#E0857A]">NO LEAGUE FOUND FOR SCOUT HIRE</div>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 border-4 border-[#E8E8D8] bg-[#C4A853] px-4 py-2 font-bold text-[#1A1A1A]"
              onClick={() => void refresh()}
            >
              <RefreshCw className="h-4 w-4" /> RETRY
            </button>
            <button
              type="button"
              className="min-h-11 border-4 border-[#E8E8D8] px-4 py-2 font-bold"
              onClick={() => navigate('/league-builder/draft-setup')}
            >
              BACK TO DRAFT SETUP
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1120px] mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            aria-label={activeLeague.draftFormat === "snake" ? "Back to MLB snake draft" : "Back to MLB auction"}
            type="button"
            onClick={() => {
              navigate(activeLeague.draftFormat === "snake"
                ? `/snake-room?leagueId=${encodeURIComponent(activeLeague.id)}`
                : draftRouteForLeague(activeLeague, {
                    shillCount: requestedShillCount,
                    reservePriceK: requestedReservePriceK,
                  }));
            }}
            className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="mb-1 text-xs font-bold tracking-[0.2em] text-[#C4A853]">SCOUT REVEAL</div>
            <h1 className="text-2xl font-bold" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>Meet Your Draft Scouts</h1>
            <div className="text-sm text-[#E8E8D8]/65">{activeLeague.name}</div>
          </div>
          <button
            type="button"
            aria-label="SCOUT HIRE HELP"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen((current) => !current)}
            className="ml-auto flex h-11 w-11 items-center justify-center border-4 border-[#E8E8D8] bg-[#4A6844] font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)]"
          >
            <CircleHelp className="h-5 w-5" />
          </button>
        </div>

        {helpOpen ? (
          <aside aria-label="Scout hire instructions" className="mb-5 bg-[#2d3d2f] border-4 border-[#4A6844] p-4 text-sm text-[#E8E8D8]/75">
            Each club's scout is assigned from its farm identity. CPU clubs are assigned when you continue, keeping one scout per team for the farm draft.
          </aside>
        ) : null}

        {handoffState === "blocked" ? (
          <div className="mb-5 flex flex-wrap items-center gap-3 border-4 border-[#FFD27A] bg-[#6B3A3A] p-4 font-bold text-[#FFE8B0]">
            <span>MLB DRAFT HANDOFF NOT READY · {handoffError}</span>
            <button type="button" className="ml-auto border-2 border-[#FFE8B0] px-3 py-2" onClick={() => setHandoffRevision((value) => value + 1)}>RETRY</button>
          </div>
        ) : null}

        {humanTeams.length === 0 ? (
          <div className="mb-5 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4 text-[#FFE8B0] font-bold">
            No human-controlled teams are assigned in this league. Return to draft setup and assign at least one team.
          </div>
        ) : null}

        {!farmIdentitiesReady ? (
          <section className="mb-5 border-4 border-[#FFD27A] bg-[#6B3A3A] p-4 text-[#FFE8B0]">
            <h2 className="text-lg font-bold tracking-[0.08em]">FARM IDENTITIES MISSING</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {missingFarmIdentityTeams.map((team) => (
                <label key={team.id} className="border-2 border-[#FFD27A] bg-[#2d3d2f] p-3">
                  <span className="mb-2 block font-bold">{teamDisplayName(team)}</span>
                  <select
                    aria-label={`Farm identity for ${teamDisplayName(team)}`}
                    value={farmIdentityRepairByTeamId[team.id] ?? ""}
                    onChange={(event) => setFarmIdentityRepairByTeamId((current) => ({
                      ...current,
                      [team.id]: event.target.value,
                    }))}
                    className="min-h-11 w-full border-2 border-[#E8E8D8] bg-[#243024] px-3 text-[#E8E8D8]"
                  >
                    <option value="">SELECT FARM IDENTITY</option>
                    {HISTORICAL_ARCHETYPES.map((archetype) => (
                      <option key={archetype.id} value={archetype.id}>{archetype.name}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveMissingFarmIdentities()}
              className="mt-4 min-h-11 border-4 border-[#E8E8D8] bg-[#C4A853] px-5 py-2 font-bold text-[#1A1A1A] disabled:opacity-40"
            >
              {saving ? "SAVING…" : "SAVE FARM IDENTITIES"}
            </button>
          </section>
        ) : null}

        {farmIdentitiesReady ? <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          <section className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4 h-fit">
            <h2 className="text-sm font-bold tracking-[0.12em] text-[#C4A853] mb-3">HUMAN CLUBS</h2>
            <div className="space-y-3">
              {humanTeams.map((team) => {
                const chosenScout = scoutByTeamId.get(team.id);
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
              {humanTeams.map((team) => {
                const scout = scoutByTeamId.get(team.id);
                if (!scout) return null;
                const brand = companionTeamBranding(team.colors);
                return (
                  <div
                    key={scout.id}
                    data-testid={`scout-card-${team.id}`}
                    className="relative text-left border-4 bg-[#34472f] p-4"
                    style={{
                      borderColor: brand.primary,
                      boxShadow: `5px 5px 0 ${brand.border}`,
                    }}
                  >
                    <span
                      className="absolute top-2 right-2 flex items-center gap-1 border-2 text-[9px] font-bold tracking-wider px-1.5 py-0.5"
                      style={{
                        backgroundColor: brand.primary,
                        borderColor: brand.border,
                        color: brand.foreground,
                      }}
                    >
                      {team.logoUrl ? <img alt="" src={team.logoUrl} className="h-5 w-5 object-contain" /> : <Check className="w-2.5 h-2.5" />}
                      {team.abbreviation}
                    </span>
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
                    <div className="grid grid-cols-1 gap-2 text-[11px] text-[#E8E8D8]/65">
                      <div>Tight: {scout.specialties.length ? scout.specialties.join(", ") : "balanced"}</div>
                      <div>Wide: {scout.weaknesses.length ? scout.weaknesses.join(", ") : "none"}</div>
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
                disabled={!allHumanTeamsReady || saving || humanTeams.length === 0 || handoffState !== "ready"}
                onClick={() => void continueToDraft()}
                className="flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] disabled:opacity-40 text-[#1A1A1A] border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
              >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
                Confirm Scouts <ChevronRight className="w-5 h-5" />
              </button>
              {!allHumanTeamsReady && humanTeams.length > 0 ? (
                <span className="text-[11px] text-[#E8E8D8]/50">scout assignment is still loading</span>
              ) : null}
            </div>
          </section>
        </div> : null}
      </div>
    </div>
  );
}

export default ScoutHire;
