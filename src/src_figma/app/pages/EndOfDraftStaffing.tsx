import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ChevronRight, ClipboardList, Mic, RefreshCw, Shuffle } from "lucide-react";

import { useLeagueBuilderData, type Team } from "../../hooks/useLeagueBuilderData";
import {
  farmDraftRouteForLeague,
  leagueIdFromSearch,
  resolveInitialLeagueId,
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
  const { leagues, teams, isLoading, error } = useLeagueBuilderData();
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [formsByTeamId, setFormsByTeamId] = useState<Record<string, StaffForm | undefined>>({});
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
    if (!activeLeague || !staffReady) return;
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
      navigate("/franchise/setup");
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Could not save draft staff.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 font-bold">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading staff hire...
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
        <div className="text-xl font-bold">No league found for staff hire.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1040px] mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            aria-label="Back to farm auction"
            type="button"
            onClick={() => navigate(farmDraftRouteForLeague(activeLeague))}
            className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="mb-1 text-xs font-bold tracking-[0.2em] text-[#C4A853]">END OF DRAFT</div>
            <h1 className="text-2xl font-bold" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>Staff Your Clubs</h1>
            <div className="text-sm text-[#E8E8D8]/65">{activeLeague.name}</div>
          </div>
        </div>

        <div className="mb-5 bg-[#2d3d2f] border-4 border-[#4A6844] p-4 text-sm text-[#E8E8D8]/75">
          Hire one manager and one beat reporter for each human-controlled club before the franchise freeze. CPU clubs keep the existing auto-fill path.
        </div>

        {humanTeams.length === 0 ? (
          <div className="mb-5 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4 text-[#FFE8B0] font-bold">
            No human-controlled teams are assigned in this league.
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {humanTeams.map((team) => {
            const form = formsByTeamId[team.id] ?? defaultStaffForm(team, 0);
            return (
              <section key={team.id} className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg font-bold text-[#E8E8D8]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
                    {teamDisplayName(team)}
                  </span>
                  <span className="text-[11px] text-[#E8E8D8]/55">{team.abbreviation}</span>
                  <button
                    type="button"
                    onClick={() => rollNames(team)}
                    className="ml-auto flex items-center gap-1 text-[11px] text-[#C4A853] hover:underline"
                  >
                    <Shuffle className="w-3.5 h-3.5" /> roll names
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[#C4A853] mb-2">
                    <ClipboardList className="w-3.5 h-3.5" /> MANAGER
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={form.managerName}
                      onChange={(event) => updateForm(team.id, { managerName: event.target.value })}
                      className="flex-1 min-w-[140px] bg-[#34472f] border-2 border-[#4A6844] focus:border-[#C4A853] outline-none px-3 py-2 text-sm font-bold text-[#E8E8D8]"
                    />
                    <select
                      value={form.managerStyle}
                      onChange={(event) => updateForm(team.id, { managerStyle: managerStyleFromValue(event.target.value) })}
                      className="bg-[#34472f] border-2 border-[#4A6844] outline-none px-2 py-2 text-sm font-bold text-[#E8E8D8]"
                    >
                      {MANAGER_STYLES.map((style) => <option key={style}>{style}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[#C4A853] mb-2">
                    <Mic className="w-3.5 h-3.5" /> BEAT REPORTER
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Reporter avatar"
                      value={form.reporterAvatar}
                      onChange={(event) => updateForm(team.id, { reporterAvatar: reporterAvatarFromValue(event.target.value) })}
                      className="bg-[#34472f] border-2 border-[#4A6844] outline-none px-2 py-2 text-sm font-bold text-[#E8E8D8]"
                    >
                      {REPORTER_AVATARS.map((avatar) => (
                        <option key={avatar.era} value={avatar.era}>{avatar.label}</option>
                      ))}
                    </select>
                    <input
                      value={form.reporterName}
                      onChange={(event) => updateForm(team.id, { reporterName: event.target.value })}
                      className="flex-1 min-w-[120px] bg-[#34472f] border-2 border-[#4A6844] focus:border-[#C4A853] outline-none px-3 py-2 text-sm font-bold text-[#E8E8D8]"
                    />
                    <select
                      value={form.reporterPersona}
                      onChange={(event) => updateForm(team.id, { reporterPersona: reporterPersonaFromValue(event.target.value) })}
                      className="bg-[#34472f] border-2 border-[#4A6844] outline-none px-2 py-2 text-sm font-bold text-[#E8E8D8]"
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
          <div className="mb-4 bg-[#6B3A3A] border-4 border-[#FFD27A] p-3 text-[#FFE8B0] font-bold">
            {saveError}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!staffReady || saving || humanTeams.length === 0}
          onClick={() => void continueToFreeze()}
          className="flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] disabled:opacity-40 text-[#1A1A1A] border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
          Confirm Staff and Continue to Franchise Setup <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default EndOfDraftStaffing;
