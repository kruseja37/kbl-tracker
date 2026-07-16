import { SMB4_FIRST_NAMES, SMB4_LAST_NAMES } from "../../../data/smb4NameDatabase";
import {
  FARM_ARCHETYPE_SCOUT_CONFIDENCE,
  type ScoutConfidenceBand,
} from "../../../data/farmArchetypeScoutConfidence";
import type { ReporterAvatarEra, ReporterPersonality, VoiceStyle } from "../../../types/reporter";
import {
  replaceScoutProfilesForLeague,
  saveTeam,
  type LeagueBuilderScoutProfile,
  type Team,
} from "../../../utils/leagueBuilderStorage";
import {
  getManagerAssignment,
  getManagerProfile,
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  saveManagerAssignment,
  saveManagerProfile,
} from "../../../utils/managerIdentityStorage";
import { createReporter, getReporterForTeam, updateReporter } from "../../../utils/reporterStorage";
import {
  scoutAccuracy,
  HITTER_SCOUT_TOOLS,
  PITCHER_SCOUT_TOOLS,
  type DraftPosition,
  type ProspectScoutDescriptor,
  type ScoutArea,
  type ScoutSpecialty,
} from "../../../utils/prospectScoutingDraftEngine";
import type { BeatReporter } from "../../../types/reporter";
import type { ManagerAssignment, ManagerProfile } from "../../../types/managerWpa";

type ScoutProfileInput = Omit<LeagueBuilderScoutProfile, "createdDate" | "lastModified">;

export const MANAGER_STYLES = ["Balanced", "Aggressive", "Small-ball", "Old-school", "Analytics"] as const;
export type ManagerStyleOption = (typeof MANAGER_STYLES)[number];

export const REPORTER_PERSONAS = ["Straight shooter", "Homer", "Cynic", "Hype man", "Old hand"] as const;
export type ReporterPersonaOption = (typeof REPORTER_PERSONAS)[number];

export const REPORTER_AVATARS = [
  { label: "Fedora", era: "fedora" },
  { label: "Headset", era: "headset" },
  { label: "Cap", era: "cap" },
] as const satisfies readonly { label: string; era: ReporterAvatarEra }[];

export interface LiveScoutCandidate extends ScoutProfileInput {
  specialtyLabel: string;
  eye: number;
  summary: string;
}

export interface PersistScoutHiresInput {
  leagueId: string;
  teams: readonly Team[];
  selectedScoutIdsByTeamId: Record<string, string | undefined>;
  pool?: readonly LiveScoutCandidate[];
}

export interface DraftStaffHireInput {
  team: Team;
  managerName: string;
  managerStyle: ManagerStyleOption;
  reporterName: string;
  reporterPersona: ReporterPersonaOption;
  reporterAvatar: ReporterAvatarEra;
}

export interface PersistDraftStaffInput {
  leagueId: string;
  staff: readonly DraftStaffHireInput[];
}

export interface PersistDraftStaffResult {
  managers: ManagerProfile[];
  assignments: ManagerAssignment[];
  reporters: BeatReporter[];
}

const LIVE_SCOUT_POSITIONS = [
  "C",
  "1B",
  "2B",
  "SS",
  "3B",
  "LF",
  "CF",
  "RF",
  "SP",
  "SP/RP",
  "RP",
  "CP",
] as const satisfies readonly DraftPosition[];

const SCOUT_SPECIALTY_VALUES = [
  ...LIVE_SCOUT_POSITIONS,
  "P",
  "IF",
  "OF",
  "INF",
  "infield",
  "outfield",
  "pitching",
  "catching",
  "power",
  "contact",
  "fielding",
  "arm",
  "velocity",
  "junk",
  "accuracy",
  "defense",
  "speed",
] as const satisfies readonly ScoutSpecialty[];

function hashStringToUint32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickBySeed<T>(items: readonly T[], seed: string): T {
  if (items.length === 0) throw new Error("Cannot pick from an empty list.");
  return items[hashStringToUint32(seed) % items.length];
}

function scoutDescriptor(candidate: Pick<LiveScoutCandidate, "id" | "name" | "specialties" | "weaknesses">): ProspectScoutDescriptor {
  return {
    scoutId: candidate.id,
    scoutName: candidate.name,
    specialties: candidate.specialties.filter(isScoutSpecialty),
    weaknesses: candidate.weaknesses.filter(isScoutSpecialty),
  };
}

function isScoutSpecialty(value: string): value is ScoutSpecialty {
  return SCOUT_SPECIALTY_VALUES.some((specialty) => specialty === value);
}

function scoutAccuracyByPosition(candidate: Pick<LiveScoutCandidate, "id" | "name" | "specialties" | "weaknesses">): Record<string, number> {
  const descriptor = scoutDescriptor(candidate);
  return Object.fromEntries(
    LIVE_SCOUT_POSITIONS.map((position) => [position, scoutAccuracy(position, descriptor)]),
  );
}

function averageAccuracy(accuracyByPosition: Record<string, number>): number {
  const values = Object.values(accuracyByPosition);
  if (values.length === 0) return 65;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

const SCOUT_AREAS = Array.from(new Set([
  ...HITTER_SCOUT_TOOLS,
  ...PITCHER_SCOUT_TOOLS,
])) as ScoutArea[];

const SCOUT_AREA_LABELS: Record<ScoutArea, string> = {
  power: "Power",
  contact: "Contact",
  speed: "Speed",
  fielding: "Fielding",
  arm: "Arm",
  velocity: "Velocity",
  junk: "Junk",
  accuracy: "Accuracy",
};

function areasForBand(
  farmArchetypeKey: string | undefined,
  band: ScoutConfidenceBand,
): ScoutArea[] {
  const row = farmArchetypeKey ? FARM_ARCHETYPE_SCOUT_CONFIDENCE[farmArchetypeKey] : undefined;
  return SCOUT_AREAS.filter((area) => (row?.bands[area] ?? 5) === band);
}

function areaLabel(areas: readonly ScoutArea[]): string {
  if (areas.length === 0) return "Generalist";
  return areas.map((area) => SCOUT_AREA_LABELS[area]).join(" / ");
}

function buildAutoScoutForTeam(leagueId: string, team: Team, index: number): LiveScoutCandidate {
  const seed = `${leagueId}:live-scout:${team.id}:${team.farmArchetypeKey ?? "medium"}`;
  const name = `${pickBySeed(SMB4_FIRST_NAMES, `${seed}:first`)} ${pickBySeed(SMB4_LAST_NAMES, `${seed}:last`)}`;
  const specialties = areasForBand(team.farmArchetypeKey, 3);
  const weaknesses = areasForBand(team.farmArchetypeKey, 7);
  const row = team.farmArchetypeKey ? FARM_ARCHETYPE_SCOUT_CONFIDENCE[team.farmArchetypeKey] : undefined;
  const baseCandidate = {
    id: `live-scout-${leagueId}-${team.id}`,
    leagueId,
    teamId: team.id,
    name,
    specialties,
    weaknesses,
    seed,
    specialtyLabel: areaLabel(specialties),
    summary: row?.rationale ?? "Balanced farm scout: no farm archetype is set, so every area is treated as a medium-confidence read.",
    hiredPick: {
      round: 1,
      pickNumber: index + 1,
      teamId: team.id,
    },
  };
  const accuracyByPosition = scoutAccuracyByPosition(baseCandidate);

  return {
    ...baseCandidate,
    accuracyByPosition,
    eye: averageAccuracy(accuracyByPosition),
  };
}

function trimOrFallback(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed || fallback;
}

function toScoutProfileInput(candidate: LiveScoutCandidate, teamId: string, pickNumber: number): ScoutProfileInput {
  return {
    id: candidate.id,
    leagueId: candidate.leagueId,
    teamId,
    name: candidate.name,
    specialties: [...candidate.specialties],
    weaknesses: [...candidate.weaknesses],
    accuracyByPosition: { ...candidate.accuracyByPosition },
    seed: candidate.seed,
    hiredPick: {
      round: 1,
      pickNumber,
      teamId,
    },
  };
}

function reporterVoice(persona: ReporterPersonaOption): { personality: ReporterPersonality; voiceStyle: VoiceStyle } {
  switch (persona) {
    case "Homer":
      return { personality: "HOMER", voiceStyle: "THE_HYPE_MAN" };
    case "Cynic":
      return { personality: "CONTRARIAN", voiceStyle: "THE_GRINDER" };
    case "Hype man":
      return { personality: "DRAMATIC", voiceStyle: "THE_REACTOR" };
    case "Old hand":
      return { personality: "OLD_SCHOOL", voiceStyle: "THE_GENTLEMAN" };
    case "Straight shooter":
    default:
      return { personality: "BALANCED", voiceStyle: "THE_CALLER" };
  }
}

export function isHumanControlledTeam(team: Pick<Team, "controlledBy">): boolean {
  return team.controlledBy !== "ai";
}

export function buildLiveScoutPool(leagueId: string, teams: readonly Team[]): LiveScoutCandidate[] {
  return teams.map((team, index) => buildAutoScoutForTeam(leagueId, team, index));
}

export async function persistScoutHiresForLeague(input: PersistScoutHiresInput): Promise<LeagueBuilderScoutProfile[]> {
  const pool = input.pool ?? buildLiveScoutPool(input.leagueId, input.teams);
  const candidateByTeamId = new Map(pool.map((candidate) => [candidate.teamId, candidate]));
  const scoutInputs = input.teams.map((team, index) => {
    const candidate = candidateByTeamId.get(team.id) ?? buildAutoScoutForTeam(input.leagueId, team, index);
    return toScoutProfileInput(candidate, team.id, index + 1);
  });

  return replaceScoutProfilesForLeague(input.leagueId, scoutInputs);
}

function stableDraftManagerId(leagueId: string, teamId: string): string {
  return `manager-draft-${hashStringToUint32(`${leagueId}:${teamId}`).toString(16).padStart(8, "0")}`;
}

export async function persistDraftStaffForLeague(input: PersistDraftStaffInput): Promise<PersistDraftStaffResult> {
  const managers: ManagerProfile[] = [];
  const assignments: ManagerAssignment[] = [];
  const reporters: BeatReporter[] = [];

  for (const staff of input.staff) {
    const managerName = trimOrFallback(staff.managerName, `${staff.team.name} Manager`);
    const reporterName = trimOrFallback(staff.reporterName, `${staff.team.name} Beat`);
    const existingAssignment = await getManagerAssignment({
      teamId: staff.team.id,
      mode: "franchise",
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });
    const existingAssignedProfile = existingAssignment
      ? await getManagerProfile(existingAssignment.managerId)
      : null;
    const manager = await saveManagerProfile({
      managerId: existingAssignedProfile?.managerId ?? stableDraftManagerId(input.leagueId, staff.team.id),
      displayName: managerName,
      createdByUser: true,
      defaultManager: false,
      managementStyle: {
        label: staff.managerStyle,
      },
    });
    const assignment = await saveManagerAssignment({
      managerId: manager.managerId,
      teamId: staff.team.id,
      mode: "franchise",
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });
    await saveTeam({
      ...staff.team,
      managerId: manager.managerId,
      managerName: manager.displayName,
    });

    const voice = reporterVoice(staff.reporterPersona);
    const now = Date.now();
    const reporterBase = {
      teamId: staff.team.id,
      leagueId: input.leagueId,
      name: reporterName,
      personality: voice.personality,
      voiceStyle: voice.voiceStyle,
      eraFlavor: staff.team.era ?? "MODERN_LOCAL",
      avatarEra: staff.reporterAvatar,
      avatarColors: {
        primary: staff.team.colors.primary,
        secondary: staff.team.colors.secondary,
      },
      currentMood: voice.personality,
      moodMomentum: 0,
      createdAt: now,
      updatedAt: now,
    } satisfies Omit<BeatReporter, "id" | "changed_at">;

    const existingReporter = await getReporterForTeam(staff.team.id, input.leagueId);
    const reporter = existingReporter
      ? await updateReporter(existingReporter.id, {
          ...reporterBase,
          createdAt: existingReporter.createdAt,
        })
      : await createReporter(reporterBase);

    managers.push(manager);
    assignments.push(assignment);
    reporters.push(reporter);
  }

  return { managers, assignments, reporters };
}
