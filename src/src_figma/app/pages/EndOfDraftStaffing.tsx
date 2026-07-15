import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ChevronRight, ClipboardList, HelpCircle, Mic, RefreshCw, Shuffle } from "lucide-react";

import { useLeagueBuilderData, type Team } from "../../hooks/useLeagueBuilderData";
import { PressButton } from "../components/ballpark";
import {
  farmDraftRouteForLeague,
  franchiseSetupRouteForLeague,
  leagueIdFromSearch,
} from "../utils/draftRouting";
import {
  isHumanControlledTeam,
  MANAGER_STYLES,
  persistDraftStaffForLeague,
  REPORTER_AVATARS,
  REPORTER_PERSONAS,
  type ManagerStyleOption,
  type ReporterPersonaOption,
} from "../utils/draftStaffingPersistence";
import type { ReporterAvatarEra } from "../../../types/reporter";
import { getMlbDraftSession } from "../../../utils/leagueBuilderStorage";
import { FARM_SNAKE_SESSION_NUMBER } from "../../../engines/snakeFarmSlots";
import { assertSnakeRosterHandoffReady } from "../../../utils/snakeRosterHandoff";

interface StaffForm {
  managerName: string;
  managerStyle: ManagerStyleOption;
  reporterName: string;
  reporterPersona: ReporterPersonaOption;
  reporterAvatar: ReporterAvatarEra;
}

const NAME_FIRST = ["Sal", "Mo", "Rico", "Pat", "Lee", "Gus", "Vic", "Ed", "Nia", "Dot"];
const NAME_LAST = ["Briggs", "Nunez", "Park", "Cole", "Ward", "Hale", "Doss", "Krane", "Tate", "Vance"];

function hashStringToUint32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickName(seed: string): string {
  const first = NAME_FIRST[hashStringToUint32(`${seed}:first`) % NAME_FIRST.length];
  const last = NAME_LAST[hashStringToUint32(`${seed}:last`) % NAME_LAST.length];
  return `${first[0]}. ${last}`;
}

function teamDisplayName(team: Team): string {
  return `${team.location} ${team.nickname}`.trim() || team.name;
}

function defaultStaffForm(team: Team, index: number): StaffForm {
  return {
    managerName: team.managerName ?? pickName(`${team.id}:manager:${index}`),
    managerStyle: MANAGER_STYLES[index % MANAGER_STYLES.length],
    reporterName: pickName(`${team.id}:reporter:${index}`),
    reporterPersona: REPORTER_PERSONAS[index % REPORTER_PERSONAS.length],
    reporterAvatar: REPORTER_AVATARS[index % REPORTER_AVATARS.length].era,
  };
}

function managerStyleFromValue(value: string): ManagerStyleOption {
  return MANAGER_STYLES.find((style) => style === value) ?? "Balanced";
}

function reporterPersonaFromValue(value: string): ReporterPersonaOption {
  return REPORTER_PERSONAS.find((persona) => persona === value) ?? "Straight shooter";
}

function reporterAvatarFromValue(value: string): ReporterAvatarEra {
  return REPORTER_AVATARS.find((avatar) => avatar.era === value)?.era ?? "fedora";
}

export function EndOfDraftStaffing() {
  const navigate = useNavigate();
  const requestedLeagueId = useMemo(() => leagueIdFromSearch(window.location.search), []);
  const { leagues, teams, isLoading, error, refresh } = useLeagueBuilderData();
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [formsByTeamId, setFormsByTeamId] = useState<Record<string, StaffForm | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // TEXTLAW-SWEEP: this page had no Help affordance -- it gains ONE top-right Help toggle
  // (journey-wide placement) so the instruction banner can gate behind it instead of always
  // rendering.
  const [showHelp, setShowHelp] = useState(false);
  const [handoffState, setHandoffState] = useState<"checking" | "ready" | "blocked">("checking");
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [handoffRevision, setHandoffRevision] = useState(0);

  useEffect(() => {
    if (!activeLeagueId && leagues.length > 0) {
      const nextLeagueId = requestedLeagueId === null
        ? leagues[0]?.id ?? ""
        : leagues.some((league) => league.id === requestedLeagueId)
          ? requestedLeagueId
          : "";
      setActiveLeagueId(nextLeagueId);
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
      .then(async (mlbSession) => {
        if (!mlbSession) throw new Error("THE MLB SNAKE DRAFT HANDOFF IS MISSING.");
        await assertSnakeRosterHandoffReady(mlbSession, "MLB");
        const farmSession = await getMlbDraftSession(activeLeague.id, FARM_SNAKE_SESSION_NUMBER);
        if (!farmSession) throw new Error("THE FARM SNAKE DRAFT HANDOFF IS MISSING.");
        await assertSnakeRosterHandoffReady(farmSession, "FARM");
        if (!cancelled) setHandoffState("ready");
      })
      .catch((caught) => {
        if (cancelled) return;
        setHandoffError(caught instanceof Error ? caught.message : "THE FARM DRAFT HANDOFF IS NOT READY.");
        setHandoffState("blocked");
      });
    return () => { cancelled = true; };
  }, [activeLeague, handoffRevision]);

  useEffect(() => {
    setFormsByTeamId((current) => {
      const next: Record<string, StaffForm | undefined> = {};
      humanTeams.forEach((team, index) => {
        next[team.id] = current[team.id] ?? defaultStaffForm(team, index);
      });
      return next;
    });
  }, [humanTeams]);

  const updateForm = (teamId: string, patch: Partial<StaffForm>): void => {
    setSaveError(null);
    setFormsByTeamId((current) => {
      const team = humanTeams.find((candidate) => candidate.id === teamId);
      if (!team) return current;
      return {
        ...current,
        [teamId]: {
          ...(current[teamId] ?? defaultStaffForm(team, 0)),
          ...patch,
        },
      };
    });
  };

  const rollNames = (team: Team): void => {
    const rollSeed = `${team.id}:${Date.now()}`;
    updateForm(team.id, {
      managerName: pickName(`${rollSeed}:manager`),
      reporterName: pickName(`${rollSeed}:reporter`),
    });
  };

  const staffReady = humanTeams.every((team) => {
    const form = formsByTeamId[team.id];
    return Boolean(form?.managerName.trim() && form.reporterName.trim());
  });

  const continueToFreeze = async (): Promise<void> => {
    if (!activeLeague || !staffReady || handoffState !== "ready") return;
    setSaving(true);
    setSaveError(null);
    try {
      await persistDraftStaffForLeague({
        leagueId: activeLeague.id,
        staff: humanTeams.map((team) => {
          const form = formsByTeamId[team.id] ?? defaultStaffForm(team, 0);
          return {
            team,
            managerName: form.managerName,
            managerStyle: form.managerStyle,
            reporterName: form.reporterName,
            reporterPersona: form.reporterPersona,
            reporterAvatar: form.reporterAvatar,
          };
        }),
      });
      navigate(franchiseSetupRouteForLeague(activeLeague));
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Could not save draft staff.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ballpark-page-bg)] text-[var(--ballpark-chalk)] p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 font-bold">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading staff hire...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--ballpark-page-bg)] text-[var(--ballpark-chalk)] p-8 flex items-center justify-center">
        <div className="max-w-lg border-4 border-[var(--ballpark-sacrifice-red)] bg-[var(--ballpark-panel)] p-6 text-center">
          <div className="mb-5 text-xl text-[var(--ballpark-sacrifice-red)] font-bold">Error: {error}</div>
          <div className="flex flex-wrap justify-center gap-3">
            <PressButton type="button" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" /> TRY AGAIN
            </PressButton>
            <PressButton type="button" variant="default" onClick={() => navigate("/league-builder") }>
              <ArrowLeft className="h-4 w-4" /> BACK TO LEAGUE BUILDER
            </PressButton>
          </div>
        </div>
      </div>
    );
  }

  if (!activeLeague) {
    return (
      <div className="min-h-screen bg-[var(--ballpark-page-bg)] text-[var(--ballpark-chalk)] p-8 flex items-center justify-center">
        <div className="max-w-lg border-4 border-[var(--ballpark-panel-border)] bg-[var(--ballpark-panel)] p-6 text-center">
          <div className="mb-5 text-xl font-bold">No league found for staff hire.</div>
          <div className="flex flex-wrap justify-center gap-3">
            <PressButton type="button" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" /> TRY AGAIN
            </PressButton>
            <PressButton type="button" variant="default" onClick={() => navigate("/league-builder") }>
              <ArrowLeft className="h-4 w-4" /> BACK TO LEAGUE BUILDER
            </PressButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ballpark-page-bg)] text-[var(--ballpark-chalk)] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1040px] mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            aria-label="Back to farm auction"
            type="button"
            onClick={() => navigate(farmDraftRouteForLeague(activeLeague))}
            className="p-3 bg-[var(--ballpark-action-green)] hover:bg-[var(--ballpark-action-green-hover)] border-4 border-[var(--ballpark-chalk)] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="mb-1 text-xs font-bold tracking-[0.2em] text-[var(--ballpark-brass)]">END OF DRAFT</div>
            <h1 className="text-2xl font-bold" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>Staff Your Clubs</h1>
            <div className="text-sm text-[var(--ballpark-chalk)]/65">{activeLeague.name}</div>
          </div>
          <PressButton
            size="sm"
            variant="default"
            aria-pressed={showHelp}
            onClick={() => setShowHelp((value) => !value)}
            className="ml-auto"
          >
            <HelpCircle className="w-4 h-4" /> ?
          </PressButton>
        </div>

        {showHelp ? (
          <div className="mb-5 bg-[var(--ballpark-panel)] border-4 border-[var(--ballpark-panel-border)] p-4 text-sm text-[var(--ballpark-chalk)]/75">
            Hire one manager and one beat reporter for each human-controlled club before the franchise freeze. CPU clubs keep the existing auto-fill path.
          </div>
        ) : null}

        {handoffState === "blocked" ? (
          <div className="mb-5 flex flex-wrap items-center gap-3 border-4 border-[var(--ballpark-warn-border)] bg-[var(--ballpark-warn-panel)] p-4 font-bold text-[var(--ballpark-warn-text)]">
            <span>FARM DRAFT HANDOFF NOT READY · {handoffError}</span>
            <PressButton type="button" size="sm" className="ml-auto" onClick={() => setHandoffRevision((value) => value + 1)}>RETRY</PressButton>
          </div>
        ) : null}

        {humanTeams.length === 0 ? (
          <div className="mb-5 bg-[var(--ballpark-warn-panel)] border-4 border-[var(--ballpark-warn-border)] p-4 text-[var(--ballpark-warn-text)] font-bold">
            No human-controlled teams are assigned in this league.
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {humanTeams.map((team) => {
            const form = formsByTeamId[team.id] ?? defaultStaffForm(team, 0);
            return (
              <section key={team.id} className="bg-[var(--ballpark-panel)] border-4 border-[var(--ballpark-panel-border)] p-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg font-bold text-[var(--ballpark-chalk)]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
                    {teamDisplayName(team)}
                  </span>
                  <span className="text-[11px] text-[var(--ballpark-chalk)]/55">{team.abbreviation}</span>
                  <button
                    type="button"
                    onClick={() => rollNames(team)}
                    className="ml-auto flex items-center gap-1 text-[11px] text-[var(--ballpark-brass)] hover:underline"
                  >
                    <Shuffle className="w-3.5 h-3.5" /> roll names
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[var(--ballpark-brass)] mb-2">
                    <ClipboardList className="w-3.5 h-3.5" /> MANAGER
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={form.managerName}
                      onChange={(event) => updateForm(team.id, { managerName: event.target.value })}
                      className="flex-1 min-w-[140px] bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)] focus:border-[var(--ballpark-brass)] outline-none px-3 py-2 text-sm font-bold tracking-wider text-[var(--ballpark-chalk)] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                    />
                    <select
                      value={form.managerStyle}
                      onChange={(event) => updateForm(team.id, { managerStyle: managerStyleFromValue(event.target.value) })}
                      className="bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)] outline-none px-2 py-2 text-sm font-bold tracking-wider text-[var(--ballpark-chalk)] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                    >
                      {MANAGER_STYLES.map((style) => <option key={style}>{style}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[var(--ballpark-brass)] mb-2">
                    <Mic className="w-3.5 h-3.5" /> BEAT REPORTER
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Reporter avatar"
                      value={form.reporterAvatar}
                      onChange={(event) => updateForm(team.id, { reporterAvatar: reporterAvatarFromValue(event.target.value) })}
                      className="bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)] outline-none px-2 py-2 text-sm font-bold tracking-wider text-[var(--ballpark-chalk)] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                    >
                      {REPORTER_AVATARS.map((avatar) => (
                        <option key={avatar.era} value={avatar.era}>{avatar.label}</option>
                      ))}
                    </select>
                    <input
                      value={form.reporterName}
                      onChange={(event) => updateForm(team.id, { reporterName: event.target.value })}
                      className="flex-1 min-w-[120px] bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)] focus:border-[var(--ballpark-brass)] outline-none px-3 py-2 text-sm font-bold tracking-wider text-[var(--ballpark-chalk)] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                    />
                    <select
                      value={form.reporterPersona}
                      onChange={(event) => updateForm(team.id, { reporterPersona: reporterPersonaFromValue(event.target.value) })}
                      className="bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)] outline-none px-2 py-2 text-sm font-bold tracking-wider text-[var(--ballpark-chalk)] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                    >
                      {REPORTER_PERSONAS.map((persona) => <option key={persona}>{persona}</option>)}
                    </select>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {saveError ? (
          <div className="mb-4 bg-[var(--ballpark-warn-panel)] border-4 border-[var(--ballpark-warn-border)] p-3 text-[var(--ballpark-warn-text)] font-bold">
            {saveError}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!staffReady || saving || humanTeams.length === 0 || handoffState !== "ready"}
          onClick={() => void continueToFreeze()}
          className="flex items-center gap-2 bg-[var(--ballpark-brass)] hover:bg-[#D4B863] disabled:opacity-40 text-[#1A1A1A] border-[5px] border-[var(--ballpark-chalk)] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
          Confirm Staff and Continue to Franchise Setup <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default EndOfDraftStaffing;
