import {
  SMB4_GRADE_NUMERIC_CENTERS,
  SMB4_PITCHER_POSITIONS,
  baseWeightedHitter,
  baseWeightedPitcher,
  scoreSmb4Player,
  type Smb4Grade,
  type Smb4GradeResult,
  type Smb4PlayerInput,
} from "./smb4GradeEmulator";
import {
  SMB4_STANDARD_TEAM_PROFILES,
  calculateTeamProfile,
  compareTeamProfiles,
  targetLevelsToTeamProfile,
  type Smb4TeamProfile,
  type Smb4TeamProfileDistance,
  type Smb4TeamProfileLevels,
} from "./smb4TeamProfileEngine";

export type Smb4GeneratedTraitMode = "none" | "exactlyOne" | "atLeastOne" | "exactlyTwo";
export type Smb4GeneratedTraitPolarity = "positive" | "negative" | "any";

export interface Smb4TraitPolicy {
  mode: Smb4GeneratedTraitMode;
  allowedPolarity?: Smb4GeneratedTraitPolarity;
}

export interface Smb4GenerationRequest {
  count: number;
  targetGrade: Smb4Grade;
  positions?: string[];
  traitPolicy?: Smb4TraitPolicy;
  seed?: number | string;
  maxAttemptsPerPlayer?: number;
}

export interface Smb4RosterGenerationRequest {
  teamName?: string;
  targetProfile?: Smb4TeamProfile | Smb4TeamProfileLevels;
  standardTeamProfileName?: keyof typeof SMB4_STANDARD_TEAM_PROFILES;
  positionPlan?: string[];
  gradePlan?: Smb4Grade[];
  traitPolicy?: Smb4TraitPolicy;
  seed?: number | string;
  candidatesPerSlot?: number;
  improvementPasses?: number;
  maxAttemptsPerPlayer?: number;
}

export interface Smb4StandardTeamRosterTemplate {
  teamName: string;
  positionPlan: readonly string[];
  gradePlan: readonly Smb4Grade[];
}

export interface Smb4GeneratedPlayer extends Smb4PlayerInput {
  armSlot?: null;
  targetGrade: Smb4Grade;
  generatedGrade: Smb4Grade;
  numericScore: number;
  baseWeighted: number;
  realismScore: number;
  generationNotes: string[];
}

export interface Smb4GeneratedRoster {
  teamName: string;
  players: Smb4GeneratedPlayer[];
  targetProfile: Smb4TeamProfile;
  profile: Smb4TeamProfile;
  profileDistance: Smb4TeamProfileDistance;
  gradeCounts: Partial<Record<Smb4Grade, number>>;
  positionCounts: Record<string, number>;
  warnings: string[];
}

export interface Smb4ProfileBarSummary {
  level: number;
  text: string;
}

export type Smb4ProfileBars = Record<keyof Smb4TeamProfileLevels, Smb4ProfileBarSummary>;

export interface Smb4RosterReportPlayer {
  name: string;
  primaryPosition: string;
  secondaryPosition: string;
  bats: string;
  throws: string;
  targetGrade: Smb4Grade;
  generatedGrade: Smb4Grade;
  numericScore: number;
  baseWeighted: number;
  realismScore: number;
  ratings: {
    power: number;
    contact: number;
    speed: number;
    fielding: number;
    arm: number;
    velocity: number;
    junk: number;
    accuracy: number;
  };
  traits: string[];
  arsenal: string[];
}

export interface Smb4RosterGenerationReport {
  teamName: string;
  targetTeamName?: string;
  profileCode: string;
  targetProfileCode: string;
  profileBars: Smb4ProfileBars;
  targetProfileBars: Smb4ProfileBars;
  profile: Smb4TeamProfile;
  targetProfile: Smb4TeamProfile;
  profileDistance: Smb4TeamProfileDistance;
  gradeCounts: Partial<Record<Smb4Grade, number>>;
  positionCounts: Record<string, number>;
  warnings: string[];
  players: Smb4RosterReportPlayer[];
}

interface RandomSource {
  next(): number;
  int(min: number, max: number): number;
  choice<T>(items: T[]): T;
  chance(probability: number): boolean;
}

const HITTER_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
const PITCHER_POSITIONS = ["SP", "RP", "CP", "SP/RP"];
const DEFAULT_ROSTER_POSITION_PLAN = [
  "C",
  "C",
  "1B",
  "1B",
  "2B",
  "2B",
  "3B",
  "SS",
  "LF",
  "LF",
  "CF",
  "RF",
  "RF",
  "SP",
  "SP",
  "SP",
  "SP",
  "SP/RP",
  "RP",
  "RP",
  "RP",
  "CP",
] as const;
const DEFAULT_ROSTER_GRADE_PLAN: Smb4Grade[] = [
  "A+",
  "A",
  "A-",
  "A-",
  "B+",
  "B+",
  "B+",
  "B+",
  "B",
  "B",
  "B",
  "B",
  "B-",
  "B-",
  "B-",
  "B-",
  "C+",
  "C+",
  "C+",
  "C+",
  "C",
  "C",
];

export const SMB4_STANDARD_TEAM_ROSTER_TEMPLATES: Record<string, Smb4StandardTeamRosterTemplate> = {
  Beewolves: {
    teamName: "Beewolves",
    positionPlan: ["2B", "SS", "1B", "LF", "RF", "CF", "3B", "C", "2B", "1B", "C", "LF", "RF", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "CP"],
    gradePlan: ["B+", "S", "B", "B", "B", "B", "B-", "B-", "B-", "B", "B-", "C+", "C", "S", "B+", "B", "C+", "B+", "C+", "C+", "C+", "C+"],
  },
  Blowfish: {
    teamName: "Blowfish",
    positionPlan: ["SS", "1B", "RF", "LF", "3B", "C", "2B", "RF", "2B", "C", "CF", "3B", "LF", "SP", "SP", "SP", "SP", "SP/RP", "SP", "RP", "RP", "CP"],
    gradePlan: ["A", "B-", "A-", "A-", "B+", "B+", "B", "B", "B", "B+", "C+", "C+", "C-", "A-", "B+", "B", "B", "C+", "D+", "B-", "C", "B+"],
  },
  Buzzards: {
    teamName: "Buzzards",
    positionPlan: ["SS", "1B", "3B", "C", "RF", "CF", "LF", "2B", "LF", "1B", "C", "2B", "SS", "SP", "SP", "SP", "SP", "SP/RP", "SP", "RP", "RP", "CP"],
    gradePlan: ["A", "B", "A-", "A-", "B+", "B+", "B-", "B-", "B-", "B", "C", "B-", "B", "A-", "B", "C+", "C-", "B", "B-", "A-", "D+", "B"],
  },
  Crocodons: {
    teamName: "Crocodons",
    positionPlan: ["1B", "2B", "3B", "C", "RF", "CF", "RF", "SS", "CF", "C", "LF", "3B", "1B", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "CP"],
    gradePlan: ["B", "A-", "B+", "B", "B+", "B", "B+", "B", "C+", "B-", "C+", "B-", "C-", "S", "A", "A-", "C+", "A", "B", "C", "D+", "B+"],
  },
  Freebooters: {
    teamName: "Freebooters",
    positionPlan: ["CF", "RF", "1B", "SS", "LF", "1B", "2B", "C", "LF", "RF", "2B", "3B", "C", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "CP"],
    gradePlan: ["B+", "B+", "B-", "A-", "B-", "B", "B-", "C+", "B-", "C", "C", "C", "C", "A-", "A-", "B+", "C", "B-", "A", "A-", "B", "S"],
  },
  Grapplers: {
    teamName: "Grapplers",
    positionPlan: ["3B", "1B", "RF", "RF", "CF", "2B", "3B", "C", "LF", "SS", "LF", "1B", "C", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "RP"],
    gradePlan: ["A-", "A-", "A-", "B", "B", "B-", "B-", "C", "C+", "C+", "C+", "C+", "C", "A-", "B+", "C+", "C-", "C+", "A+", "A+", "B+", "C"],
  },
  Heaters: {
    teamName: "Heaters",
    positionPlan: ["CF", "LF", "3B", "1B", "SS", "C", "2B", "CF", "2B", "C", "LF", "SS", "RF", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "RP"],
    gradePlan: ["A", "A-", "B", "B", "A-", "B", "B-", "B-", "C+", "B", "C+", "C+", "C+", "S", "A", "B-", "C-", "C-", "A+", "B-", "C-", "C-"],
  },
  Herbisaurs: {
    teamName: "Herbisaurs",
    positionPlan: ["LF", "3B", "1B", "RF", "SS", "CF", "2B", "C", "SS", "LF", "RF", "C", "2B", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "CP"],
    gradePlan: ["A-", "B+", "B+", "B", "B", "B", "B", "B-", "B-", "C+", "C+", "C+", "C", "A-", "B+", "B", "B", "A-", "A", "C+", "D+", "C-"],
  },
  "Hot Corners": {
    teamName: "Hot Corners",
    positionPlan: ["LF", "CF", "SS", "2B", "3B", "1B", "CF", "C", "1B", "2B", "LF", "RF", "C", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "CP"],
    gradePlan: ["B+", "A-", "B+", "B+", "B+", "B", "B", "B-", "B-", "B-", "B-", "C+", "D+", "A-", "B+", "B+", "C", "C+", "B+", "B+", "B-", "B+"],
  },
  Jacks: {
    teamName: "Jacks",
    positionPlan: ["LF", "2B", "3B", "LF", "CF", "SS", "1B", "C", "3B", "RF", "2B", "CF", "C", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "CP"],
    gradePlan: ["B+", "B+", "A", "B", "B+", "B-", "B-", "B", "B", "C+", "B-", "B", "B", "B+", "B-", "C+", "C", "B+", "A+", "B+", "C-", "A-"],
  },
  Moonstars: {
    teamName: "Moonstars",
    positionPlan: ["3B", "SS", "1B", "LF", "C", "CF", "RF", "2B", "1B", "SS", "3B", "C", "LF", "RF", "SP", "SP", "SP", "SP", "SP", "RP", "RP", "CP"],
    gradePlan: ["B-", "A-", "B+", "B-", "B", "B", "C+", "C+", "C+", "C", "C", "C+", "C", "C+", "S", "A+", "B+", "B-", "B-", "B+", "B+", "B+"],
  },
  Moose: {
    teamName: "Moose",
    positionPlan: ["CF", "3B", "1B", "RF", "SS", "LF", "2B", "C", "LF", "C", "RF", "1B", "SS", "SP", "SP", "SP", "SP", "SP/RP", "SP", "RP", "RP", "CP"],
    gradePlan: ["B+", "B", "B-", "B", "B", "B-", "B", "B-", "B", "B-", "B", "C", "C", "A-", "B+", "B", "B", "B", "C-", "A+", "B-", "B+"],
  },
  Nemesis: {
    teamName: "Nemesis",
    positionPlan: ["CF", "SS", "2B", "3B", "1B", "RF", "C", "LF", "CF", "SS", "2B", "RF", "C", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "CP"],
    gradePlan: ["A+", "A+", "B+", "A-", "B+", "A-", "B+", "B-", "B-", "B-", "C+", "C+", "B-", "A-", "B+", "B-", "C", "C", "B-", "C+", "C-", "B-"],
  },
  Overdogs: {
    teamName: "Overdogs",
    positionPlan: ["LF", "1B", "SS", "3B", "C", "LF", "2B", "CF", "RF", "1B", "C", "3B", "SS", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "RP"],
    gradePlan: ["B", "S", "B+", "A-", "B+", "B", "B+", "C+", "B-", "B-", "B-", "C+", "D", "B", "B", "B-", "C", "B+", "B+", "B", "B-", "B-"],
  },
  Platypi: {
    teamName: "Platypi",
    positionPlan: ["2B", "3B", "RF", "LF", "CF", "1B", "SS", "C", "2B", "LF", "3B", "RF", "C", "SP", "SP", "SP", "SP/RP", "SP", "SP", "RP", "RP", "RP"],
    gradePlan: ["B+", "A", "B+", "B", "B+", "B", "B+", "B-", "B-", "C+", "C+", "B-", "C", "A", "B+", "C+", "B+", "B-", "D", "A-", "C", "C"],
  },
  Sandcats: {
    teamName: "Sandcats",
    positionPlan: ["SS", "RF", "1B", "1B", "CF", "C", "CF", "2B", "3B", "2B", "LF", "LF", "C", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "RP"],
    gradePlan: ["B-", "A", "B", "B", "A-", "B", "B", "B-", "C+", "C+", "C+", "C+", "C", "A-", "C+", "C", "C-", "A-", "A", "A-", "C", "A-"],
  },
  Sawteeth: {
    teamName: "Sawteeth",
    positionPlan: ["CF", "RF", "C", "SS", "RF", "3B", "2B", "1B", "C", "LF", "SS", "CF", "2B", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "CP"],
    gradePlan: ["A-", "B+", "B-", "B+", "B+", "B", "B-", "C", "B", "B-", "C+", "B", "B-", "B+", "B", "B-", "C+", "B-", "B+", "B-", "B-", "A"],
  },
  Sirloins: {
    teamName: "Sirloins",
    positionPlan: ["1B", "RF", "2B", "LF", "3B", "SS", "C", "CF", "C", "CF", "3B", "LF", "1B", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "CP"],
    gradePlan: ["B+", "A+", "A-", "C+", "B", "B", "B-", "B", "C+", "B-", "B", "C+", "C+", "A+", "B+", "B+", "B", "C+", "A", "C", "C", "C+"],
  },
  Wideloads: {
    teamName: "Wideloads",
    positionPlan: ["SS", "1B", "3B", "SS", "C", "CF", "RF", "CF", "2B", "2B", "C", "LF", "LF", "SP", "SP", "SP", "SP", "SP/RP", "RP", "RP", "RP", "CP"],
    gradePlan: ["A-", "B+", "A", "A-", "B+", "B+", "B-", "B", "B", "B-", "C+", "C", "C", "A-", "A-", "B-", "B-", "B+", "B+", "B-", "C+", "B-"],
  },
  "Wild Pigs": {
    teamName: "Wild Pigs",
    positionPlan: ["SS", "SS", "1B", "RF", "LF", "C", "CF", "3B", "2B", "C", "2B", "LF", "CF", "SP", "SP", "SP", "SP", "SP/RP", "SP", "RP", "RP", "RP"],
    gradePlan: ["A", "B+", "B+", "B", "B-", "B+", "B-", "C+", "B-", "C+", "C+", "C+", "C+", "A", "B", "B", "B", "B-", "C+", "A+", "B+", "C+"],
  },
};

const SECONDARY_BY_PRIMARY: Record<string, string[]> = {
  C: ["", "1B"],
  "1B": ["", "3B", "C", "OF", "1B/OF"],
  "2B": ["", "SS", "3B", "IF", "IF/OF"],
  "3B": ["", "1B", "SS", "IF", "IF/OF"],
  SS: ["", "2B", "3B", "IF", "IF/OF"],
  LF: ["", "RF", "OF", "1B/OF"],
  CF: ["", "OF", "RF", "LF"],
  RF: ["", "LF", "OF", "1B/OF"],
  SP: [""],
  RP: [""],
  CP: [""],
  "SP/RP": [""],
};

const HITTER_POSITION_BIAS: Record<string, Partial<Record<"power" | "contact" | "speed" | "fielding" | "arm", number>>> = {
  C: { speed: -10, fielding: 10, arm: 10 },
  "1B": { power: 15, speed: -10, fielding: -5 },
  "2B": { power: -10, contact: 5, speed: 5 },
  SS: { power: -10, speed: 5, fielding: 10, arm: 5 },
  "3B": { power: 10, speed: -10, arm: 5 },
  LF: { power: 10, fielding: -5, arm: -5 },
  CF: { power: -10, speed: 15, fielding: 5 },
  RF: { power: 5, speed: -5, arm: 10 },
};

const HITTER_POSITIVE_TRAITS = [
  "Cannon Arm",
  "Durable",
  "First Pitch Slayer",
  "Sprinter",
  "Tough Out",
  "Stealer",
  "Sign Stealer",
  "Mind Gamer",
  "Distractor",
  "Bad Ball Hitter",
  "Pinch Perfect",
  "Base Rounder",
  "Magic Hands",
  "Fastball Hitter",
  "Off-Speed Hitter",
  "Low Pitch",
  "High Pitch",
  "Inside Pitch",
  "Outside Pitch",
  "Metal Head",
  "Consistent",
  "Two Way",
  "Clutch",
  "Dive Wizard",
  "Rally Starter",
  "RBI Hero",
  "CON vs LHP",
  "CON vs RHP",
  "POW vs LHP",
  "POW vs RHP",
  "Ace Exterminator",
  "Bunter",
  "Utility",
  "Big Hack",
  "Little Hack",
];

const PITCHER_POSITIVE_TRAITS = [
  "K Collector",
  "Specialist",
  "Reverse Splits",
  "Pick Officer",
  "Composed",
  "Gets Ahead",
  "Rally Stopper",
  "Clutch",
  "Stimulated",
  "Durable",
  "Consistent",
  "Workhorse",
  "Elite 4F",
  "Elite 2F",
  "Elite CF",
  "Elite FK",
  "Elite SL",
  "Elite CB",
  "Elite CH",
  "Elite SB",
];

const NEGATIVE_TRAITS = [
  "K Neglecter",
  "Whiffer",
  "Slow Poke",
  "First Pitch Prayer",
  "Injury Prone",
  "Noodle Arm",
  "Bad Jumps",
  "Easy Jumps",
  "Wild Thrower",
  "Easy Target",
  "Base Jogger",
  "BB Prone",
  "Butter Fingers",
  "Volatile",
  "Choker",
  "Meltdown",
  "Surrounded",
  "Wild Thing",
  "RBI Zero",
  "Falls Behind",
  "Crossed Up",
];

const ELITE_TRAIT_TO_PITCH: Record<string, string> = {
  "Elite 2F": "2F",
  "Elite 4F": "4F",
  "Elite CB": "CB",
  "Elite CF": "CF",
  "Elite CH": "CH",
  "Elite FK": "FK",
  "Elite SB": "SB",
  "Elite SL": "SL",
};

const ALL_PITCH_TYPES = ["4F", "2F", "CF", "SL", "CB", "CH", "FK", "SB"];
const FASTBALL_PITCH_TYPES = ["4F", "2F", "CF"];
const OFFSPEED_PITCH_TYPES = ["SL", "CB", "CH", "FK", "SB"];
const PROFILE_CODE_PREFIX: Record<keyof Smb4TeamProfileLevels, string> = {
  power: "P",
  contact: "C",
  speed: "S",
  rotation: "R",
  bullpen: "B",
};
const PROFILE_CATEGORY_ORDER: Array<keyof Smb4TeamProfileLevels> = ["power", "contact", "speed", "rotation", "bullpen"];

function hashSeed(seed: number | string | undefined): number {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  const text = String(seed ?? "smb4-generator");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed?: number | string): RandomSource {
  let state = hashSeed(seed);
  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    choice<T>(items: T[]) {
      return items[Math.floor(next() * items.length)];
    },
    chance(probability: number) {
      return next() < probability;
    },
  };
}

function clampRating(value: number): number {
  return Math.max(0, Math.min(99, Math.round(value)));
}

function toRatingNumber(value: number | string | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function splitArsenal(arsenal: Smb4PlayerInput["arsenal"]): string[] {
  if (Array.isArray(arsenal)) return arsenal.map((pitch) => pitch.trim()).filter(Boolean);
  return String(arsenal || "")
    .split(/[|,]/)
    .map((pitch) => pitch.trim())
    .filter(Boolean);
}

function isPitcherPosition(position: string): boolean {
  return SMB4_PITCHER_POSITIONS.has(position);
}

function isTeamProfile(value: Smb4TeamProfile | Smb4TeamProfileLevels | undefined): value is Smb4TeamProfile {
  return Boolean(value && "rawScores" in value && "levels" in value);
}

function resolveRosterTargetProfile(request: Smb4RosterGenerationRequest): Smb4TeamProfile {
  if (request.standardTeamProfileName) {
    return SMB4_STANDARD_TEAM_PROFILES[request.standardTeamProfileName];
  }
  if (isTeamProfile(request.targetProfile)) {
    return request.targetProfile;
  }
  if (request.targetProfile) {
    return targetLevelsToTeamProfile(request.targetProfile, request.teamName ?? "Generated Target");
  }

  return targetLevelsToTeamProfile(
    {
      power: 3,
      contact: 3,
      speed: 3,
      rotation: 3,
      bullpen: 3,
    },
    request.teamName ?? "Balanced Target",
  );
}

function normalizePlan(plan: readonly string[] | undefined): string[] {
  return (plan && plan.length > 0 ? plan : DEFAULT_ROSTER_POSITION_PLAN).map((position) => position.trim().toUpperCase());
}

function standardRosterTemplateFor(teamName: string | undefined): Smb4StandardTeamRosterTemplate | undefined {
  return teamName ? SMB4_STANDARD_TEAM_ROSTER_TEMPLATES[teamName] : undefined;
}

function resolveRosterPositionPlan(request: Smb4RosterGenerationRequest): string[] {
  const template = standardRosterTemplateFor(request.standardTeamProfileName);
  const explicitPlan = request.positionPlan && request.positionPlan.length > 0 ? request.positionPlan : undefined;
  return normalizePlan(explicitPlan ?? template?.positionPlan);
}

function resolveRosterGradePlan(request: Smb4RosterGenerationRequest): readonly Smb4Grade[] {
  const template = standardRosterTemplateFor(request.standardTeamProfileName);
  return request.gradePlan && request.gradePlan.length > 0 ? request.gradePlan : (template?.gradePlan ?? DEFAULT_ROSTER_GRADE_PLAN);
}

function gradeForSlot(gradePlan: readonly Smb4Grade[], index: number): Smb4Grade {
  return gradePlan[index % gradePlan.length];
}

function choosePrimary(request: Smb4GenerationRequest, rng: RandomSource, index: number): string {
  if (request.positions && request.positions.length > 0) {
    return request.positions[index % request.positions.length].trim().toUpperCase();
  }

  return rng.chance(0.59) ? rng.choice(HITTER_POSITIONS) : rng.choice(PITCHER_POSITIONS);
}

function chooseBatsThrows(position: string, rng: RandomSource): { bats: string; throws: string } {
  const bats = isPitcherPosition(position)
    ? rng.choice(["R", "R", "L", "L", "S"])
    : rng.choice(["R", "R", "R", "L", "L", "S"]);
  const throws = rng.chance(0.26) ? "L" : "R";
  return { bats, throws };
}

function chooseTraits(position: string, policy: Smb4TraitPolicy | undefined, rng: RandomSource): [string, string] {
  const mode = policy?.mode ?? "none";
  if (mode === "none") return ["", ""];

  const count = mode === "exactlyTwo" ? 2 : mode === "exactlyOne" ? 1 : rng.chance(0.7) ? 1 : 2;
  const polarity = policy?.allowedPolarity ?? "positive";
  const positivePool = isPitcherPosition(position) ? PITCHER_POSITIVE_TRAITS : HITTER_POSITIVE_TRAITS;
  const selected: string[] = [];

  while (selected.length < count) {
    const pool =
      polarity === "negative"
        ? NEGATIVE_TRAITS
        : polarity === "any" && rng.chance(0.18)
          ? NEGATIVE_TRAITS
          : positivePool;
    const trait = rng.choice(pool);
    if (!selected.includes(trait)) selected.push(trait);
  }

  return [selected[0] ?? "", selected[1] ?? ""];
}

function buildArsenal(position: string, junk: number, traits: string[], rng: RandomSource): string {
  const forced = traits.map((trait) => ELITE_TRAIT_TO_PITCH[trait]).filter(Boolean);
  const pitches = Array.from(new Set(forced));
  const baseTargetCount =
    position === "SP"
      ? rng.choice([4, 4, 5, 5, 5])
      : position === "SP/RP"
        ? rng.choice([3, 4, 4, 5])
        : position === "CP"
          ? rng.choice([2, 2, 3])
          : rng.choice([2, 3, 3, 3, 4]);
  const pool =
    junk >= 75
      ? ["CF", "CB", "SL", "CH", "FK", "SB", "4F", "2F"]
        : junk <= 40
          ? ["4F", "2F", "CF", "SL", "CH", "CB", "FK", "SB"]
          : ["4F", "CF", "SL", "CB", "CH", "2F", "FK", "SB"];
  const needsFastball = !pitches.some((pitch) => FASTBALL_PITCH_TYPES.includes(pitch));
  const needsOffspeed = !pitches.some((pitch) => OFFSPEED_PITCH_TYPES.includes(pitch));
  const requiredFamilySlots = Number(needsFastball) + Number(needsOffspeed);
  const targetCount = Math.min(5, Math.max(2, baseTargetCount, pitches.length + requiredFamilySlots));

  if (needsFastball) {
    const fastball = FASTBALL_PITCH_TYPES.find((pitch) => pool.includes(pitch)) ?? "4F";
    pitches.push(fastball);
  }

  if (needsOffspeed) {
    const offspeed = OFFSPEED_PITCH_TYPES.find((pitch) => pool.includes(pitch)) ?? "SL";
    pitches.push(offspeed);
  }

  for (const pitch of pool) {
    if (pitches.length >= targetCount) break;
    if (!pitches.includes(pitch)) pitches.push(pitch);
  }

  while (pitches.length < targetCount) {
    const pitch = rng.choice(ALL_PITCH_TYPES);
    if (!pitches.includes(pitch)) pitches.push(pitch);
  }

  return pitches.sort(() => rng.next() - 0.5).join("|");
}

function createCandidate(position: string, targetGrade: Smb4Grade, policy: Smb4TraitPolicy | undefined, rng: RandomSource): Smb4PlayerInput {
  const targetNumeric = SMB4_GRADE_NUMERIC_CENTERS[targetGrade];
  const [trait1, trait2] = chooseTraits(position, policy, rng);
  const { bats, throws } = chooseBatsThrows(position, rng);

  if (isPitcherPosition(position)) {
    const requiredBase = Math.max(18, Math.min(96, targetNumeric - 15));
    const roleBias =
      position === "SP"
        ? { velocity: -2, junk: -3, accuracy: 5 }
        : position === "CP"
          ? { velocity: 8, junk: 5, accuracy: -13 }
          : position === "SP/RP"
            ? { velocity: 3, junk: 2, accuracy: 0 }
            : rng.choice([
                { velocity: 10, junk: -2, accuracy: -8 },
                { velocity: -8, junk: 10, accuracy: -2 },
                { velocity: 2, junk: 2, accuracy: 0 },
              ]);
    const velocity = clampRating(requiredBase + roleBias.velocity + rng.int(-10, 10));
    const junk = clampRating(requiredBase + roleBias.junk + rng.int(-10, 10));
    const accuracy = clampRating(requiredBase + roleBias.accuracy + rng.int(-10, 10));

    return {
      name: "Generated Pitcher",
      primaryPosition: position,
      secondaryPosition: "",
      bats,
      throws,
      trait1,
      trait2,
      power: rng.int(0, 35),
      contact: rng.int(0, 40),
      speed: rng.int(0, 60),
      fielding: rng.int(20, 80),
      arm: 0,
      velocity,
      junk,
      accuracy,
      arsenal: buildArsenal(position, junk, [trait1, trait2].filter(Boolean), rng),
    };
  }

  const requiredBase = Math.max(15, Math.min(92, targetNumeric - 10));
  const bias = HITTER_POSITION_BIAS[position] ?? {};
  const secondary = rng.choice(SECONDARY_BY_PRIMARY[position] ?? [""]);

  return {
    name: "Generated Hitter",
    primaryPosition: position,
    secondaryPosition: secondary,
    bats,
    throws,
    trait1,
    trait2,
    power: clampRating(requiredBase + (bias.power ?? 0) + rng.int(-10, 10)),
    contact: clampRating(requiredBase + (bias.contact ?? 0) + rng.int(-10, 10)),
    speed: clampRating(requiredBase + (bias.speed ?? 0) + rng.int(-10, 10)),
    fielding: clampRating(requiredBase + (bias.fielding ?? 0) + rng.int(-10, 10)),
    arm: clampRating(requiredBase + (bias.arm ?? 0) + rng.int(-10, 10)),
    velocity: 0,
    junk: 0,
    accuracy: 0,
  };
}

function applyProfileBias(candidate: Smb4PlayerInput, targetProfile: Smb4TeamProfile, rng: RandomSource): Smb4PlayerInput {
  const position = (candidate.primaryPosition || "").trim().toUpperCase();
  const biased = { ...candidate };

  if (isPitcherPosition(position)) {
    const targetScore =
      position === "SP" || position === "SP/RP" ? targetProfile.rawScores.rotation : targetProfile.rawScores.bullpen;
    const currentScore = baseWeightedPitcher(
      toRatingNumber(candidate.velocity),
      toRatingNumber(candidate.junk),
      toRatingNumber(candidate.accuracy),
    );
    const delta = (targetScore - currentScore) * 0.72;
    const roleShape =
      position === "CP"
        ? { velocity: 4, junk: 2, accuracy: -3 }
        : position === "RP"
          ? rng.choice([
              { velocity: 4, junk: -1, accuracy: -2 },
              { velocity: -2, junk: 4, accuracy: -1 },
              { velocity: 1, junk: 1, accuracy: 1 },
            ])
          : { velocity: -1, junk: -1, accuracy: 3 };

    biased.velocity = clampRating(toRatingNumber(candidate.velocity) + delta + roleShape.velocity + rng.int(-4, 4));
    biased.junk = clampRating(toRatingNumber(candidate.junk) + delta + roleShape.junk + rng.int(-4, 4));
    biased.accuracy = clampRating(toRatingNumber(candidate.accuracy) + delta + roleShape.accuracy + rng.int(-4, 4));
    biased.arsenal = buildArsenal(position, toRatingNumber(biased.junk), [biased.trait1, biased.trait2].filter(Boolean) as string[], rng);
    return biased;
  }

  const targetPower = targetProfile.rawScores.power;
  const targetContact = targetProfile.rawScores.contact;
  const targetSpeed = targetProfile.rawScores.speed;
  biased.power = clampRating(toRatingNumber(candidate.power) + (targetPower - toRatingNumber(candidate.power)) * 0.64 + rng.int(-5, 5));
  biased.contact = clampRating(
    toRatingNumber(candidate.contact) + (targetContact - toRatingNumber(candidate.contact)) * 0.64 + rng.int(-5, 5),
  );
  biased.speed = clampRating(toRatingNumber(candidate.speed) + (targetSpeed - toRatingNumber(candidate.speed)) * 0.64 + rng.int(-5, 5));

  return biased;
}

function ratingKeysFor(player: Smb4PlayerInput): Array<keyof Smb4PlayerInput> {
  const position = (player.primaryPosition || "").trim().toUpperCase();
  return isPitcherPosition(position)
    ? ["velocity", "junk", "accuracy", "power", "contact", "speed"]
    : ["power", "contact", "speed", "fielding", "arm"];
}

function withRatingDelta(player: Smb4PlayerInput, key: keyof Smb4PlayerInput, delta: number): Smb4PlayerInput {
  const current = typeof player[key] === "number" ? (player[key] as number) : Number(player[key] || 0);
  return {
    ...player,
    [key]: clampRating(current + delta),
  };
}

function tuneCandidate(candidate: Smb4PlayerInput, targetGrade: Smb4Grade): { player: Smb4PlayerInput; result: Smb4GradeResult } {
  const targetNumeric = SMB4_GRADE_NUMERIC_CENTERS[targetGrade];
  let bestPlayer = candidate;
  let bestResult = scoreSmb4Player(candidate);
  let bestError = Math.abs(bestResult.numericScore - targetNumeric);
  let currentPlayer = candidate;

  for (let iteration = 0; iteration < 90; iteration += 1) {
    const currentResult = scoreSmb4Player(currentPlayer);
    if (currentResult.grade === targetGrade && Math.abs(currentResult.numericScore - targetNumeric) <= 2.25) {
      return { player: currentPlayer, result: currentResult };
    }

    const direction = currentResult.numericScore < targetNumeric ? 1 : -1;
    let localBestPlayer = currentPlayer;
    let localBestResult = currentResult;
    let localBestError = Math.abs(currentResult.numericScore - targetNumeric);

    for (const step of [8, 5, 3, 2, 1]) {
      for (const key of ratingKeysFor(currentPlayer)) {
        const nextPlayer = withRatingDelta(currentPlayer, key, direction * step);
        const nextResult = scoreSmb4Player(nextPlayer);
        const nextError = Math.abs(nextResult.numericScore - targetNumeric);
        const betterGrade = nextResult.grade === targetGrade && localBestResult.grade !== targetGrade;
        const closer = nextError + 0.05 < localBestError;

        if (betterGrade || closer) {
          localBestPlayer = nextPlayer;
          localBestResult = nextResult;
          localBestError = nextError;
        }
      }
    }

    if (localBestError < bestError || (localBestResult.grade === targetGrade && bestResult.grade !== targetGrade)) {
      bestPlayer = localBestPlayer;
      bestResult = localBestResult;
      bestError = localBestError;
    }

    if (localBestPlayer === currentPlayer) break;
    currentPlayer = localBestPlayer;
  }

  return { player: bestPlayer, result: bestResult };
}

function calculateRealismScore(player: Smb4PlayerInput): number {
  const position = (player.primaryPosition || "").trim().toUpperCase();
  if (isPitcherPosition(position)) {
    const base = baseWeightedPitcher(Number(player.velocity || 0), Number(player.junk || 0), Number(player.accuracy || 0));
    const arsenalCount = String(player.arsenal || "").split(/[|,]/).filter(Boolean).length;
    const arsenalPenalty = position === "SP" && arsenalCount < 4 ? 10 : position === "CP" && arsenalCount > 4 ? 6 : 0;
    return Math.max(0, 100 - Math.abs(base - 60) * 0.35 - arsenalPenalty);
  }

  const base = baseWeightedHitter(
    Number(player.power || 0),
    Number(player.contact || 0),
    Number(player.speed || 0),
    Number(player.fielding || 0),
    Number(player.arm || 0),
  );
  const bias = HITTER_POSITION_BIAS[position] ?? {};
  const positionShapePenalty =
    (bias.power && Number(player.power || 0) < 35 ? 8 : 0) +
    (bias.speed && bias.speed > 0 && Number(player.speed || 0) < 45 ? 8 : 0) +
    (bias.fielding && bias.fielding > 0 && Number(player.fielding || 0) < 45 ? 8 : 0);

  return Math.max(0, 100 - Math.abs(base - 58) * 0.25 - positionShapePenalty);
}

function finalizeGeneratedPlayer(
  player: Smb4PlayerInput,
  targetGrade: Smb4Grade,
  result: Smb4GradeResult,
  index: number,
): Smb4GeneratedPlayer {
  const position = (player.primaryPosition || "P").trim().toUpperCase();
  const generatedName =
    !player.name || player.name === "Generated Hitter" || player.name === "Generated Pitcher"
      ? `Generated ${position} ${index + 1}`
      : player.name;
  const generationNotes =
    result.grade === targetGrade
      ? ["Matched target grade with local rating search."]
      : [`Closest candidate was ${result.grade}, not target ${targetGrade}.`];

  return {
    ...player,
    name: generatedName,
    armSlot: null,
    targetGrade,
    generatedGrade: result.grade,
    numericScore: Number(result.numericScore.toFixed(4)),
    baseWeighted: Number(result.baseWeighted.toFixed(4)),
    realismScore: Number(calculateRealismScore(player).toFixed(2)),
    generationNotes,
  };
}

export function generateSmb4Players(request: Smb4GenerationRequest): Smb4GeneratedPlayer[] {
  const rng = createRandom(request.seed);
  const count = Math.max(0, Math.floor(request.count));
  const maxAttempts = request.maxAttemptsPerPlayer ?? 300;
  const generated: Smb4GeneratedPlayer[] = [];

  for (let index = 0; index < count; index += 1) {
    const position = choosePrimary(request, rng, index);
    let bestPlayer: Smb4PlayerInput | null = null;
    let bestResult: Smb4GradeResult | null = null;
    let bestError = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = createCandidate(position, request.targetGrade, request.traitPolicy, rng);
      const tuned = tuneCandidate(candidate, request.targetGrade);
      const error = Math.abs(tuned.result.numericScore - SMB4_GRADE_NUMERIC_CENTERS[request.targetGrade]);

      if (tuned.result.grade === request.targetGrade) {
        bestPlayer = tuned.player;
        bestResult = tuned.result;
        break;
      }

      if (error < bestError) {
        bestPlayer = tuned.player;
        bestResult = tuned.result;
        bestError = error;
      }
    }

    if (!bestPlayer || !bestResult) {
      throw new Error(`Unable to generate player ${index + 1}; no candidate was produced.`);
    }

    generated.push(finalizeGeneratedPlayer(bestPlayer, request.targetGrade, bestResult, index));
  }

  return generated;
}

function generateRosterSlotCandidates(
  slotIndex: number,
  position: string,
  targetGrade: Smb4Grade,
  targetProfile: Smb4TeamProfile,
  request: Smb4RosterGenerationRequest,
  rng: RandomSource,
): Smb4GeneratedPlayer[] {
  const candidates: Smb4GeneratedPlayer[] = [];
  const candidatesPerSlot = Math.max(1, Math.floor(request.candidatesPerSlot ?? 18));
  const maxAttempts = request.maxAttemptsPerPlayer ?? 180;

  for (let candidateIndex = 0; candidateIndex < candidatesPerSlot; candidateIndex += 1) {
    let bestPlayer: Smb4PlayerInput | null = null;
    let bestResult: Smb4GradeResult | null = null;
    let bestError = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = createCandidate(position, targetGrade, request.traitPolicy, rng);
      const biased = applyProfileBias(candidate, targetProfile, rng);
      const tuned = tuneCandidate(biased, targetGrade);
      const gradePenalty = tuned.result.grade === targetGrade ? 0 : 25;
      const error = gradePenalty + Math.abs(tuned.result.numericScore - SMB4_GRADE_NUMERIC_CENTERS[targetGrade]);

      if (error < bestError) {
        bestPlayer = tuned.player;
        bestResult = tuned.result;
        bestError = error;
      }

      if (tuned.result.grade === targetGrade && Math.abs(tuned.result.numericScore - SMB4_GRADE_NUMERIC_CENTERS[targetGrade]) <= 1.2) {
        break;
      }
    }

    if (!bestPlayer || !bestResult) {
      throw new Error(`Unable to generate roster slot ${slotIndex + 1}; no candidate was produced.`);
    }

    const generated = finalizeGeneratedPlayer(bestPlayer, targetGrade, bestResult, slotIndex);
    generated.name = `${generated.name}.${candidateIndex + 1}`;
    candidates.push(generated);
  }

  return candidates;
}

function gradeCounts(players: Smb4GeneratedPlayer[]): Partial<Record<Smb4Grade, number>> {
  const counts: Partial<Record<Smb4Grade, number>> = {};
  for (const player of players) {
    counts[player.generatedGrade] = (counts[player.generatedGrade] ?? 0) + 1;
  }
  return counts;
}

function positionCounts(players: Smb4GeneratedPlayer[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const player of players) {
    const position = (player.primaryPosition || "").trim().toUpperCase();
    counts[position] = (counts[position] ?? 0) + 1;
  }
  return counts;
}

function rosterProfileScore(players: Smb4GeneratedPlayer[], targetProfile: Smb4TeamProfile): number {
  const profile = calculateTeamProfile(players);
  const distance = compareTeamProfiles(profile, targetProfile);
  const gradeMismatchPenalty = players.filter((player) => player.generatedGrade !== player.targetGrade).length * 8;
  return distance.totalDistance + gradeMismatchPenalty;
}

export function profileLevelsToCode(levels: Smb4TeamProfileLevels): string {
  return PROFILE_CATEGORY_ORDER.map((category) => `${PROFILE_CODE_PREFIX[category]}${levels[category]}`).join("-");
}

export function profileLevelsToBars(levels: Smb4TeamProfileLevels): Smb4ProfileBars {
  return Object.fromEntries(
    PROFILE_CATEGORY_ORDER.map((category) => [
      category,
      {
        level: levels[category],
        text: "#".repeat(levels[category]) + ".".repeat(6 - levels[category]),
      },
    ]),
  ) as Smb4ProfileBars;
}

function reportPlayer(player: Smb4GeneratedPlayer): Smb4RosterReportPlayer {
  return {
    name: String(player.name || ""),
    primaryPosition: String(player.primaryPosition || ""),
    secondaryPosition: String(player.secondaryPosition || ""),
    bats: String(player.bats || ""),
    throws: String(player.throws || ""),
    targetGrade: player.targetGrade,
    generatedGrade: player.generatedGrade,
    numericScore: player.numericScore,
    baseWeighted: player.baseWeighted,
    realismScore: player.realismScore,
    ratings: {
      power: toRatingNumber(player.power),
      contact: toRatingNumber(player.contact),
      speed: toRatingNumber(player.speed),
      fielding: toRatingNumber(player.fielding),
      arm: toRatingNumber(player.arm),
      velocity: toRatingNumber(player.velocity),
      junk: toRatingNumber(player.junk),
      accuracy: toRatingNumber(player.accuracy),
    },
    traits: [String(player.trait1 || ""), String(player.trait2 || "")].filter(Boolean),
    arsenal: splitArsenal(player.arsenal),
  };
}

export function summarizeSmb4Roster(roster: Smb4GeneratedRoster): Smb4RosterGenerationReport {
  return {
    teamName: roster.teamName,
    targetTeamName: roster.targetProfile.teamName,
    profileCode: profileLevelsToCode(roster.profile.levels),
    targetProfileCode: profileLevelsToCode(roster.targetProfile.levels),
    profileBars: profileLevelsToBars(roster.profile.levels),
    targetProfileBars: profileLevelsToBars(roster.targetProfile.levels),
    profile: roster.profile,
    targetProfile: roster.targetProfile,
    profileDistance: roster.profileDistance,
    gradeCounts: roster.gradeCounts,
    positionCounts: roster.positionCounts,
    warnings: roster.warnings,
    players: roster.players.map(reportPlayer),
  };
}

function formatCountMap(counts: Record<string, number> | Partial<Record<Smb4Grade, number>>): string {
  return Object.entries(counts)
    .filter(([, count]) => Number(count) > 0)
    .map(([key, count]) => `${key}: ${count}`)
    .join(", ");
}

function formatReportPosition(player: Smb4RosterReportPlayer): string {
  if (!player.secondaryPosition) return player.primaryPosition;
  return player.secondaryPosition.split("/")[0] === player.primaryPosition
    ? player.secondaryPosition
    : `${player.primaryPosition}/${player.secondaryPosition}`;
}

export function formatSmb4RosterReportMarkdown(roster: Smb4GeneratedRoster): string {
  const report = summarizeSmb4Roster(roster);
  const lines: string[] = [
    `# ${report.teamName} SMB4 Roster Report`,
    "",
    `Target profile: ${report.targetTeamName ?? "Custom"} (${report.targetProfileCode})`,
    `Generated profile: ${report.profileCode}`,
    `Profile distance: ${report.profileDistance.totalDistance.toFixed(3)} (${report.profileDistance.levelDistance} level delta)`,
    `Grade counts: ${formatCountMap(report.gradeCounts)}`,
    `Position counts: ${formatCountMap(report.positionCounts)}`,
  ];

  if (report.warnings.length > 0) {
    lines.push("", "Warnings:");
    for (const warning of report.warnings) lines.push(`- ${warning}`);
  }

  lines.push(
    "",
    "## Profile Bars",
    "",
    "| Category | Target | Generated | Target Score | Generated Score |",
    "|---|---:|---:|---:|---:|",
  );

  for (const category of PROFILE_CATEGORY_ORDER) {
    lines.push(
      `| ${category} | ${report.targetProfileBars[category].text} | ${report.profileBars[category].text} | ${report.targetProfile.rawScores[category].toFixed(1)} | ${report.profile.rawScores[category].toFixed(1)} |`,
    );
  }

  lines.push(
    "",
    "## Players",
    "",
    "| # | Player | Pos | B/T | Grade | Score | Traits | Arsenal |",
    "|---:|---|---|---|---|---:|---|---|",
  );

  report.players.forEach((player, index) => {
    const position = formatReportPosition(player);
    const grade = player.targetGrade === player.generatedGrade ? player.generatedGrade : `${player.generatedGrade} (target ${player.targetGrade})`;
    lines.push(
      `| ${index + 1} | ${player.name} | ${position} | ${player.bats}/${player.throws} | ${grade} | ${player.numericScore.toFixed(2)} | ${player.traits.join(", ") || "-"} | ${player.arsenal.join(", ") || "-"} |`,
    );
  });

  return `${lines.join("\n")}\n`;
}

export function generateSmb4Roster(request: Smb4RosterGenerationRequest = {}): Smb4GeneratedRoster {
  const rng = createRandom(request.seed);
  const targetProfile = resolveRosterTargetProfile(request);
  const positionPlan = resolveRosterPositionPlan(request);
  const gradePlan = resolveRosterGradePlan(request);
  const pools = positionPlan.map((position, index) =>
    generateRosterSlotCandidates(index, position, gradeForSlot(gradePlan, index), targetProfile, request, rng),
  );
  const selectedIndexes = pools.map(() => 0);
  let selected = pools.map((pool) => pool[0]);
  let bestScore = rosterProfileScore(selected, targetProfile);
  const improvementPasses = Math.max(1, Math.floor(request.improvementPasses ?? 4));

  for (let pass = 0; pass < improvementPasses; pass += 1) {
    let improved = false;

    for (let slotIndex = 0; slotIndex < pools.length; slotIndex += 1) {
      let slotBestIndex = selectedIndexes[slotIndex];
      let slotBestScore = bestScore;

      for (let candidateIndex = 0; candidateIndex < pools[slotIndex].length; candidateIndex += 1) {
        if (candidateIndex === selectedIndexes[slotIndex]) continue;
        const trial = selected.slice();
        trial[slotIndex] = pools[slotIndex][candidateIndex];
        const score = rosterProfileScore(trial, targetProfile);

        if (score + 1e-9 < slotBestScore) {
          slotBestIndex = candidateIndex;
          slotBestScore = score;
        }
      }

      if (slotBestIndex !== selectedIndexes[slotIndex]) {
        selectedIndexes[slotIndex] = slotBestIndex;
        selected = selected.slice();
        selected[slotIndex] = pools[slotIndex][slotBestIndex];
        bestScore = slotBestScore;
        improved = true;
      }
    }

    if (!improved) break;
  }

  selected = selected.map((player, index) => ({
    ...player,
    name: `${request.teamName ?? targetProfile.teamName ?? "Generated"} ${player.primaryPosition || "P"} ${index + 1}`,
    generationNotes: [
      ...player.generationNotes,
      `Selected from ${pools[index].length} slot candidates by team-profile optimizer.`,
    ],
  }));

  const profile = calculateTeamProfile(selected, { teamName: request.teamName ?? targetProfile.teamName ?? "Generated Roster" });
  const profileDistance = compareTeamProfiles(profile, targetProfile);
  const mismatchCount = selected.filter((player) => player.generatedGrade !== player.targetGrade).length;
  const warnings: string[] = [];
  if (mismatchCount > 0) warnings.push(`${mismatchCount} player(s) missed their target individual grade.`);
  if (profileDistance.levelDistance > 0) warnings.push(`Generated roster is ${profileDistance.levelDistance} total level(s) from target profile.`);

  return {
    teamName: request.teamName ?? targetProfile.teamName ?? "Generated Roster",
    players: selected,
    targetProfile,
    profile,
    profileDistance,
    gradeCounts: gradeCounts(selected),
    positionCounts: positionCounts(selected),
    warnings,
  };
}
