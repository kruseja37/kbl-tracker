import { SMB4_FIRST_NAMES, SMB4_LAST_NAMES } from "../../../data/smb4NameDatabase";
import type { ReporterAvatarEra, ReporterPersonality, VoiceStyle } from "../../../types/reporter";
import {
  deleteScoutProfilesForLeague,
  saveScoutProfile,
  saveTeam,
  type LeagueBuilderScoutProfile,
  type Team,
} from "../../../utils/leagueBuilderStorage";
import {
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  saveManagerAssignment,
  saveManagerProfile,
} from "../../../utils/managerIdentityStorage";
import { createReporter, getReporterForTeam, updateReporter } from "../../../utils/reporterStorage";
import {
  scoutAccuracy,
  type DraftPosition,
  type ProspectScoutDescriptor,
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
  "defense",
  "speed",
] as const satisfies readonly ScoutSpecialty[];

const SCOUT_ARCHETYPES = [
  {
    specialtyLabel: "Infielders",
    specialties: ["infield", "SS", "2B"],
    weaknesses: ["CP"],
    accuracyModifier: 2,
    summary: "Middle-infield reads are tight; bullpen projection is weaker.",
  },
  {
    specialtyLabel: "Arms",
    specialties: ["pitching", "SP", "SP/RP"],
    weaknesses: ["LF"],
    accuracyModifier: 1,
    summary: "Spots rotation arms and swingman value before the room catches up.",
  },
  {
    specialtyLabel: "Speed and glove",
    specialties: ["speed", "defense", "CF"],
    weaknesses: ["power"],
    accuracyModifier: 0,
    summary: "Sharp on defense-first athletes; skeptical of one-tool power.",
  },
  {
    specialtyLabel: "Power",
    specialties: ["power", "1B", "RF"],
    weaknesses: ["speed"],
    accuracyModifier: -1,
    summary: "Loves thump and corner bats; can miss late-blooming runners.",
  },
  {
    specialtyLabel: "Generalist",
    specialties: [],
    weaknesses: [],
    accuracyModifier: 4,
    summary: "No deep specialty, but the floor is steady across the board.",
  },
  {
    specialtyLabel: "Catchers",
    specialties: ["catching", "C"],
    weaknesses: ["CF"],
    accuracyModifier: 1,
    summary: "Finds receiving and game-calling value that public IV underweights.",
  },
] as const satisfies readonly {
  specialtyLabel: string;
  specialties: NonNullable<ProspectScoutDescriptor["specialties"]>;
  weaknesses: NonNullable<ProspectScoutDescriptor["weaknesses"]>;
  accuracyModifier: number;
  summary: string;
}[];

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

export function buildLiveScoutPool(leagueId: string, teamCount: number): LiveScoutCandidate[] {
  const scoutCount = Math.max(6, teamCount * 2);

  return Array.from({ length: scoutCount }, (_, index) => {
    const seed = `${leagueId}:live-scout:${index + 1}`;
    const archetype = SCOUT_ARCHETYPES[index % SCOUT_ARCHETYPES.length];
    const name = `${pickBySeed(SMB4_FIRST_NAMES, `${seed}:first`)} ${pickBySeed(SMB4_LAST_NAMES, `${seed}:last`)}`;
    const baseCandidate = {
      id: `live-scout-${leagueId}-${index + 1}`,
      leagueId,
      name,
      specialties: [...archetype.specialties],
      weaknesses: [...archetype.weaknesses],
      seed,
      specialtyLabel: archetype.specialtyLabel,
      summary: archetype.summary,
    };
    const accuracyByPosition = scoutAccuracyByPosition(baseCandidate);

    return {
      ...baseCandidate,
      accuracyByPosition,
      eye: averageAccuracy(accuracyByPosition) + archetype.accuracyModifier,
    };
  });
}

export async function persistScoutHiresForLeague(input: PersistScoutHiresInput): Promise<LeagueBuilderScoutProfile[]> {
  const pool = input.pool ?? buildLiveScoutPool(input.leagueId, input.teams.length);
  const candidateById = new Map(pool.map((candidate) => [candidate.id, candidate]));
  const assignedScoutIds = new Set<string>();
  const scoutInputs = input.teams.map((team, index) => {
    const selectedScoutId = input.selectedScoutIdsByTeamId[team.id];
    const candidate = selectedScoutId
      ? candidateById.get(selectedScoutId)
      : pool.find((scout) => !assignedScoutIds.has(scout.id));

    if (!candidate) {
      throw new Error(`No available scout for ${team.name}.`);
    }
    if (assignedScoutIds.has(candidate.id)) {
      throw new Error(`${candidate.name} has already been hired by another team.`);
    }

    assignedScoutIds.add(candidate.id);
    return toScoutProfileInput(candidate, team.id, index + 1);
  });

  await deleteScoutProfilesForLeague(input.leagueId);
  const savedScouts: LeagueBuilderScoutProfile[] = [];
  for (const scoutInput of scoutInputs) {
    savedScouts.push(await saveScoutProfile(scoutInput));
  }
  return savedScouts;
}

export async function persistDraftStaffForLeague(input: PersistDraftStaffInput): Promise<PersistDraftStaffResult> {
  const managers: ManagerProfile[] = [];
  const assignments: ManagerAssignment[] = [];
  const reporters: BeatReporter[] = [];

  for (const staff of input.staff) {
    const managerName = trimOrFallback(staff.managerName, `${staff.team.name} Manager`);
    const reporterName = trimOrFallback(staff.reporterName, `${staff.team.name} Beat`);
    const manager = await saveManagerProfile({
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
