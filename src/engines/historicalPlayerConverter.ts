import {
  SMB4_FULL_GRADE_SCALE,
  SMB4_GRADE_NUMERIC_CENTERS,
  scoreSmb4Player,
  type Smb4Grade,
  type Smb4GradeResult,
  type Smb4PlayerInput,
} from "./smb4GradeEmulator";
import type { Smb4GeneratedPlayer } from "./smb4PlayerGenerator";

export type HistoricalConversionMode = "career" | "peak" | "hybrid";
export type HistoricalPlayerKind = "hitter" | "pitcher" | "twoWay";
export type HistoricalPitchArchetype = "balanced" | "power" | "command" | "breaking" | "groundBall" | "knuckleball";
export type HistoricalPitcherRole = "starter" | "swingman" | "reliever" | "closer";
export type HistoricalConfidenceLevel = "high" | "medium" | "low";

export interface HistoricalPercentileSignals {
  overall?: number;
  power?: number;
  contact?: number;
  discipline?: number;
  speed?: number;
  baserunning?: number;
  defense?: number;
  arm?: number;
  durability?: number;
  versatility?: number;
  runPrevention?: number;
  strikeouts?: number;
  velocity?: number;
  movement?: number;
  command?: number;
  workload?: number;
  groundBall?: number;
  leverage?: number;
}

export interface HistoricalMetricSnapshot {
  career?: HistoricalPercentileSignals;
  peak?: HistoricalPercentileSignals;
  notes?: string[];
}

export interface HistoricalSeasonRecord {
  season: number;
  team?: string;
  age?: number;
  primaryPosition?: string;
  games?: number;
  plateAppearances?: number;
  inningsPitched?: number;
  signals?: HistoricalPercentileSignals;
}

export interface HistoricalCareerTotals {
  games?: number;
  plateAppearances?: number;
  inningsPitched?: number;
  seasons?: number;
}

export interface HistoricalSourceProvenance {
  sourceName: string;
  sourceVersion?: string;
  sourceUrl?: string;
  retrievedAt?: string;
  table?: string;
  notes?: string[];
}

export interface HistoricalPlayerSourceRecord {
  sourceId: string;
  sourceName: string;
  playerName: string;
  sourceIds?: Record<string, string>;
  provenance?: HistoricalSourceProvenance[];
  birthYear?: number;
  bats?: "R" | "L" | "S";
  throws?: "R" | "L";
  primaryPositions: string[];
  seasons?: HistoricalSeasonRecord[];
  careerTotals?: HistoricalCareerTotals;
  hitter?: HistoricalMetricSnapshot;
  pitcher?: HistoricalMetricSnapshot;
  playerKind?: HistoricalPlayerKind;
  pitcherRole?: HistoricalPitcherRole;
  pitchArchetype?: HistoricalPitchArchetype;
  awards?: string[];
  notes?: string[];
}

export interface HistoricalGradePolicy {
  mode: "natural" | "targeted" | "cap" | "floor";
  targetGrade?: Smb4Grade;
  maxGrade?: Smb4Grade;
  minGrade?: Smb4Grade;
  maxRatingAdjustment?: number;
}

export interface HistoricalConversionRequest {
  source: HistoricalPlayerSourceRecord;
  mode?: HistoricalConversionMode;
  playerKind?: HistoricalPlayerKind;
  gradePolicy?: HistoricalGradePolicy;
}

export interface HistoricalConversionConfidence {
  overall: HistoricalConfidenceLevel;
  ratings: Record<string, HistoricalConfidenceLevel>;
  traits: HistoricalConfidenceLevel;
  reasons: string[];
}

export interface HistoricalSmb4Profile {
  source: HistoricalPlayerSourceRecord;
  mode: HistoricalConversionMode;
  player: Smb4GeneratedPlayer;
  grade: Smb4GradeResult;
  historicalSummary: {
    archetype: string;
    primaryEvidence: string[];
    eraAdjustmentNotes: string[];
  };
  confidence: HistoricalConversionConfidence;
}

const PERCENTILE_RATING_ANCHORS = [
  [1, 5],
  [10, 20],
  [25, 38],
  [50, 55],
  [75, 72],
  [90, 86],
  [97, 95],
  [99, 99],
] as const;

const SMB4_POSITIONS = new Set(["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "SP", "RP", "CP", "SP/RP"]);
const PITCHER_POSITIONS = new Set(["P", "SP", "RP", "CP", "SP/RP"]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampRating(value: number): number {
  return Math.max(0, Math.min(99, Math.round(value)));
}

function cleanPercentile(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return clamp(value, 1, 99);
}

export function percentileToSmb4Rating(percentile: number | undefined, fallback = 50): number {
  const p = cleanPercentile(percentile) ?? fallback;
  const anchors = PERCENTILE_RATING_ANCHORS;

  if (p <= anchors[0][0]) return anchors[0][1];
  if (p >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const [leftPercentile, leftRating] = anchors[index];
    const [rightPercentile, rightRating] = anchors[index + 1];
    if (p >= leftPercentile && p <= rightPercentile) {
      const progress = (p - leftPercentile) / (rightPercentile - leftPercentile);
      return clampRating(leftRating + progress * (rightRating - leftRating));
    }
  }

  return 55;
}

function hasSignals(snapshot: HistoricalMetricSnapshot | undefined): boolean {
  return Boolean(snapshot?.career || snapshot?.peak);
}

function meanDefined(values: Array<number | undefined>): number | undefined {
  const defined = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return defined.length > 0 ? defined.reduce((sum, value) => sum + value, 0) / defined.length : undefined;
}

function signal(
  snapshot: HistoricalMetricSnapshot | undefined,
  key: keyof HistoricalPercentileSignals,
  mode: HistoricalConversionMode,
): number | undefined {
  const career = cleanPercentile(snapshot?.career?.[key]);
  const peak = cleanPercentile(snapshot?.peak?.[key]);

  if (mode === "career") return career ?? peak;
  if (mode === "peak") return peak ?? career;
  if (career !== undefined && peak !== undefined) return 0.4 * career + 0.6 * peak;
  return peak ?? career;
}

function evidenceLine(label: string, percentile: number | undefined, rating: number): string {
  return percentile === undefined ? `${label}: fallback percentile -> ${rating}` : `${label}: p${percentile.toFixed(0)} -> ${rating}`;
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveHistoricalPlayerByName(
  name: string,
  records: HistoricalPlayerSourceRecord[],
): HistoricalPlayerSourceRecord[] {
  const target = normalizeName(name);
  if (!target) return [];

  return records.filter((record) => {
    const playerName = normalizeName(record.playerName);
    return playerName === target || playerName.includes(target) || target.includes(playerName);
  });
}

function inferKind(source: HistoricalPlayerSourceRecord, requested: HistoricalPlayerKind | undefined): HistoricalPlayerKind {
  if (requested) return requested;
  if (source.playerKind) return source.playerKind;

  const hasHitter = hasSignals(source.hitter);
  const hasPitcher = hasSignals(source.pitcher);
  if (hasHitter && hasPitcher) return "twoWay";
  if (hasPitcher) return "pitcher";
  return "hitter";
}

function normalizePosition(position: string): string {
  const cleaned = position.trim().toUpperCase();
  if (SMB4_POSITIONS.has(cleaned)) return cleaned;
  if (cleaned === "P") return "SP";
  if (cleaned === "OF") return "CF";
  if (cleaned === "IF") return "SS";
  return cleaned;
}

function inferPitcherPosition(role: HistoricalPitcherRole | undefined): string {
  if (role === "closer") return "CP";
  if (role === "reliever") return "RP";
  if (role === "swingman") return "SP/RP";
  return "SP";
}

function inferPrimaryPosition(
  source: HistoricalPlayerSourceRecord,
  kind: HistoricalPlayerKind,
  speedPercentile: number | undefined,
  defensePercentile: number | undefined,
  armPercentile: number | undefined,
): string {
  if (kind === "pitcher") return inferPitcherPosition(source.pitcherRole);

  const firstPosition = source.primaryPositions.map(normalizePosition).find((position) => !PITCHER_POSITIONS.has(position));
  if (!firstPosition) return kind === "twoWay" ? inferPitcherPosition(source.pitcherRole) : "CF";
  if (firstPosition === "CF") return "CF";
  if (firstPosition === "OF") {
    if ((speedPercentile ?? 50) >= 80 || (defensePercentile ?? 50) >= 80) return "CF";
    if ((armPercentile ?? 50) >= 70) return "RF";
    return "LF";
  }
  return SMB4_POSITIONS.has(firstPosition) ? firstPosition : "CF";
}

function inferSecondaryPosition(source: HistoricalPlayerSourceRecord, primaryPosition: string, kind: HistoricalPlayerKind): string {
  if (kind === "pitcher") return "";

  const candidates = source.primaryPositions
    .map(normalizePosition)
    .filter((position) => position !== primaryPosition && !PITCHER_POSITIONS.has(position));
  const uniqueCandidates = Array.from(new Set(candidates));
  if (uniqueCandidates.length === 0) return "";
  if (uniqueCandidates.length >= 3) return "IF/OF";
  if (uniqueCandidates.every((position) => ["LF", "CF", "RF"].includes(position))) return "OF";
  return uniqueCandidates.slice(0, 2).join("/");
}

function positionArmFallback(position: string): number {
  if (position === "C" || position === "RF") return 75;
  if (position === "SS" || position === "3B") return 68;
  if (position === "CF") return 62;
  if (position === "2B" || position === "LF") return 55;
  return 48;
}

function gradeIndex(grade: Smb4Grade): number {
  return SMB4_FULL_GRADE_SCALE.indexOf(grade);
}

function isBetterGrade(actual: Smb4Grade, limit: Smb4Grade): boolean {
  return gradeIndex(actual) < gradeIndex(limit);
}

function isWorseGrade(actual: Smb4Grade, limit: Smb4Grade): boolean {
  return gradeIndex(actual) > gradeIndex(limit);
}

function ratingKeys(player: Smb4PlayerInput): Array<keyof Smb4PlayerInput> {
  const primary = String(player.primaryPosition || "").toUpperCase();
  return PITCHER_POSITIONS.has(primary)
    ? ["velocity", "junk", "accuracy"]
    : ["power", "contact", "speed", "fielding", "arm"];
}

function adjustPlayerRatings(player: Smb4PlayerInput, direction: 1 | -1, maxPerRating: number): Smb4PlayerInput {
  let adjusted = { ...player };
  for (const key of ratingKeys(player)) {
    const current = Number(adjusted[key] ?? 0);
    adjusted = { ...adjusted, [key]: clampRating(current + direction * maxPerRating) };
  }
  return adjusted;
}

function applyGradePolicy(player: Smb4PlayerInput, policy: HistoricalGradePolicy | undefined): Smb4PlayerInput {
  const effectivePolicy = policy ?? { mode: "natural" };
  const maxAdjustment = Math.max(0, Math.min(18, Math.round(effectivePolicy.maxRatingAdjustment ?? 10)));
  if (effectivePolicy.mode === "natural" || maxAdjustment === 0) return player;

  let adjusted = { ...player };
  let result = scoreSmb4Player(adjusted);

  if (effectivePolicy.mode === "targeted" && effectivePolicy.targetGrade) {
    const targetScore = SMB4_GRADE_NUMERIC_CENTERS[effectivePolicy.targetGrade];
    const direction: 1 | -1 = result.numericScore < targetScore ? 1 : -1;
    adjusted = adjustPlayerRatings(adjusted, direction, maxAdjustment);
    return adjusted;
  }

  if (effectivePolicy.mode === "cap" && effectivePolicy.maxGrade && isBetterGrade(result.grade, effectivePolicy.maxGrade)) {
    adjusted = adjustPlayerRatings(adjusted, -1, maxAdjustment);
    result = scoreSmb4Player(adjusted);
    return isBetterGrade(result.grade, effectivePolicy.maxGrade) ? adjustPlayerRatings(adjusted, -1, Math.ceil(maxAdjustment / 2)) : adjusted;
  }

  if (effectivePolicy.mode === "floor" && effectivePolicy.minGrade && isWorseGrade(result.grade, effectivePolicy.minGrade)) {
    adjusted = adjustPlayerRatings(adjusted, 1, maxAdjustment);
  }

  return adjusted;
}

interface TraitCandidate {
  trait: string;
  score: number;
  reason: string;
}

function topTraits(candidates: TraitCandidate[], maxTraits = 2): { traits: string[]; evidence: string[] } {
  const selected: string[] = [];
  const evidence: string[] = [];

  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    if (selected.length >= maxTraits) break;
    if (!selected.includes(candidate.trait)) {
      selected.push(candidate.trait);
      evidence.push(candidate.reason);
    }
  }

  return { traits: selected, evidence };
}

function inferHitterTraits(signals: HistoricalPercentileSignals, primaryPosition: string, positionCount: number): { traits: string[]; evidence: string[] } {
  const candidates: TraitCandidate[] = [];
  const power = signals.power ?? 50;
  const contact = signals.contact ?? 50;
  const discipline = signals.discipline ?? 50;
  const speed = Math.max(signals.speed ?? 50, signals.baserunning ?? 50);
  const defense = signals.defense ?? 50;
  const arm = signals.arm ?? 50;

  if (power >= 90) candidates.push({ trait: "RBI Hero", score: power, reason: `elite power signal p${power.toFixed(0)}` });
  if (contact >= 90) candidates.push({ trait: "Tough Out", score: contact, reason: `elite contact signal p${contact.toFixed(0)}` });
  if (discipline >= 90) candidates.push({ trait: "Rally Starter", score: discipline, reason: `elite on-base/discipline signal p${discipline.toFixed(0)}` });
  if (speed >= 92) candidates.push({ trait: "Stealer", score: speed + 2, reason: `elite speed/baserunning signal p${speed.toFixed(0)}` });
  if (speed >= 86) candidates.push({ trait: "Sprinter", score: speed, reason: `plus speed signal p${speed.toFixed(0)}` });
  if (defense >= 90) candidates.push({ trait: primaryPosition === "C" || arm >= 85 ? "Cannon Arm" : "Magic Hands", score: defense, reason: `elite defense signal p${defense.toFixed(0)}` });
  if (positionCount >= 4 || (signals.versatility ?? 0) >= 85) candidates.push({ trait: "Utility", score: signals.versatility ?? 85, reason: "multi-position historical profile" });
  if (contact <= 15) candidates.push({ trait: "Whiffer", score: 100 - contact, reason: `very low contact signal p${contact.toFixed(0)}` });
  if (speed <= 15) candidates.push({ trait: "Slow Poke", score: 100 - speed, reason: `very low speed signal p${speed.toFixed(0)}` });

  return topTraits(candidates);
}

function inferPitchTraits(signals: HistoricalPercentileSignals, role: HistoricalPitcherRole | undefined, archetype: HistoricalPitchArchetype): { traits: string[]; evidence: string[] } {
  const candidates: TraitCandidate[] = [];
  const strikeouts = signals.strikeouts ?? signals.velocity ?? 50;
  const command = signals.command ?? 50;
  const movement = signals.movement ?? 50;
  const workload = signals.workload ?? 50;

  if (strikeouts >= 90) candidates.push({ trait: "K Collector", score: strikeouts + 2, reason: `elite strikeout signal p${strikeouts.toFixed(0)}` });
  if (command >= 90) candidates.push({ trait: "Gets Ahead", score: command, reason: `elite command signal p${command.toFixed(0)}` });
  if (workload >= 88 && role !== "closer" && role !== "reliever") candidates.push({ trait: "Workhorse", score: workload, reason: `elite starter workload signal p${workload.toFixed(0)}` });
  if (movement >= 92) {
    const trait = archetype === "command" ? "Elite CH" : archetype === "groundBall" ? "Elite 2F" : archetype === "breaking" ? "Elite SL" : "Elite 4F";
    candidates.push({ trait, score: movement, reason: `elite pitch-shape signal p${movement.toFixed(0)}` });
  }
  if (role === "closer" && (signals.leverage ?? 0) >= 85) candidates.push({ trait: "Clutch", score: signals.leverage ?? 85, reason: "high-leverage closer profile" });
  if (command <= 18) candidates.push({ trait: "BB Prone", score: 100 - command, reason: `low command signal p${command.toFixed(0)}` });

  return topTraits(candidates);
}

function inferArsenal(role: HistoricalPitcherRole | undefined, archetype: HistoricalPitchArchetype, signals: HistoricalPercentileSignals): { arsenal: string[]; notes: string[] } {
  const pools: Record<HistoricalPitchArchetype, string[]> = {
    balanced: ["4F", "SL", "CH", "CB", "2F"],
    power: ["4F", "SL", "CH", "CF", "CB"],
    command: ["4F", "CH", "CB", "2F", "SL"],
    breaking: ["4F", "SL", "CB", "FK", "CH"],
    groundBall: ["2F", "CF", "SL", "CH", "CB"],
    knuckleball: ["4F", "CB", "CH", "FK", "2F"],
  };
  const targetCount =
    role === "closer"
      ? 3
      : role === "reliever"
        ? 3
        : role === "swingman"
          ? 4
          : (signals.workload ?? 50) >= 88
            ? 5
            : 4;
  const notes = archetype === "knuckleball" ? ["SMB4 has no true knuckleball; FK/CB/CH proxy used."] : [];
  return { arsenal: pools[archetype].slice(0, targetCount), notes };
}

function confidenceForSignal(value: number | undefined): HistoricalConfidenceLevel {
  return value === undefined ? "low" : "high";
}

function overallConfidence(ratings: Record<string, HistoricalConfidenceLevel>, traitConfidence: HistoricalConfidenceLevel): HistoricalConfidenceLevel {
  const values = [...Object.values(ratings), traitConfidence];
  const lows = values.filter((value) => value === "low").length;
  const mediums = values.filter((value) => value === "medium").length;
  if (lows >= 2) return "low";
  if (lows === 1 || mediums >= 2) return "medium";
  return "high";
}

function sourceAge(source: HistoricalPlayerSourceRecord, mode: HistoricalConversionMode): number {
  const ages = source.seasons?.map((season) => season.age).filter((age): age is number => typeof age === "number") ?? [];
  if (ages.length === 0) return mode === "career" ? 29 : 27;
  if (mode === "peak") return Math.round(Math.min(...ages) + (Math.max(...ages) - Math.min(...ages)) * 0.35);
  return Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length);
}

function buildHitterProfile(source: HistoricalPlayerSourceRecord, mode: HistoricalConversionMode): {
  player: Smb4PlayerInput;
  evidence: string[];
  eraNotes: string[];
  confidenceRatings: Record<string, HistoricalConfidenceLevel>;
  traitConfidence: HistoricalConfidenceLevel;
} {
  const hitter = source.hitter;
  const powerSignal = signal(hitter, "power", mode);
  const contactSignal = meanDefined([signal(hitter, "contact", mode), signal(hitter, "discipline", mode)]);
  const speedSignal = meanDefined([signal(hitter, "speed", mode), signal(hitter, "baserunning", mode)]);
  const defenseSignal = signal(hitter, "defense", mode);
  const armSignal = signal(hitter, "arm", mode);
  const primaryPosition = inferPrimaryPosition(source, "hitter", speedSignal, defenseSignal, armSignal);
  const secondaryPosition = inferSecondaryPosition(source, primaryPosition, "hitter");

  const power = percentileToSmb4Rating(powerSignal);
  const contact = percentileToSmb4Rating(contactSignal);
  const speed = percentileToSmb4Rating(speedSignal);
  const fielding = percentileToSmb4Rating(defenseSignal, 50);
  const arm = percentileToSmb4Rating(armSignal, positionArmFallback(primaryPosition));
  const resolvedSignals: HistoricalPercentileSignals = {
    power: powerSignal,
    contact: signal(hitter, "contact", mode),
    discipline: signal(hitter, "discipline", mode),
    speed: signal(hitter, "speed", mode),
    baserunning: signal(hitter, "baserunning", mode),
    defense: defenseSignal,
    arm: armSignal,
    versatility: signal(hitter, "versatility", mode),
  };
  const traits = inferHitterTraits(resolvedSignals, primaryPosition, source.primaryPositions.length);

  return {
    player: {
      name: source.playerName,
      age: sourceAge(source, mode),
      primaryPosition,
      secondaryPosition,
      bats: source.bats ?? "R",
      throws: source.throws ?? "R",
      power,
      contact,
      speed,
      fielding,
      arm,
      velocity: 0,
      junk: 0,
      accuracy: 0,
      trait1: traits.traits[0] ?? "",
      trait2: traits.traits[1] ?? "",
    },
    evidence: [
      evidenceLine("power", powerSignal, power),
      evidenceLine("contact", contactSignal, contact),
      evidenceLine("speed", speedSignal, speed),
      evidenceLine("fielding", defenseSignal, fielding),
      evidenceLine("arm", armSignal, arm),
      ...traits.evidence,
    ],
    eraNotes: ["Input percentiles are assumed to be era-adjusted by the source adapter."],
    confidenceRatings: {
      power: confidenceForSignal(powerSignal),
      contact: confidenceForSignal(contactSignal),
      speed: confidenceForSignal(speedSignal),
      fielding: confidenceForSignal(defenseSignal),
      arm: armSignal === undefined ? "medium" : "high",
    },
    traitConfidence: traits.traits.length > 0 ? "medium" : "low",
  };
}

function buildPitcherProfile(source: HistoricalPlayerSourceRecord, mode: HistoricalConversionMode): {
  player: Smb4PlayerInput;
  evidence: string[];
  eraNotes: string[];
  confidenceRatings: Record<string, HistoricalConfidenceLevel>;
  traitConfidence: HistoricalConfidenceLevel;
} {
  const pitcher = source.pitcher;
  const velocitySignal = meanDefined([signal(pitcher, "velocity", mode), signal(pitcher, "strikeouts", mode)]);
  const junkSignal = meanDefined([signal(pitcher, "movement", mode), signal(pitcher, "groundBall", mode), signal(pitcher, "runPrevention", mode)]);
  const accuracySignal = signal(pitcher, "command", mode);
  const role = source.pitcherRole ?? "starter";
  const archetype = source.pitchArchetype ?? "balanced";
  const primaryPosition = inferPitcherPosition(role);
  const resolvedSignals: HistoricalPercentileSignals = {
    strikeouts: signal(pitcher, "strikeouts", mode),
    velocity: signal(pitcher, "velocity", mode),
    movement: signal(pitcher, "movement", mode),
    command: accuracySignal,
    workload: signal(pitcher, "workload", mode),
    leverage: signal(pitcher, "leverage", mode),
  };
  const traits = inferPitchTraits(resolvedSignals, role, archetype);
  const arsenal = inferArsenal(role, archetype, resolvedSignals);
  const velocity = percentileToSmb4Rating(velocitySignal);
  const junk = percentileToSmb4Rating(junkSignal);
  const accuracy = percentileToSmb4Rating(accuracySignal);

  return {
    player: {
      name: source.playerName,
      age: sourceAge(source, mode),
      primaryPosition,
      secondaryPosition: "",
      bats: source.bats ?? "R",
      throws: source.throws ?? "R",
      power: 0,
      contact: 0,
      speed: percentileToSmb4Rating(signal(source.hitter, "speed", mode), 20),
      fielding: percentileToSmb4Rating(signal(source.pitcher, "defense", mode), 45),
      arm: 0,
      velocity,
      junk,
      accuracy,
      arsenal: arsenal.arsenal,
      trait1: traits.traits[0] ?? "",
      trait2: traits.traits[1] ?? "",
    },
    evidence: [
      evidenceLine("velocity", velocitySignal, velocity),
      evidenceLine("junk", junkSignal, junk),
      evidenceLine("accuracy", accuracySignal, accuracy),
      ...traits.evidence,
    ],
    eraNotes: ["Input percentiles are assumed to be era-adjusted by the source adapter.", ...arsenal.notes],
    confidenceRatings: {
      velocity: confidenceForSignal(velocitySignal),
      junk: confidenceForSignal(junkSignal),
      accuracy: confidenceForSignal(accuracySignal),
      arsenal: "medium",
    },
    traitConfidence: traits.traits.length > 0 ? "medium" : "low",
  };
}

function archetypeForPlayer(player: Smb4PlayerInput, kind: HistoricalPlayerKind, source: HistoricalPlayerSourceRecord): string {
  if (kind === "pitcher") {
    const role = source.pitcherRole ?? "starter";
    const shape = source.pitchArchetype ?? "balanced";
    return `${shape} ${role}`;
  }

  const power = Number(player.power ?? 0);
  const contact = Number(player.contact ?? 0);
  const speed = Number(player.speed ?? 0);
  if (speed >= 90) return "speed and on-base catalyst";
  if (power >= 90) return "power hitter";
  if (contact >= 90) return "contact hitter";
  return "balanced position player";
}

function toGeneratedPlayer(player: Smb4PlayerInput, grade: Smb4GradeResult, confidence: HistoricalConversionConfidence): Smb4GeneratedPlayer {
  const confidenceScore = confidence.overall === "high" ? 95 : confidence.overall === "medium" ? 82 : 65;
  return {
    ...player,
    targetGrade: grade.grade,
    generatedGrade: grade.grade,
    numericScore: grade.numericScore,
    baseWeighted: grade.baseWeighted,
    realismScore: confidenceScore,
    generationNotes: [
      `Converted from historical source record ${player.name ?? "unknown"} using percentile signals.`,
      `Natural SMB4 grade from emulator: ${grade.grade}.`,
    ],
  };
}

export function convertHistoricalPlayerToSmb4(request: HistoricalConversionRequest): HistoricalSmb4Profile {
  const mode = request.mode ?? "hybrid";
  const kind = inferKind(request.source, request.playerKind);
  const builder = kind === "pitcher" ? buildPitcherProfile(request.source, mode) : buildHitterProfile(request.source, mode);
  const policyAdjustedPlayer = applyGradePolicy(builder.player, request.gradePolicy);
  const grade = scoreSmb4Player(policyAdjustedPlayer);
  const missingReasons = Object.entries(builder.confidenceRatings)
    .filter(([, confidence]) => confidence !== "high")
    .map(([rating, confidence]) => `${rating} confidence is ${confidence}; source signal was inferred or incomplete.`);
  const confidence: HistoricalConversionConfidence = {
    overall: overallConfidence(builder.confidenceRatings, builder.traitConfidence),
    ratings: builder.confidenceRatings,
    traits: builder.traitConfidence,
    reasons: missingReasons.length > 0 ? missingReasons : ["All primary rating signals were supplied by the resolved source record."],
  };
  const player = toGeneratedPlayer(policyAdjustedPlayer, grade, confidence);

  return {
    source: request.source,
    mode,
    player,
    grade,
    historicalSummary: {
      archetype: archetypeForPlayer(policyAdjustedPlayer, kind === "twoWay" ? "hitter" : kind, request.source),
      primaryEvidence: builder.evidence,
      eraAdjustmentNotes: builder.eraNotes,
    },
    confidence,
  };
}
