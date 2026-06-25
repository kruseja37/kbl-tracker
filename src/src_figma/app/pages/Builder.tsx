import {
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  BarChart3,
  Database,
  Eye,
  Folder,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shuffle,
  Trash2,
  User,
  UserPlus,
  Users,
  Wand2,
  X,
} from "lucide-react";
import {
  normalizeTrait,
  normalizeSecondaryPosition,
  SMB4_FULL_GRADE_SCALE,
  scoreSmb4Player,
  type Smb4Grade,
  type Smb4PlayerInput,
} from "../../../engines/smb4GradeEmulator";
import {
  generateSmb4Players,
  generateSmb4Roster,
  profileLevelsToBars,
  summarizeSmb4Roster,
  type Smb4GeneratedPlayer,
  type Smb4GeneratedTraitMode,
  type Smb4GeneratedTraitPolarity,
  type Smb4RosterGenerationReport,
  type Smb4RosterReportPlayer,
} from "../../../engines/smb4PlayerGenerator";
import {
  calculateTeamProfile,
  compareTeamProfiles,
  SMB4_STANDARD_TEAM_PROFILES,
  SMB4_TEAM_PROFILE_CATEGORIES,
  type Smb4TeamProfileLevels,
} from "../../../engines/smb4TeamProfileEngine";
import { generateHometown } from "../../../data/usCities";
import { useLeagueBuilderData } from "../../hooks/useLeagueBuilderData";
import { farmDraftRouteForLeague } from "../utils/draftRouting";
import type {
  Chemistry,
  Grade,
  MojoState,
  Personality,
  PlayerArchetype,
  FameTier,
  PitchType,
  Player,
  Position,
} from "../../../utils/leagueBuilderStorage";

type BuilderTool = "team" | "player" | "analyzer" | "league";
type BuilderPlayerSource = "analyzer" | "player-builder" | "team-builder";

interface AnalyzerState {
  name: string;
  primaryPosition: string;
  secondaryPosition: string;
  bats: string;
  throws: string;
  power: string;
  contact: string;
  speed: string;
  fielding: string;
  arm: string;
  velocity: string;
  junk: string;
  accuracy: string;
  trait1: string;
  trait2: string;
  arsenal: string;
}

interface PlayerBuilderState {
  count: string;
  targetGrade: Smb4Grade;
  positions: Position[];
  traitMode: Smb4GeneratedTraitMode;
  traitPolarity: Smb4GeneratedTraitPolarity;
  seed: string;
}

interface BuilderPoolPlayer extends Player {
  builderSource: BuilderPlayerSource;
  builderNotes?: string[];
  smb4SecondaryPosition?: string;
  targetGrade?: Smb4Grade;
  generatedGrade?: Smb4Grade;
  numericScore?: number;
  baseWeighted?: number;
  realismScore?: number;
}

interface BuilderPlayerFormData {
  firstName: string;
  lastName: string;
  nickname: string;
  backstory: string;
  archetype: PlayerArchetype | "";
  signatureMoment: string;
  gender: "M" | "F";
  baseFameTier: string;
  age: string;
  jerseyNumber: string;
  bats: "L" | "R" | "S";
  throws: "L" | "R";
  primaryPosition: Position;
  secondaryPosition: string;
  power: string;
  contact: string;
  speed: string;
  fielding: string;
  arm: string;
  velocity: string;
  junk: string;
  accuracy: string;
  arsenal: string;
  overallGrade: Grade;
  trait1: string;
  trait2: string;
  personality: Personality;
  chemistry: Chemistry;
  hometownCity: string;
  hometownState: string;
  morale: string;
  mojo: MojoState;
  fame: string;
  salary: string;
  contractYears: string;
}

const TOOL_TABS: Array<{ id: BuilderTool; label: string; icon: typeof Database }> = [
  { id: "team", label: "Team Builder", icon: Users },
  { id: "player", label: "Player Builder", icon: UserPlus },
  { id: "analyzer", label: "Player Analyzer", icon: Search },
  { id: "league", label: "League Builder", icon: Database },
];

const POSITION_OPTIONS = ["C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "SP", "RP", "CP", "SP/RP"];
const BAT_HAND_OPTIONS = ["R", "L", "S"];
const THROW_HAND_OPTIONS = ["R", "L"];
const TRAIT_MODES: Smb4GeneratedTraitMode[] = ["none", "exactlyOne", "atLeastOne", "exactlyTwo"];
const TRAIT_POLARITIES: Smb4GeneratedTraitPolarity[] = ["positive", "any", "negative"];
const BUILDER_POOL_STORAGE_KEY = "kbl-builder-generated-player-pool-v1";
const EDITABLE_POSITIONS: Position[] = ["C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "SP", "RP", "CP", "SP/RP", "TWO-WAY", "P", "IF", "OF", "IF/OF", "1B/OF"];
const SMB4_BUILDER_PRIMARY_POSITIONS: Position[] = ["C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "SP", "RP", "CP", "SP/RP"];
const SMB4_SECONDARY_POSITION_OPTIONS = ["", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "IF", "OF", "IF/OF", "1B/OF", "C/1B"];
const STORAGE_GRADE_SCALE: Grade[] = ["S", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-"];
const PITCH_TYPES: PitchType[] = ["4F", "2F", "CB", "SL", "CH", "FK", "CF", "SB"];
const SMB4_MAX_ARSENAL_PITCHES = 5;
const FASTBALL_PITCH_TYPES = new Set<PitchType>(["4F", "2F", "CF"]);
const OFFSPEED_PITCH_TYPES = new Set<PitchType>(["CB", "SL", "CH", "FK", "SB"]);
const SMB4_TRAIT_OPTIONS = [
  "Ace Exterminator",
  "Bad Ball Hitter",
  "Bad Jumps",
  "Base Jogger",
  "Base Rounder",
  "BB Prone",
  "Big Hack",
  "Bunter",
  "Butter Fingers",
  "Cannon Arm",
  "Choker",
  "Clutch",
  "Composed",
  "CON vs LHP",
  "CON vs RHP",
  "Consistent",
  "Crossed Up",
  "Distractor",
  "Dive Wizard",
  "Durable",
  "Easy Jumps",
  "Easy Target",
  "Elite 2F",
  "Elite 4F",
  "Elite CB",
  "Elite CF",
  "Elite CH",
  "Elite FK",
  "Elite SB",
  "Elite SL",
  "Falls Behind",
  "Fastball Hitter",
  "First Pitch Prayer",
  "First Pitch Slayer",
  "Gets Ahead",
  "High Pitch",
  "Injury Prone",
  "Inside Pitch",
  "K Collector",
  "K Neglecter",
  "Little Hack",
  "Low Pitch",
  "Magic Hands",
  "Meltdown",
  "Metal Head",
  "Mind Gamer",
  "Noodle Arm",
  "Off-Speed Hitter",
  "Outside Pitch",
  "Pick Officer",
  "Pinch Perfect",
  "POW vs LHP",
  "POW vs RHP",
  "Rally Starter",
  "Rally Stopper",
  "RBI Hero",
  "RBI Zero",
  "Reverse Splits",
  "Sign Stealer",
  "Slow Poke",
  "Specialist",
  "Sprinter",
  "Stealer",
  "Stimulated",
  "Surrounded",
  "Tough Out",
  "Two Way",
  "Utility",
  "Volatile",
  "Whiffer",
  "Wild Thing",
  "Wild Thrower",
  "Workhorse",
];
const PERSONALITIES: Personality[] = ["Tough", "Relaxed", "Egotistical", "Jolly", "Timid", "Droopy"];
const CHEMISTRIES: Chemistry[] = ["Competitive", "Spirited", "Crafty", "Scholarly", "Disciplined"];
const MOJO_STATES: MojoState[] = ["On Fire", "Hot", "Normal", "Cold", "Ice Cold"];
const PLAYER_ARCHETYPES: PlayerArchetype[] = [
  "GRIZZLED_VET",
  "HOT_ROOKIE",
  "JOURNEYMAN",
  "ACE",
  "SLUGGER",
  "SPEEDSTER",
  "GLOVE_WIZARD",
  "CLUBHOUSE_LEADER",
  "HEAD_CASE",
  "QUIET_PRO",
  "SHOWBOAT",
  "UTILITY_GUY",
];

const DEFAULT_ANALYZER: AnalyzerState = {
  name: "Sample Player",
  primaryPosition: "CF",
  secondaryPosition: "OF",
  bats: "R",
  throws: "R",
  power: "60",
  contact: "64",
  speed: "78",
  fielding: "66",
  arm: "58",
  velocity: "0",
  junk: "0",
  accuracy: "0",
  trait1: "Sprinter",
  trait2: "",
  arsenal: "",
};

const DEFAULT_PLAYER_BUILDER: PlayerBuilderState = {
  count: "10",
  targetGrade: "B-",
  positions: ["C", "SS", "CF", "SP", "RP"],
  traitMode: "exactlyOne",
  traitPolarity: "positive",
  seed: "builder-b-minus",
};

function numericInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(99, parsed)) : 0;
}

function analyzerToPlayer(input: AnalyzerState): Smb4PlayerInput {
  return {
    name: input.name,
    primaryPosition: input.primaryPosition,
    secondaryPosition: input.secondaryPosition,
    bats: input.bats,
    throws: input.throws,
    power: numericInput(input.power),
    contact: numericInput(input.contact),
    speed: numericInput(input.speed),
    fielding: numericInput(input.fielding),
    arm: numericInput(input.arm),
    velocity: numericInput(input.velocity),
    junk: numericInput(input.junk),
    accuracy: numericInput(input.accuracy),
    trait1: input.trait1,
    trait2: input.trait2,
    arsenal: input.arsenal,
  };
}

function splitPositions(value: string | readonly string[]): string[] {
  const values = typeof value === "string" ? value.split(/[,\s]+/) : [...value];
  return values
    .map((position: string) => position.trim().toUpperCase())
    .filter(Boolean);
}

function normalizeGenerationPositions(value: string | readonly string[]): Position[] {
  const normalized = splitPositions(value).flatMap((position) => {
    const mapped = position === "P" || position === "TWO-WAY" ? "SP/RP" : position;
    return SMB4_BUILDER_PRIMARY_POSITIONS.includes(mapped as Position) ? [mapped as Position] : [];
  });
  return normalized;
}

function isPitcherPosition(position: string | undefined): boolean {
  return ["SP", "RP", "CP", "SP/RP"].includes(String(position || "").toUpperCase());
}

function splitPlayerName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Generated", lastName: "Player" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Player" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function fullName(player: Pick<Player, "firstName" | "lastName"> | { name?: string }): string {
  if ("name" in player && player.name) return player.name;
  if ("firstName" in player) return `${player.firstName} ${player.lastName}`.trim();
  return "Generated Player";
}

function normalizePosition(value: string | undefined, fallback: Position = "CF"): Position {
  const normalized = String(value || "").trim().toUpperCase();
  return EDITABLE_POSITIONS.includes(normalized as Position) ? (normalized as Position) : fallback;
}

function normalizePrimaryPosition(value: string | undefined, fallback: Position = "CF"): Position {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "P" || normalized === "TWO-WAY") return "SP/RP";
  const safeFallback = SMB4_BUILDER_PRIMARY_POSITIONS.includes(fallback) ? fallback : "CF";
  return SMB4_BUILDER_PRIMARY_POSITIONS.includes(normalized as Position) ? (normalized as Position) : safeFallback;
}

function normalizeStorageSecondaryPosition(value: string | undefined): Position | undefined {
  const normalized = normalizeBuilderSecondaryPosition(value);
  return EDITABLE_POSITIONS.includes(normalized as Position) ? (normalized as Position) : undefined;
}

function normalizeBuilderSecondaryPosition(value: string | undefined): string {
  const normalized = normalizeSecondaryPosition(value);
  return SMB4_SECONDARY_POSITION_OPTIONS.includes(normalized) ? normalized : "";
}

function normalizeBuilderTrait(value: string | undefined): string {
  const normalized = normalizeTrait(value);
  return SMB4_TRAIT_OPTIONS.includes(normalized) ? normalized : "";
}

function displaySecondaryPosition(player: Pick<BuilderPoolPlayer, "secondaryPosition" | "smb4SecondaryPosition">): string {
  return player.smb4SecondaryPosition || player.secondaryPosition || "";
}

function displayPlayerPosition(player: Pick<BuilderPoolPlayer, "primaryPosition" | "secondaryPosition" | "smb4SecondaryPosition">): string {
  const secondary = displaySecondaryPosition(player);
  return secondary ? `${player.primaryPosition}/${secondary}` : player.primaryPosition;
}

function mapSmb4GradeToStorageGrade(grade: string | undefined): Grade {
  const normalized = String(grade || "C").toUpperCase();
  return STORAGE_GRADE_SCALE.includes(normalized as Grade) ? (normalized as Grade) : "D-";
}

function parseArsenal(value: unknown): PitchType[] {
  const text = Array.isArray(value) ? value.join("|") : String(value || "");
  const pitches = text
    .split(/[|,\s]+/)
    .map((pitch) => pitch.trim().toUpperCase())
    .filter((pitch): pitch is PitchType => PITCH_TYPES.includes(pitch as PitchType));
  return Array.from(new Set(pitches)).slice(0, SMB4_MAX_ARSENAL_PITCHES);
}

function formatArsenal(pitches: readonly string[]): string {
  return parseArsenal(pitches).join(", ");
}

function pitchOptionDisabled(selectedPitches: PitchType[], pitch: PitchType): boolean {
  return selectedPitches.length >= SMB4_MAX_ARSENAL_PITCHES && !selectedPitches.includes(pitch);
}

function arsenalValidationMessage(primaryPosition: string | undefined, pitches: PitchType[]): string {
  if (!isPitcherPosition(primaryPosition)) return "";
  if (!pitches.some((pitch) => FASTBALL_PITCH_TYPES.has(pitch))) {
    return "Pitchers need at least one fastball: 4F, 2F, or CF.";
  }
  if (!pitches.some((pitch) => OFFSPEED_PITCH_TYPES.has(pitch))) {
    return "Pitchers need at least one offspeed pitch: CB, SL, CH, FK, or SB.";
  }
  return "";
}

function toSelectedValues(options: HTMLOptionsCollection): string[] {
  return Array.from(options).filter((option) => option.selected).map((option) => option.value);
}

function toIsoDateString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return Number.isFinite(Date.parse(value)) ? value : fallback;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)] ?? values[0];
}

function gradeSalary(grade: Grade): number {
  const values: Record<Grade, number> = {
    S: 22,
    "A+": 18,
    A: 15,
    "A-": 12,
    "B+": 9,
    B: 7,
    "B-": 5.5,
    "C+": 4,
    C: 3,
    "C-": 2.2,
    "D+": 1.5,
    D: 1,
    "D-": 0.7,
  };
  return values[grade] ?? 1;
}

function makeBuilderPlayerId(source: BuilderPlayerSource): string {
  return `builder-${source}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function toBuilderPoolPlayer(
  source: Smb4PlayerInput,
  options: {
    source: BuilderPlayerSource;
    score?: ReturnType<typeof scoreSmb4Player>;
    generated?: Pick<Smb4GeneratedPlayer, "targetGrade" | "generatedGrade" | "numericScore" | "baseWeighted" | "realismScore" | "generationNotes">;
  },
): BuilderPoolPlayer {
  const score = options.score ?? scoreSmb4Player(source);
  const { firstName, lastName } = splitPlayerName(String(source.name || ""));
  const primaryPosition = normalizePrimaryPosition(source.primaryPosition || source.primary, "CF");
  const smb4SecondaryPosition = normalizeBuilderSecondaryPosition(source.secondaryPosition || source.secondary);
  const secondaryPosition = normalizeStorageSecondaryPosition(smb4SecondaryPosition);
  const pitcher = isPitcherPosition(primaryPosition);
  const hometown = generateHometown();
  const generatedGrade = options.generated?.generatedGrade ?? score.grade;
  const grade = mapSmb4GradeToStorageGrade(generatedGrade);

  return {
    id: makeBuilderPlayerId(options.source),
    firstName,
    lastName,
    nickname: undefined,
    backstory: "",
    nicknames: undefined,
    archetype: randomChoice(PLAYER_ARCHETYPES),
    signatureMoment: "",
    baseFameTier: 3,
    gender: randomChoice(["M", "F"] as const),
    jerseyNumber: randomInt(0, 99),
    age: randomInt(18, 49),
    bats: randomChoice(["L", "R", "S"].includes(String(source.bats)) ? [source.bats as "L" | "R" | "S"] : (["R"] as const)),
    throws: randomChoice(["L", "R"].includes(String(source.throws)) ? [source.throws as "L" | "R"] : (["R"] as const)),
    primaryPosition,
    secondaryPosition,
    smb4SecondaryPosition: smb4SecondaryPosition || undefined,
    power: numericInput(String(source.power ?? 0)),
    contact: numericInput(String(source.contact ?? 0)),
    speed: numericInput(String(source.speed ?? 0)),
    fielding: numericInput(String(source.fielding ?? 0)),
    arm: numericInput(String(source.arm ?? 0)),
    velocity: pitcher ? numericInput(String(source.velocity ?? 0)) : 0,
    junk: pitcher ? numericInput(String(source.junk ?? 0)) : 0,
    accuracy: pitcher ? numericInput(String(source.accuracy ?? 0)) : 0,
    arsenal: pitcher ? parseArsenal(source.arsenal) : [],
    overallGrade: grade,
    trait1: normalizeBuilderTrait(source.trait1) || undefined,
    trait2: normalizeBuilderTrait(source.trait2) || undefined,
    personality: randomChoice(PERSONALITIES),
    chemistry: randomChoice(CHEMISTRIES),
    morale: 75,
    mojo: "Normal",
    fame: 0,
    salary: gradeSalary(grade),
    contractYears: randomInt(1, 4),
    leagueAssignments: [],
    createdDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    isCustom: true,
    sourceDatabase: "SMB4 Builder",
    hometown,
    editHistory: [],
    builderSource: options.source,
    builderNotes: options.generated?.generationNotes ?? [],
    targetGrade: options.generated?.targetGrade,
    generatedGrade,
    numericScore: options.generated?.numericScore ?? score.numericScore,
    baseWeighted: options.generated?.baseWeighted ?? score.baseWeighted,
    realismScore: options.generated?.realismScore,
  };
}

function builderPlayerToSmb4Input(player: BuilderPoolPlayer): Smb4PlayerInput {
  return {
    name: fullName(player),
    primaryPosition: player.primaryPosition,
    secondaryPosition: normalizeBuilderSecondaryPosition(displaySecondaryPosition(player)),
    bats: player.bats,
    throws: player.throws,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    trait1: player.trait1,
    trait2: player.trait2,
    arsenal: player.arsenal,
  };
}

function reportPlayerToSmb4Input(player: Smb4RosterReportPlayer): Smb4PlayerInput {
  return {
    name: player.name,
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    bats: player.bats,
    throws: player.throws,
    power: player.ratings.power,
    contact: player.ratings.contact,
    speed: player.ratings.speed,
    fielding: player.ratings.fielding,
    arm: player.ratings.arm,
    velocity: player.ratings.velocity,
    junk: player.ratings.junk,
    accuracy: player.ratings.accuracy,
    trait1: player.traits[0],
    trait2: player.traits[1],
    arsenal: player.arsenal,
  };
}

function formatScoreDelta(value: number): string {
  if (Math.abs(value) < 0.005) return "0.00";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function toolButtonClass(active: boolean): string {
  return [
    "flex items-center gap-2 border-4 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide transition active:scale-95",
    "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.75)]",
    active
      ? "bg-[#C4A853] border-[#E8E8D8] text-[#1A1A1A]"
      : "bg-[#4A6844] border-[#2d3d2f] text-[#E8E8D8] hover:bg-[#5A8352]",
  ].join(" ");
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="bg-[#556B55] border-[6px] border-[#4A6844] p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
      {children}
    </section>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-[#E8E8D8]/70">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full border-4 border-[#2d3d2f] bg-[#E8E8D8] px-3 py-2 text-sm font-bold text-[#1A1A1A]",
        "focus:border-[#C4A853] focus:outline-none",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "w-full border-4 border-[#2d3d2f] bg-[#E8E8D8] px-3 py-2 text-sm font-bold text-[#1A1A1A]",
        "focus:border-[#C4A853] focus:outline-none",
        props.multiple ? "min-h-[132px]" : "",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function ProfileBar({ level }: { level: number }) {
  return (
    <div className="flex gap-1" aria-label={`${level} of 6`}>
      {Array.from({ length: 6 }).map((_, index) => (
        <span
          key={index}
          className={`h-3 w-7 border border-[#1A1A1A] ${index < level ? "bg-[#C4A853]" : "bg-[#2d3d2f]"}`}
        />
      ))}
    </div>
  );
}

function RatingPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-2 border-[#2d3d2f] bg-[#4A6844] px-3 py-2">
      <div className="text-[9px] uppercase text-[#E8E8D8]/60">{label}</div>
      <div className="text-sm font-bold text-[#E8E8D8]">{value}</div>
    </div>
  );
}

function loadBuilderPool(): BuilderPoolPlayer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BUILDER_POOL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? dedupeBuilderPoolPlayers(parsed.map(hydrateBuilderPoolPlayer).filter((player): player is BuilderPoolPlayer => Boolean(player)))
      : [];
  } catch {
    return [];
  }
}

function saveBuilderPool(players: BuilderPoolPlayer[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BUILDER_POOL_STORAGE_KEY, JSON.stringify(players));
  } catch (error) {
    console.warn("[Builder] Failed to persist generated player pool", error);
  }
}

function hydrateLeagueAssignments(value: unknown): Player["leagueAssignments"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((assignment) => {
    if (!assignment || typeof assignment !== "object") return [];
    const record = assignment as Record<string, unknown>;
    const leagueId = typeof record.leagueId === "string" ? record.leagueId : "";
    const teamId = typeof record.teamId === "string" ? record.teamId : "";
    const rosterStatus = record.rosterStatus === "MLB" || record.rosterStatus === "FARM" ? record.rosterStatus : "FREE_AGENT";
    if (!leagueId) return [];
    return [{ leagueId, teamId, rosterStatus }];
  });
}

function dedupeBuilderPoolPlayers(players: BuilderPoolPlayer[]): BuilderPoolPlayer[] {
  const byId = new Map<string, BuilderPoolPlayer>();
  for (const player of players) {
    const existing = byId.get(player.id);
    const currentTime = Date.parse(player.lastModified) || 0;
    const existingTime = existing ? Date.parse(existing.lastModified) || 0 : -1;
    if (!existing || currentTime >= existingTime) {
      byId.set(player.id, player);
    }
  }
  return Array.from(byId.values()).sort((a, b) => (Date.parse(b.lastModified) || 0) - (Date.parse(a.lastModified) || 0));
}

function hydrateBuilderPoolPlayer(value: unknown): BuilderPoolPlayer | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<BuilderPoolPlayer> & Record<string, unknown>;
  const { firstName, lastName } = record.firstName && record.lastName
    ? { firstName: String(record.firstName), lastName: String(record.lastName) }
    : splitPlayerName(String(record.name || "Generated Player"));
  const primaryPosition = normalizePrimaryPosition(String(record.primaryPosition || "CF"));
  const smb4SecondaryPosition = normalizeBuilderSecondaryPosition(
    String(record.smb4SecondaryPosition || record.secondaryPosition || ""),
  );
  const secondaryPosition = normalizeStorageSecondaryPosition(smb4SecondaryPosition);
  const generatedGrade = SMB4_FULL_GRADE_SCALE.includes(String(record.generatedGrade || record.overallGrade) as Smb4Grade)
    ? (String(record.generatedGrade || record.overallGrade) as Smb4Grade)
    : undefined;
  const overallGrade = mapSmb4GradeToStorageGrade(String(record.overallGrade || generatedGrade || "C"));
  const createdDate = toIsoDateString(record.createdDate, "1970-01-01T00:00:00.000Z");
  const lastModified = toIsoDateString(record.lastModified, createdDate);

  return {
    id: typeof record.id === "string" ? record.id : makeBuilderPlayerId("player-builder"),
    firstName,
    lastName,
    nickname: typeof record.nickname === "string" ? record.nickname : undefined,
    backstory: typeof record.backstory === "string" ? record.backstory : "",
    nicknames: Array.isArray(record.nicknames) ? record.nicknames.map(String) : undefined,
    archetype: PLAYER_ARCHETYPES.includes(record.archetype as PlayerArchetype) ? (record.archetype as PlayerArchetype) : undefined,
    signatureMoment: typeof record.signatureMoment === "string" ? record.signatureMoment : "",
    baseFameTier: Math.max(1, Math.min(5, Number(record.baseFameTier) || 3)) as FameTier,
    gender: record.gender === "F" ? "F" : "M",
    jerseyNumber: record.jerseyNumber === undefined ? undefined : Math.max(0, Math.min(99, Number(record.jerseyNumber) || 0)),
    age: Math.max(18, Math.min(49, Number(record.age) || 25)),
    bats: record.bats === "L" || record.bats === "S" ? record.bats : "R",
    throws: record.throws === "L" ? "L" : "R",
    primaryPosition,
    secondaryPosition,
    smb4SecondaryPosition: smb4SecondaryPosition || undefined,
    power: numericInput(String(record.power ?? 0)),
    contact: numericInput(String(record.contact ?? 0)),
    speed: numericInput(String(record.speed ?? 0)),
    fielding: numericInput(String(record.fielding ?? 0)),
    arm: numericInput(String(record.arm ?? 0)),
    velocity: numericInput(String(record.velocity ?? 0)),
    junk: numericInput(String(record.junk ?? 0)),
    accuracy: numericInput(String(record.accuracy ?? 0)),
    arsenal: parseArsenal(record.arsenal),
    overallGrade,
    trait1: normalizeBuilderTrait(typeof record.trait1 === "string" ? record.trait1 : undefined) || undefined,
    trait2: normalizeBuilderTrait(typeof record.trait2 === "string" ? record.trait2 : undefined) || undefined,
    personality: PERSONALITIES.includes(record.personality as Personality) ? (record.personality as Personality) : "Relaxed",
    chemistry: CHEMISTRIES.includes(record.chemistry as Chemistry) ? (record.chemistry as Chemistry) : "Competitive",
    morale: Math.max(0, Math.min(100, Number(record.morale) || 75)),
    mojo: MOJO_STATES.includes(record.mojo as MojoState) ? (record.mojo as MojoState) : "Normal",
    fame: Math.max(0, Number(record.fame) || 0),
    salary: Math.max(0, Number(record.salary) || gradeSalary(overallGrade)),
    contractYears: Math.max(1, Math.min(10, Number(record.contractYears) || 1)),
    leagueAssignments: hydrateLeagueAssignments(record.leagueAssignments),
    createdDate,
    lastModified,
    isCustom: true,
    sourceDatabase: typeof record.sourceDatabase === "string" ? record.sourceDatabase : "SMB4 Builder",
    hometown:
      record.hometown && typeof record.hometown === "object"
        ? {
            city: String((record.hometown as { city?: unknown }).city || ""),
            state: String((record.hometown as { state?: unknown }).state || ""),
          }
        : generateHometown(),
    editHistory: [],
    builderSource: ["analyzer", "player-builder", "team-builder"].includes(String(record.builderSource))
      ? (record.builderSource as BuilderPlayerSource)
      : "player-builder",
    builderNotes: Array.isArray(record.builderNotes) ? record.builderNotes.map(String) : [],
    targetGrade: SMB4_FULL_GRADE_SCALE.includes(String(record.targetGrade) as Smb4Grade) ? (record.targetGrade as Smb4Grade) : undefined,
    generatedGrade,
    numericScore: Number.isFinite(Number(record.numericScore)) ? Number(record.numericScore) : undefined,
    baseWeighted: Number.isFinite(Number(record.baseWeighted)) ? Number(record.baseWeighted) : undefined,
    realismScore: Number.isFinite(Number(record.realismScore)) ? Number(record.realismScore) : undefined,
  };
}

function BuilderPlayerTable({
  players,
  emptyText,
  poolIds = new Set<string>(),
  selectedIds = new Set<string>(),
  onOpenPlayer,
  onAddToPool,
  onToggleSelected,
  onDeleteFromPool,
}: {
  players: BuilderPoolPlayer[];
  emptyText: string;
  poolIds?: Set<string>;
  selectedIds?: Set<string>;
  onOpenPlayer: (player: BuilderPoolPlayer) => void;
  onAddToPool?: (player: BuilderPoolPlayer) => void;
  onToggleSelected?: (playerId: string) => void;
  onDeleteFromPool?: (playerId: string) => void;
}) {
  if (players.length === 0) {
    return (
      <div className="border-4 border-[#2d3d2f] bg-[#4A6844] p-5 text-sm font-bold uppercase text-[#E8E8D8]/70">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1060px] border-separate border-spacing-0 text-left text-xs">
        <thead>
          <tr className="text-[#E8E8D8]/70">
            <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Player</th>
            <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Bio</th>
            <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Pos</th>
            <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Grade</th>
            <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Hand</th>
            <th className="border-b-4 border-[#2d3d2f] px-3 py-2">P/C/S</th>
            <th className="border-b-4 border-[#2d3d2f] px-3 py-2">V/J/A</th>
            <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Traits</th>
            <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const saved = poolIds.has(player.id);
            const selected = selectedIds.has(player.id);
            const displayGrade = player.generatedGrade ?? player.overallGrade;
            return (
              <tr key={player.id} className="text-[#E8E8D8] odd:bg-[#4A6844] even:bg-[#556B55]">
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onOpenPlayer(player)}
                    className="text-left font-bold text-[#E8E8D8] underline-offset-4 hover:underline"
                  >
                    {fullName(player)}
                  </button>
                  <div className="text-[10px] text-[#E8E8D8]/50">{player.sourceDatabase}</div>
                </td>
                <td className="px-3 py-2">
                  #{player.jerseyNumber ?? "--"} · Age {player.age}
                  <div className="text-[10px] text-[#E8E8D8]/50">
                    {player.hometown ? `${player.hometown.city}, ${player.hometown.state}` : "--"}
                  </div>
                </td>
                <td className="px-3 py-2">{displayPlayerPosition(player)}</td>
                <td className="px-3 py-2">
                  {displayGrade}{player.numericScore !== undefined ? ` · ${player.numericScore.toFixed(1)}` : ""}
                  {displayGrade !== player.overallGrade ? <div className="text-[10px] text-[#E8E8D8]/50">DB {player.overallGrade}</div> : null}
                </td>
                <td className="px-3 py-2">{player.bats}/{player.throws}</td>
                <td className="px-3 py-2">{player.power}/{player.contact}/{player.speed}</td>
                <td className="px-3 py-2">{player.velocity}/{player.junk}/{player.accuracy}</td>
                <td className="px-3 py-2">{[player.trait1, player.trait2].filter(Boolean).join(", ") || "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenPlayer(player)}
                      className="border-2 border-[#E8E8D8] bg-[#2d3d2f] p-2 text-[#E8E8D8] hover:bg-[#4A6844]"
                      aria-label={`View ${fullName(player)}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {onAddToPool && (
                      <button
                        type="button"
                        onClick={() => onAddToPool(player)}
                        disabled={saved}
                        className="border-2 border-[#E8E8D8] bg-[#C4A853] px-3 py-2 font-bold uppercase text-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saved ? "Saved" : "Save To Pool"}
                      </button>
                    )}
                    {onToggleSelected && (
                      <button
                        type="button"
                        onClick={() => onToggleSelected(player.id)}
                        className={[
                          "border-2 px-3 py-2 font-bold uppercase",
                          selected
                            ? "border-[#C4A853] bg-[#2d3d2f] text-[#C4A853]"
                            : "border-[#E8E8D8] bg-[#5A8352] text-[#E8E8D8]",
                        ].join(" ")}
                      >
                        {selected ? "Included" : "Include"}
                      </button>
                    )}
                    {onDeleteFromPool && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete ${fullName(player)} from the generated player pool?`)) {
                            onDeleteFromPool(player.id);
                          }
                        }}
                        className="border-2 border-[#E8E8D8] bg-[#7A2E2E] p-2 text-[#E8E8D8] hover:bg-[#9A3A3A]"
                        aria-label={`Delete ${fullName(player)}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LeagueBuilderPanel() {
  const { leagues } = useLeagueBuilderData();
  const farmDraftPath = leagues[0] ? farmDraftRouteForLeague(leagues[0]) : "/league-builder/draft";
  const modules = [
    { title: "Leagues", icon: Database, to: "/league-builder/leagues", color: "#CC44CC" },
    { title: "Teams", icon: Users, to: "/league-builder/teams", color: "#5599FF" },
    { title: "Players", icon: User, to: "/league-builder/players", color: "#3366FF" },
    { title: "Rosters", icon: Folder, to: "/league-builder/rosters", color: "#0066FF" },
    { title: "Draft", icon: Shuffle, to: farmDraftPath, color: "#7733DD" },
    { title: "Rules", icon: Settings, to: "/league-builder/rules", color: "#DD0000" },
  ];

  return (
    <Panel>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold uppercase tracking-wide text-[#E8E8D8]">League Builder</h2>
        <Link
          to="/league-builder"
          className="border-4 border-[#E8E8D8] bg-[#5A8352] px-4 py-2 text-xs font-bold uppercase text-[#E8E8D8] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] hover:bg-[#4A6844]"
        >
          Open Console
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.title}
              to={module.to}
              className="border-4 border-[#2d3d2f] bg-[#4A6844] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.75)] transition hover:bg-[#5A8352]"
              style={{ borderColor: module.color }}
            >
              <Icon className="mb-4 h-7 w-7 text-[#E8E8D8]" />
              <div className="text-sm font-bold uppercase tracking-wide text-[#E8E8D8]">{module.title}</div>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

function TeamBuilderPanel({
  pool,
  onOpenPlayer,
  onDeleteFromPool,
}: {
  pool: BuilderPoolPlayer[];
  onOpenPlayer: (player: BuilderPoolPlayer) => void;
  onDeleteFromPool: (playerId: string) => void;
}) {
  const standardTeams = Object.keys(SMB4_STANDARD_TEAM_PROFILES).sort();
  const [teamName, setTeamName] = useState("Sandcats");
  const [seed, setSeed] = useState("sandcats-builder");
  const [traitMode, setTraitMode] = useState<Smb4GeneratedTraitMode>("atLeastOne");
  const [traitPolarity, setTraitPolarity] = useState<Smb4GeneratedTraitPolarity>("positive");
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<Smb4RosterGenerationReport>(() =>
    summarizeSmb4Roster(
      generateSmb4Roster({
        teamName: "Generated Sandcats",
        standardTeamProfileName: "Sandcats",
        seed: "sandcats-builder",
        candidatesPerSlot: 8,
        improvementPasses: 3,
        traitPolicy: { mode: "atLeastOne", allowedPolarity: "positive" },
      }),
    ),
  );

  const regenerate = () => {
    const roster = generateSmb4Roster({
      teamName: `Generated ${teamName}`,
      standardTeamProfileName: teamName,
      seed,
      candidatesPerSlot: 8,
      improvementPasses: 3,
      traitPolicy: { mode: traitMode, allowedPolarity: traitPolarity },
    });
    setReport(summarizeSmb4Roster(roster));
  };
  const selectedPoolPlayers = useMemo(
    () => pool.filter((player) => selectedPoolIds.has(player.id)),
    [pool, selectedPoolIds],
  );
  const selectedPoolProfile = useMemo(() => {
    const combinedPlayers = [
      ...report.players.map(reportPlayerToSmb4Input),
      ...selectedPoolPlayers.map(builderPlayerToSmb4Input),
    ];
    const profile = calculateTeamProfile(combinedPlayers, { teamName: `${report.teamName} + Pool` });
    return {
      profile,
      bars: profileLevelsToBars(profile.levels),
      distance: compareTeamProfiles(profile, report.targetProfile),
    };
  }, [report, selectedPoolPlayers]);
  const toggleSelectedPoolPlayer = (playerId: string) => {
    setSelectedPoolIds((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };
  const deletePoolPlayer = (playerId: string) => {
    setSelectedPoolIds((current) => {
      const next = new Set(current);
      next.delete(playerId);
      return next;
    });
    onDeleteFromPool(playerId);
  };

  return (
    <div className="space-y-6">
      <Panel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <FieldLabel label="Profile">
            <SelectInput value={teamName} onChange={(event) => setTeamName(event.target.value)}>
              {standardTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Trait Rule">
            <SelectInput value={traitMode} onChange={(event) => setTraitMode(event.target.value as Smb4GeneratedTraitMode)}>
              {TRAIT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Trait Type">
            <SelectInput value={traitPolarity} onChange={(event) => setTraitPolarity(event.target.value as Smb4GeneratedTraitPolarity)}>
              {TRAIT_POLARITIES.map((polarity) => (
                <option key={polarity} value={polarity}>
                  {polarity}
                </option>
              ))}
            </SelectInput>
          </FieldLabel>
          <div className="flex items-end">
            <button
              type="button"
              onClick={regenerate}
              className="flex h-[48px] items-center gap-2 border-4 border-[#E8E8D8] bg-[#C4A853] px-5 text-xs font-bold uppercase text-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Generate
            </button>
          </div>
        </div>
        <div className="mt-4 max-w-md">
          <FieldLabel label="Seed">
            <TextInput value={seed} onChange={(event) => setSeed(event.target.value)} />
          </FieldLabel>
        </div>
      </Panel>

      <Panel>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wide text-[#E8E8D8]">{report.teamName}</h2>
            <div className="mt-1 text-xs text-[#E8E8D8]/70">
              {report.profileCode} vs {report.targetProfileCode} · distance {report.profileDistance.totalDistance.toFixed(2)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <RatingPill label="Players" value={report.players.length} />
            <RatingPill label="Levels" value={report.profileDistance.levelDistance} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          {SMB4_TEAM_PROFILE_CATEGORIES.map((category) => (
            <div key={category} className="border-2 border-[#2d3d2f] bg-[#4A6844] p-3">
              <div className="mb-2 text-[10px] font-bold uppercase text-[#E8E8D8]/70">{category}</div>
              <ProfileBar level={report.profileBars[category].level} />
              <div className="mt-2 text-[10px] text-[#E8E8D8]/60">Target {report.targetProfileBars[category].text}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wide text-[#E8E8D8]">Generated Player Pool</h2>
            <div className="mt-1 text-xs text-[#E8E8D8]/70">
              Select saved analyzer/generator players to include in this team profile.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <RatingPill label="Pool" value={pool.length} />
            <RatingPill label="Included" value={selectedPoolPlayers.length} />
            <RatingPill label="Distance" value={selectedPoolProfile.distance.totalDistance.toFixed(2)} />
          </div>
        </div>
        <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-5">
          {SMB4_TEAM_PROFILE_CATEGORIES.map((category) => (
            <div key={category} className="border-2 border-[#2d3d2f] bg-[#4A6844] p-3">
              <div className="mb-2 text-[10px] font-bold uppercase text-[#E8E8D8]/70">{category}</div>
              <ProfileBar level={selectedPoolProfile.bars[category].level} />
              <div className="mt-2 text-[10px] text-[#E8E8D8]/60">
                {selectedPoolProfile.profile.rawScores[category].toFixed(1)} · Target {report.targetProfileBars[category].text}
              </div>
            </div>
          ))}
        </div>
        <BuilderPlayerTable
          players={pool}
          emptyText="No generated players saved yet"
          selectedIds={selectedPoolIds}
          onOpenPlayer={onOpenPlayer}
          onToggleSelected={toggleSelectedPoolPlayer}
          onDeleteFromPool={deletePoolPlayer}
        />
      </Panel>

      <PlayerTable players={report.players.map((player) => ({
        name: player.name,
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition,
        generatedGrade: player.generatedGrade,
        targetGrade: player.targetGrade,
        numericScore: player.numericScore,
        trait1: player.traits[0] ?? "",
        trait2: player.traits[1] ?? "",
        power: player.ratings.power,
        contact: player.ratings.contact,
        speed: player.ratings.speed,
        velocity: player.ratings.velocity,
        junk: player.ratings.junk,
        accuracy: player.ratings.accuracy,
      }))} />
    </div>
  );
}

function PlayerBuilderPanel({
  poolIds,
  onOpenPlayer,
  onAddToPool,
}: {
  poolIds: Set<string>;
  onOpenPlayer: (player: BuilderPoolPlayer) => void;
  onAddToPool: (player: BuilderPoolPlayer) => void;
}) {
  const [request, setRequest] = useState<PlayerBuilderState>(DEFAULT_PLAYER_BUILDER);
  const [generationError, setGenerationError] = useState("");
  const validGenerationPositions = useMemo(() => normalizeGenerationPositions(request.positions), [request.positions]);
  const generationBlocked = validGenerationPositions.length === 0;
  const [players, setPlayers] = useState<BuilderPoolPlayer[]>(() =>
    generateSmb4Players({
      count: 10,
      targetGrade: "B-",
      positions: ["C", "SS", "CF", "SP", "RP"],
      seed: "builder-b-minus",
      traitPolicy: { mode: "exactlyOne", allowedPolarity: "positive" },
    }).map((player) => toBuilderPoolPlayer(player, { source: "player-builder", generated: player })),
  );

  const regenerate = () => {
    if (generationBlocked) {
      setGenerationError("Select at least one primary position.");
      return;
    }
    setGenerationError("");
    setPlayers(
      generateSmb4Players({
        count: Math.max(1, Math.min(50, Number(request.count) || 1)),
        targetGrade: request.targetGrade,
        positions: validGenerationPositions,
        seed: request.seed,
        traitPolicy: { mode: request.traitMode, allowedPolarity: request.traitPolarity },
      }).map((player) => toBuilderPoolPlayer(player, { source: "player-builder", generated: player })),
    );
  };

  return (
    <div className="space-y-6">
      <Panel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[120px_140px_1fr_170px_170px_auto]">
          <FieldLabel label="Count">
            <TextInput value={request.count} onChange={(event) => setRequest({ ...request, count: event.target.value })} inputMode="numeric" />
          </FieldLabel>
          <FieldLabel label="Grade">
            <SelectInput value={request.targetGrade} onChange={(event) => setRequest({ ...request, targetGrade: event.target.value as Smb4Grade })}>
              {SMB4_FULL_GRADE_SCALE.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Positions">
            <SelectInput
              multiple
              value={request.positions}
              onChange={(event) => {
                setGenerationError("");
                setRequest({ ...request, positions: normalizeGenerationPositions(toSelectedValues(event.target.options)) });
              }}
            >
              {SMB4_BUILDER_PRIMARY_POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </SelectInput>
            {generationError ? <div className="mt-2 text-[10px] font-bold uppercase text-[#F1C45B]">{generationError}</div> : null}
          </FieldLabel>
          <FieldLabel label="Trait Rule">
            <SelectInput value={request.traitMode} onChange={(event) => setRequest({ ...request, traitMode: event.target.value as Smb4GeneratedTraitMode })}>
              {TRAIT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Trait Type">
            <SelectInput value={request.traitPolarity} onChange={(event) => setRequest({ ...request, traitPolarity: event.target.value as Smb4GeneratedTraitPolarity })}>
              {TRAIT_POLARITIES.map((polarity) => (
                <option key={polarity} value={polarity}>
                  {polarity}
                </option>
              ))}
            </SelectInput>
          </FieldLabel>
          <div className="flex items-end">
            <button
              type="button"
              onClick={regenerate}
              className="flex h-[48px] items-center gap-2 border-4 border-[#E8E8D8] bg-[#C4A853] px-5 text-xs font-bold uppercase text-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition active:scale-95"
            >
              <Wand2 className="h-4 w-4" />
              Build
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="w-full max-w-md">
            <FieldLabel label="Seed">
              <TextInput value={request.seed} onChange={(event) => setRequest({ ...request, seed: event.target.value })} />
            </FieldLabel>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!generationBlocked) players.forEach(onAddToPool);
            }}
            disabled={generationBlocked}
            className="flex h-[48px] items-center gap-2 border-4 border-[#E8E8D8] bg-[#5A8352] px-5 text-xs font-bold uppercase text-[#E8E8D8] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save All
          </button>
        </div>
      </Panel>
      <Panel>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold uppercase tracking-wide text-[#E8E8D8]">Generated Players</h2>
          <FieldLabel label="Seed">
            <div className="border-2 border-[#2d3d2f] bg-[#4A6844] px-3 py-2 text-xs font-bold text-[#E8E8D8]">{request.seed}</div>
          </FieldLabel>
        </div>
        <BuilderPlayerTable
          players={players}
          emptyText="No players generated"
          poolIds={poolIds}
          onOpenPlayer={onOpenPlayer}
          onAddToPool={onAddToPool}
        />
      </Panel>
    </div>
  );
}

function PlayerAnalyzerPanel({
  onAddToPool,
}: {
  onAddToPool: (player: BuilderPoolPlayer) => void;
}) {
  const [input, setInput] = useState<AnalyzerState>(DEFAULT_ANALYZER);
  const player = useMemo(() => analyzerToPlayer(input), [input]);
  const score = useMemo(() => scoreSmb4Player(player), [player]);
  const handednessBaseline = useMemo(() => scoreSmb4Player({ ...player, bats: "R", throws: "R" }), [player]);
  const handednessVariants = useMemo(
    () =>
      BAT_HAND_OPTIONS.flatMap((bats) =>
        THROW_HAND_OPTIONS.map((throws) => {
          const variantScore = scoreSmb4Player({ ...player, bats, throws });
          return {
            key: `${bats}/${throws}`,
            grade: variantScore.grade,
            numericScore: variantScore.numericScore,
            delta: variantScore.numericScore - handednessBaseline.numericScore,
            active: input.bats === bats && input.throws === throws,
          };
        }),
      ),
    [handednessBaseline.numericScore, input.bats, input.throws, player],
  );
  const bars = profileLevelsToBars({
    power: Math.round(numericInput(input.power) / 99 * 6),
    contact: Math.round(numericInput(input.contact) / 99 * 6),
    speed: Math.round(numericInput(input.speed) / 99 * 6),
    rotation: Math.round(((numericInput(input.velocity) + numericInput(input.junk) + numericInput(input.accuracy)) / 3) / 99 * 6),
    bullpen: Math.round(((numericInput(input.velocity) + numericInput(input.junk) + numericInput(input.accuracy)) / 3) / 99 * 6),
  } satisfies Smb4TeamProfileLevels);
  const selectedPitches = parseArsenal(input.arsenal);
  const arsenalError = arsenalValidationMessage(input.primaryPosition, selectedPitches);

  const update = (key: keyof AnalyzerState, value: string) => setInput((current) => ({ ...current, [key]: value }));
  const saveAnalyzedPlayer = () => {
    if (arsenalError) return;
    onAddToPool(toBuilderPoolPlayer(player, { source: "analyzer", score }));
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      <Panel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_140px_1fr_120px_120px]">
          <FieldLabel label="Name">
            <TextInput value={input.name} onChange={(event) => update("name", event.target.value)} />
          </FieldLabel>
          <FieldLabel label="Primary">
            <SelectInput value={input.primaryPosition} onChange={(event) => update("primaryPosition", event.target.value)}>
              {POSITION_OPTIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Secondary">
            <SelectInput value={input.secondaryPosition} onChange={(event) => update("secondaryPosition", event.target.value)}>
              {SMB4_SECONDARY_POSITION_OPTIONS.map((position) => (
                <option key={position || "none"} value={position}>
                  {position || "None"}
                </option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Bats">
            <SelectInput value={input.bats} onChange={(event) => update("bats", event.target.value)}>
              {BAT_HAND_OPTIONS.map((hand) => (
                <option key={hand} value={hand}>
                  {hand}
                </option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Throws">
            <SelectInput value={input.throws} onChange={(event) => update("throws", event.target.value)}>
              {THROW_HAND_OPTIONS.map((hand) => (
                <option key={hand} value={hand}>
                  {hand}
                </option>
              ))}
            </SelectInput>
          </FieldLabel>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
          {(["power", "contact", "speed", "fielding", "arm"] as const).map((key) => (
            <FieldLabel key={key} label={key}>
              <TextInput value={input[key]} onChange={(event) => update(key, event.target.value)} inputMode="numeric" />
            </FieldLabel>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {(["velocity", "junk", "accuracy"] as const).map((key) => (
            <FieldLabel key={key} label={key}>
              <TextInput value={input[key]} onChange={(event) => update(key, event.target.value)} inputMode="numeric" />
            </FieldLabel>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FieldLabel label="Trait 1">
            <SelectInput value={input.trait1} onChange={(event) => update("trait1", event.target.value)}>
              <option value="">None</option>
              {SMB4_TRAIT_OPTIONS.map((trait) => (
                <option key={trait} value={trait}>{trait}</option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Trait 2">
            <SelectInput value={input.trait2} onChange={(event) => update("trait2", event.target.value)}>
              <option value="">None</option>
              {SMB4_TRAIT_OPTIONS.map((trait) => (
                <option key={trait} value={trait}>{trait}</option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Arsenal">
            <SelectInput
              multiple
              value={selectedPitches}
              onChange={(event) => update("arsenal", formatArsenal(toSelectedValues(event.target.options) as PitchType[]))}
            >
              {PITCH_TYPES.map((pitch) => (
                <option key={pitch} value={pitch} disabled={pitchOptionDisabled(selectedPitches, pitch)}>{pitch}</option>
              ))}
            </SelectInput>
            {arsenalError ? <div className="mt-2 text-[10px] font-bold uppercase text-[#F1C45B]">{arsenalError}</div> : null}
          </FieldLabel>
        </div>
      </Panel>

      <Panel>
        <div className="mb-5 flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-[#C4A853]" />
          <div>
            <h2 className="text-xl font-bold uppercase text-[#E8E8D8]">{score.grade}</h2>
            <div className="text-xs text-[#E8E8D8]/60">{score.numericScore.toFixed(2)} · {score.playerType}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <RatingPill label="Base" value={score.baseWeighted.toFixed(1)} />
          <RatingPill label="Positive" value={score.positiveTraits} />
          <RatingPill label="Negative" value={score.negativeTraits} />
          <RatingPill label="Warnings" value={score.warnings.length} />
        </div>
        <button
          type="button"
          onClick={saveAnalyzedPlayer}
          disabled={Boolean(arsenalError)}
          className="mt-5 flex w-full items-center justify-center gap-2 border-4 border-[#E8E8D8] bg-[#C4A853] px-4 py-3 text-xs font-bold uppercase text-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Add To Pool
        </button>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase text-[#E8E8D8]/70">Handedness Impact</span>
            <span className="text-[9px] uppercase text-[#E8E8D8]/50">vs R/R</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {handednessVariants.map((variant) => (
              <div
                key={variant.key}
                className={[
                  "border-2 px-2 py-2 text-xs",
                  variant.active ? "border-[#C4A853] bg-[#2d3d2f]" : "border-[#2d3d2f] bg-[#4A6844]",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#E8E8D8]">{variant.key}</span>
                  <span className="text-[#C4A853]">{variant.grade}</span>
                </div>
                <div className="mt-1 text-[10px] text-[#E8E8D8]/60">
                  {variant.numericScore.toFixed(2)} ({formatScoreDelta(variant.delta)})
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {SMB4_TEAM_PROFILE_CATEGORIES.map((category) => (
            <div key={category} className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase text-[#E8E8D8]/70">{category}</span>
              <ProfileBar level={bars[category].level} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function playerToFormData(player: BuilderPoolPlayer): BuilderPlayerFormData {
  return {
    firstName: player.firstName,
    lastName: player.lastName,
    nickname: player.nickname ?? "",
    backstory: player.backstory ?? "",
    archetype: player.archetype ?? "",
    signatureMoment: player.signatureMoment ?? "",
    gender: player.gender,
    baseFameTier: String(player.baseFameTier ?? 3),
    age: String(player.age),
    jerseyNumber: player.jerseyNumber === undefined ? "" : String(player.jerseyNumber),
    bats: player.bats,
    throws: player.throws,
    primaryPosition: player.primaryPosition,
    secondaryPosition: displaySecondaryPosition(player),
    power: String(player.power),
    contact: String(player.contact),
    speed: String(player.speed),
    fielding: String(player.fielding),
    arm: String(player.arm),
    velocity: String(player.velocity),
    junk: String(player.junk),
    accuracy: String(player.accuracy),
    arsenal: formatArsenal(player.arsenal),
    overallGrade: player.overallGrade,
    trait1: normalizeBuilderTrait(player.trait1),
    trait2: normalizeBuilderTrait(player.trait2),
    personality: player.personality,
    chemistry: player.chemistry,
    hometownCity: player.hometown?.city ?? "",
    hometownState: player.hometown?.state ?? "",
    morale: String(player.morale),
    mojo: player.mojo,
    fame: String(player.fame),
    salary: String(player.salary),
    contractYears: String(player.contractYears ?? 1),
  };
}

function formDataToSmb4Input(player: BuilderPoolPlayer, formData: BuilderPlayerFormData): Smb4PlayerInput {
  const primaryPosition = normalizePrimaryPosition(formData.primaryPosition, player.primaryPosition);
  const pitcher = isPitcherPosition(primaryPosition);
  return {
    name: `${formData.firstName.trim() || player.firstName} ${formData.lastName.trim() || player.lastName}`.trim(),
    primaryPosition,
    secondaryPosition: normalizeBuilderSecondaryPosition(formData.secondaryPosition),
    bats: formData.bats,
    throws: formData.throws,
    power: numericInput(formData.power),
    contact: numericInput(formData.contact),
    speed: numericInput(formData.speed),
    fielding: numericInput(formData.fielding),
    arm: numericInput(formData.arm),
    velocity: pitcher ? numericInput(formData.velocity) : 0,
    junk: pitcher ? numericInput(formData.junk) : 0,
    accuracy: pitcher ? numericInput(formData.accuracy) : 0,
    arsenal: pitcher ? parseArsenal(formData.arsenal) : [],
    trait1: normalizeBuilderTrait(formData.trait1),
    trait2: normalizeBuilderTrait(formData.trait2),
  };
}

function formDataToPlayer(player: BuilderPoolPlayer, formData: BuilderPlayerFormData): BuilderPoolPlayer {
  const primaryPosition = normalizePrimaryPosition(formData.primaryPosition, player.primaryPosition);
  const smb4SecondaryPosition = normalizeBuilderSecondaryPosition(formData.secondaryPosition);
  const secondaryPosition = normalizeStorageSecondaryPosition(smb4SecondaryPosition);
  const pitcher = isPitcherPosition(primaryPosition);
  const next: BuilderPoolPlayer = {
    ...player,
    firstName: formData.firstName.trim() || player.firstName,
    lastName: formData.lastName.trim() || player.lastName,
    nickname: formData.nickname.trim() || undefined,
    backstory: formData.backstory.trim() || undefined,
    archetype: formData.archetype || undefined,
    signatureMoment: formData.signatureMoment.trim() || undefined,
    gender: formData.gender,
    baseFameTier: Math.max(1, Math.min(5, Number(formData.baseFameTier) || 3)) as FameTier,
    age: Math.max(18, Math.min(49, Number(formData.age) || player.age)),
    jerseyNumber: formData.jerseyNumber.trim() === "" ? undefined : Math.max(0, Math.min(99, Number(formData.jerseyNumber) || 0)),
    bats: formData.bats,
    throws: formData.throws,
    primaryPosition,
    secondaryPosition,
    smb4SecondaryPosition: smb4SecondaryPosition || undefined,
    power: numericInput(formData.power),
    contact: numericInput(formData.contact),
    speed: numericInput(formData.speed),
    fielding: numericInput(formData.fielding),
    arm: numericInput(formData.arm),
    velocity: pitcher ? numericInput(formData.velocity) : 0,
    junk: pitcher ? numericInput(formData.junk) : 0,
    accuracy: pitcher ? numericInput(formData.accuracy) : 0,
    arsenal: pitcher ? parseArsenal(formData.arsenal) : [],
    overallGrade: player.overallGrade,
    trait1: normalizeBuilderTrait(formData.trait1) || undefined,
    trait2: normalizeBuilderTrait(formData.trait2) || undefined,
    personality: formData.personality,
    chemistry: formData.chemistry,
    hometown: formData.hometownCity.trim() && formData.hometownState.trim()
      ? { city: formData.hometownCity.trim(), state: formData.hometownState.trim() }
      : undefined,
    morale: Math.max(0, Math.min(100, Number(formData.morale) || player.morale)),
    mojo: formData.mojo,
    fame: Math.max(0, Number(formData.fame) || 0),
    salary: Math.max(0, Number(formData.salary) || 0),
    contractYears: Math.max(1, Math.min(10, Number(formData.contractYears) || 1)),
    lastModified: new Date().toISOString(),
  };
  const score = scoreSmb4Player(formDataToSmb4Input(player, formData));
  return {
    ...next,
    overallGrade: mapSmb4GradeToStorageGrade(score.grade),
    generatedGrade: score.grade,
    numericScore: score.numericScore,
    baseWeighted: score.baseWeighted,
  };
}

function PlayerDetailModal({
  player,
  onClose,
  onSave,
  onDelete,
}: {
  player: BuilderPoolPlayer;
  onClose: () => void;
  onSave: (player: BuilderPoolPlayer) => void;
  onDelete?: (playerId: string) => void;
}) {
  const [formData, setFormData] = useState<BuilderPlayerFormData>(() => playerToFormData(player));
  const liveScore = useMemo(() => scoreSmb4Player(formDataToSmb4Input(player, formData)), [formData, player]);
  const liveStorageGrade = mapSmb4GradeToStorageGrade(liveScore.grade);
  const selectedPitches = parseArsenal(formData.arsenal);
  const arsenalError = arsenalValidationMessage(formData.primaryPosition, selectedPitches);
  const update = (key: keyof BuilderPlayerFormData, value: string) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };
  const save = () => {
    if (arsenalError) return;
    onSave(formDataToPlayer(player, formData));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div role="dialog" aria-modal="true" aria-label="Player details" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto border-[6px] border-[#E8E8D8] bg-[#556B55] p-5 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.9)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wide text-[#E8E8D8]">{fullName(player)}</h2>
            <div className="mt-1 text-xs text-[#E8E8D8]/60">{player.builderSource} · {player.sourceDatabase}</div>
          </div>
          <div className="flex gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete ${fullName(player)} from the generated player pool?`)) {
                    onDelete(player.id);
                    onClose();
                  }
                }}
                className="border-4 border-[#E8E8D8] bg-[#7A2E2E] p-3 text-[#E8E8D8] hover:bg-[#9A3A3A]"
                aria-label="Delete player"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="border-4 border-[#E8E8D8] bg-[#2d3d2f] p-3 text-[#E8E8D8] hover:bg-[#4A6844]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <FieldLabel label="First">
            <TextInput value={formData.firstName} onChange={(event) => update("firstName", event.target.value)} />
          </FieldLabel>
          <FieldLabel label="Last">
            <TextInput value={formData.lastName} onChange={(event) => update("lastName", event.target.value)} />
          </FieldLabel>
          <FieldLabel label="Nickname">
            <TextInput value={formData.nickname} onChange={(event) => update("nickname", event.target.value)} />
          </FieldLabel>
          <FieldLabel label="Computed Grade">
            <div
              aria-label="Computed Grade"
              className="w-full border-4 border-[#2d3d2f] bg-[#4A6844] px-3 py-2 text-sm font-bold text-[#E8E8D8]"
            >
              Generated {liveScore.grade}
              {liveScore.grade !== liveStorageGrade ? (
                <span className="ml-2 text-[10px] text-[#E8E8D8]/60">DB {liveStorageGrade}</span>
              ) : null}
              <span className="ml-2 text-[10px] text-[#E8E8D8]/60">{liveScore.numericScore.toFixed(2)}</span>
            </div>
          </FieldLabel>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
          <FieldLabel label="Gender">
            <SelectInput value={formData.gender} onChange={(event) => update("gender", event.target.value)}>
              <option value="M">M</option>
              <option value="F">F</option>
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Archetype">
            <SelectInput value={formData.archetype} onChange={(event) => update("archetype", event.target.value)}>
              <option value="">-</option>
              {PLAYER_ARCHETYPES.map((archetype) => (
                <option key={archetype} value={archetype}>{archetype}</option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Fame Tier">
            <TextInput value={formData.baseFameTier} onChange={(event) => update("baseFameTier", event.target.value)} inputMode="numeric" />
          </FieldLabel>
          <FieldLabel label="Contract">
            <TextInput value={formData.contractYears} onChange={(event) => update("contractYears", event.target.value)} inputMode="numeric" />
          </FieldLabel>
          <FieldLabel label="Source">
            <div className="w-full border-4 border-[#2d3d2f] bg-[#4A6844] px-3 py-2 text-sm font-bold text-[#E8E8D8]">
              {player.sourceDatabase}
            </div>
          </FieldLabel>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldLabel label="Backstory">
            <TextInput value={formData.backstory} onChange={(event) => update("backstory", event.target.value)} />
          </FieldLabel>
          <FieldLabel label="Signature Moment">
            <TextInput value={formData.signatureMoment} onChange={(event) => update("signatureMoment", event.target.value)} />
          </FieldLabel>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-6">
          <FieldLabel label="Age">
            <TextInput value={formData.age} onChange={(event) => update("age", event.target.value)} inputMode="numeric" />
          </FieldLabel>
          <FieldLabel label="Number">
            <TextInput value={formData.jerseyNumber} onChange={(event) => update("jerseyNumber", event.target.value)} inputMode="numeric" />
          </FieldLabel>
          <FieldLabel label="Bats">
            <SelectInput value={formData.bats} onChange={(event) => update("bats", event.target.value)}>
              {BAT_HAND_OPTIONS.map((hand) => (
                <option key={hand} value={hand}>{hand}</option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Throws">
            <SelectInput value={formData.throws} onChange={(event) => update("throws", event.target.value)}>
              {THROW_HAND_OPTIONS.map((hand) => (
                <option key={hand} value={hand}>{hand}</option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Primary">
            <SelectInput value={formData.primaryPosition} onChange={(event) => update("primaryPosition", event.target.value)}>
              {SMB4_BUILDER_PRIMARY_POSITIONS.map((position) => (
                <option key={position} value={position}>{position}</option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Secondary">
            <SelectInput value={formData.secondaryPosition} onChange={(event) => update("secondaryPosition", event.target.value)}>
              {SMB4_SECONDARY_POSITION_OPTIONS.map((position) => (
                <option key={position || "none"} value={position}>
                  {position || "None"}
                </option>
              ))}
            </SelectInput>
          </FieldLabel>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
          {(["power", "contact", "speed", "fielding", "arm"] as const).map((key) => (
            <FieldLabel key={key} label={key}>
              <TextInput value={formData[key]} onChange={(event) => update(key, event.target.value)} inputMode="numeric" />
            </FieldLabel>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          {(["velocity", "junk", "accuracy"] as const).map((key) => (
            <FieldLabel key={key} label={key}>
              <TextInput value={formData[key]} onChange={(event) => update(key, event.target.value)} inputMode="numeric" />
            </FieldLabel>
          ))}
          <FieldLabel label="Arsenal">
            <SelectInput
              multiple
              value={selectedPitches}
              onChange={(event) => update("arsenal", formatArsenal(toSelectedValues(event.target.options) as PitchType[]))}
            >
              {PITCH_TYPES.map((pitch) => (
                <option key={pitch} value={pitch} disabled={pitchOptionDisabled(selectedPitches, pitch)}>{pitch}</option>
              ))}
            </SelectInput>
            {arsenalError ? <div className="mt-2 text-[10px] font-bold uppercase text-[#F1C45B]">{arsenalError}</div> : null}
          </FieldLabel>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FieldLabel label="Trait 1">
            <SelectInput value={formData.trait1} onChange={(event) => update("trait1", event.target.value)}>
              <option value="">None</option>
              {SMB4_TRAIT_OPTIONS.map((trait) => (
                <option key={trait} value={trait}>{trait}</option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Trait 2">
            <SelectInput value={formData.trait2} onChange={(event) => update("trait2", event.target.value)}>
              <option value="">None</option>
              {SMB4_TRAIT_OPTIONS.map((trait) => (
                <option key={trait} value={trait}>{trait}</option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Personality">
            <SelectInput value={formData.personality} onChange={(event) => update("personality", event.target.value)}>
              {PERSONALITIES.map((personality) => (
                <option key={personality} value={personality}>{personality}</option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Chemistry">
            <SelectInput value={formData.chemistry} onChange={(event) => update("chemistry", event.target.value)}>
              {CHEMISTRIES.map((chemistry) => (
                <option key={chemistry} value={chemistry}>{chemistry}</option>
              ))}
            </SelectInput>
          </FieldLabel>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-6">
          <FieldLabel label="Hometown City">
            <TextInput value={formData.hometownCity} onChange={(event) => update("hometownCity", event.target.value)} />
          </FieldLabel>
          <FieldLabel label="State">
            <TextInput value={formData.hometownState} onChange={(event) => update("hometownState", event.target.value)} />
          </FieldLabel>
          <FieldLabel label="Morale">
            <TextInput value={formData.morale} onChange={(event) => update("morale", event.target.value)} inputMode="numeric" />
          </FieldLabel>
          <FieldLabel label="Mojo">
            <SelectInput value={formData.mojo} onChange={(event) => update("mojo", event.target.value)}>
              {MOJO_STATES.map((mojo) => (
                <option key={mojo} value={mojo}>{mojo}</option>
              ))}
            </SelectInput>
          </FieldLabel>
          <FieldLabel label="Fame">
            <TextInput value={formData.fame} onChange={(event) => update("fame", event.target.value)} inputMode="numeric" />
          </FieldLabel>
          <FieldLabel label="Salary">
            <TextInput value={formData.salary} onChange={(event) => update("salary", event.target.value)} inputMode="decimal" />
          </FieldLabel>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={Boolean(arsenalError)}
            className="flex items-center gap-2 border-4 border-[#E8E8D8] bg-[#C4A853] px-6 py-3 text-xs font-bold uppercase text-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save Player
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerTable({ players }: { players: Array<Partial<Smb4GeneratedPlayer> & { generatedGrade?: string; targetGrade?: string; numericScore?: number }> }) {
  return (
    <Panel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr className="text-[#E8E8D8]/70">
              <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Player</th>
              <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Pos</th>
              <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Grade</th>
              <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Score</th>
              <th className="border-b-4 border-[#2d3d2f] px-3 py-2">P/C/S</th>
              <th className="border-b-4 border-[#2d3d2f] px-3 py-2">V/J/A</th>
              <th className="border-b-4 border-[#2d3d2f] px-3 py-2">Traits</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={`${player.name}-${index}`} className="text-[#E8E8D8] odd:bg-[#4A6844] even:bg-[#556B55]">
                <td className="px-3 py-2 font-bold">{player.name}</td>
                <td className="px-3 py-2">{player.primaryPosition}{player.secondaryPosition ? `/${player.secondaryPosition}` : ""}</td>
                <td className="px-3 py-2">{player.generatedGrade}{player.targetGrade && player.targetGrade !== player.generatedGrade ? `/${player.targetGrade}` : ""}</td>
                <td className="px-3 py-2">{player.numericScore?.toFixed(1)}</td>
                <td className="px-3 py-2">{player.power ?? 0}/{player.contact ?? 0}/{player.speed ?? 0}</td>
                <td className="px-3 py-2">{player.velocity ?? 0}/{player.junk ?? 0}/{player.accuracy ?? 0}</td>
                <td className="px-3 py-2">{[player.trait1, player.trait2].filter(Boolean).join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function Builder() {
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState<BuilderTool>("team");
  const [pool, setPool] = useState<BuilderPoolPlayer[]>(() => loadBuilderPool());
  const [detailPlayer, setDetailPlayer] = useState<BuilderPoolPlayer | null>(null);
  const poolIds = useMemo(() => new Set(pool.map((player) => player.id)), [pool]);

  useEffect(() => {
    saveBuilderPool(pool);
  }, [pool]);

  const addToPool = (player: BuilderPoolPlayer) => {
    setPool((current) => {
      const existingIndex = current.findIndex((candidate) => candidate.id === player.id);
      const nextPlayer = { ...player, lastModified: new Date().toISOString() };
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = nextPlayer;
        return next;
      }
      return [nextPlayer, ...current];
    });
  };

  const updatePoolPlayer = (player: BuilderPoolPlayer) => {
    setPool((current) => (
      current.some((candidate) => candidate.id === player.id)
        ? current.map((candidate) => (candidate.id === player.id ? player : candidate))
        : [player, ...current]
    ));
    setDetailPlayer(player);
  };

  const deletePoolPlayer = (playerId: string) => {
    setPool((current) => current.filter((player) => player.id !== playerId));
    setDetailPlayer((current) => (current?.id === playerId ? null : current));
  };

  return (
    <div className="min-h-screen bg-[#2d3d2f] p-4 text-[#E8E8D8] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="border-4 border-[#E8E8D8] bg-[#4A6844] p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition hover:bg-[#5A8352] active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6 text-[#E8E8D8]" />
          </button>
          <div className="border-[6px] border-[#E8E8D8] bg-[#5A8352] px-6 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-[#E8E8D8]">Builder</h1>
          </div>
          <div className="border-4 border-[#C4A853] bg-[#4A6844] px-4 py-3 text-xs font-bold uppercase text-[#E8E8D8] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.75)]">
            Pool: {pool.length}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          {TOOL_TABS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={toolButtonClass(activeTool === tool.id)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>

        {activeTool === "league" && <LeagueBuilderPanel />}
        {activeTool === "team" && (
          <TeamBuilderPanel
            pool={pool}
            onOpenPlayer={setDetailPlayer}
            onDeleteFromPool={deletePoolPlayer}
          />
        )}
        {activeTool === "player" && (
          <PlayerBuilderPanel
            poolIds={poolIds}
            onOpenPlayer={setDetailPlayer}
            onAddToPool={addToPool}
          />
        )}
        {activeTool === "analyzer" && <PlayerAnalyzerPanel onAddToPool={addToPool} />}
      </div>
      {detailPlayer && (
        <PlayerDetailModal
          player={detailPlayer}
          onClose={() => setDetailPlayer(null)}
          onSave={updatePoolPlayer}
          onDelete={poolIds.has(detailPlayer.id) ? deletePoolPlayer : undefined}
        />
      )}
    </div>
  );
}
