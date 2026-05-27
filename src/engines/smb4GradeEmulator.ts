export const SMB4_FULL_GRADE_SCALE = [
  "S",
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "E+",
  "E",
  "E-",
  "F",
] as const;

export type Smb4Grade = (typeof SMB4_FULL_GRADE_SCALE)[number];
export type Smb4PlayerType = "hitter" | "pitcher";
export type Smb4GradeMappingMode = "calibrated" | "center";

export interface Smb4PlayerInput {
  name?: string;
  age?: number | string;
  primaryPosition?: string;
  primary?: string;
  secondaryPosition?: string;
  secondary?: string;
  bats?: string;
  throws?: string;
  overallGrade?: string;
  power?: number | string;
  contact?: number | string;
  speed?: number | string;
  fielding?: number | string;
  arm?: number | string;
  velocity?: number | string;
  junk?: number | string;
  accuracy?: number | string;
  arsenal?: string[] | string;
  trait1?: string;
  trait2?: string;
}

export interface Smb4ScoreOptions {
  gradeMapping?: Smb4GradeMappingMode;
}

export interface NormalizedSmb4Player {
  name?: string;
  primaryPosition: string;
  secondaryPosition: string;
  bats: string;
  throws: string;
  traits: string[];
  pitches: string[];
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity: number;
  junk: number;
  accuracy: number;
}

export interface Smb4ModelPayload {
  playerType: Smb4PlayerType;
  player: NormalizedSmb4Player;
  baseWeighted: number;
  positiveTraits: number;
  negativeTraits: number;
  unknownTraits: string[];
  features: Record<string, number>;
  model: Smb4LinearModel;
}

export interface Smb4GradeResult {
  numericScore: number;
  gradeIndex: number;
  grade: Smb4Grade;
  baseWeighted: number;
  positiveTraits: number;
  negativeTraits: number;
  unknownTraits: string[];
  playerType: Smb4PlayerType;
  warnings: string[];
}

export interface Smb4Contribution {
  feature: string;
  value: number;
  coefficient: number;
  contribution: number;
}

export interface Smb4GradeExplanation extends Smb4GradeResult {
  intercept: number;
  topContributions: Smb4Contribution[];
  allContributions: Smb4Contribution[];
}

interface Smb4LinearModel {
  intercept: number;
  features: Record<string, number>;
}

export interface Smb4GradeThreshold {
  higherGrade: Smb4Grade;
  lowerGrade: Smb4Grade;
  threshold: number;
  source: "rosterCalibration" | "centerFallback";
}

export const SMB4_GRADE_NUMERIC_CENTERS: Record<Smb4Grade, number> = {
  S: 97,
  "A+": 92,
  A: 87,
  "A-": 82,
  "B+": 77,
  B: 72,
  "B-": 67,
  "C+": 62,
  C: 57,
  "C-": 52,
  "D+": 47,
  D: 42,
  "D-": 37,
  "E+": 32,
  E: 27,
  "E-": 22,
  F: 15,
};

const SMB4_CENTER_GRADE_THRESHOLDS: Smb4GradeThreshold[] = SMB4_FULL_GRADE_SCALE.slice(0, -1).map(
  (grade, index) => {
    const lowerGrade = SMB4_FULL_GRADE_SCALE[index + 1];
    return {
      higherGrade: grade,
      lowerGrade,
      threshold: (SMB4_GRADE_NUMERIC_CENTERS[grade] + SMB4_GRADE_NUMERIC_CENTERS[lowerGrade]) / 2,
      source: "centerFallback",
    };
  },
);

export const SMB4_CALIBRATED_GRADE_THRESHOLDS: Smb4GradeThreshold[] = [
  { higherGrade: "S", lowerGrade: "A+", threshold: 94.72633393739702, source: "rosterCalibration" },
  { higherGrade: "A+", lowerGrade: "A", threshold: 88.957761254456, source: "rosterCalibration" },
  { higherGrade: "A", lowerGrade: "A-", threshold: 84.732864109651, source: "rosterCalibration" },
  { higherGrade: "A-", lowerGrade: "B+", threshold: 79.62964703342399, source: "rosterCalibration" },
  { higherGrade: "B+", lowerGrade: "B", threshold: 74.142834774099, source: "rosterCalibration" },
  { higherGrade: "B", lowerGrade: "B-", threshold: 69.610982426318, source: "rosterCalibration" },
  { higherGrade: "B-", lowerGrade: "C+", threshold: 65.03540988761, source: "rosterCalibration" },
  { higherGrade: "C+", lowerGrade: "C", threshold: 59.79743670891699, source: "rosterCalibration" },
  { higherGrade: "C", lowerGrade: "C-", threshold: 54.29331927653399, source: "rosterCalibration" },
  { higherGrade: "C-", lowerGrade: "D+", threshold: 49.61061339815299, source: "rosterCalibration" },
  { higherGrade: "D+", lowerGrade: "D", threshold: 47.450133899979996, source: "rosterCalibration" },
  ...SMB4_CENTER_GRADE_THRESHOLDS.slice(11),
];

export const SMB4_GRADE_TO_INDEX: Record<Smb4Grade, number> = SMB4_FULL_GRADE_SCALE.reduce(
  (acc, grade, index) => {
    acc[grade] = SMB4_FULL_GRADE_SCALE.length - 1 - index;
    return acc;
  },
  {} as Record<Smb4Grade, number>,
);

export const SMB4_PITCHER_POSITIONS = new Set(["SP", "RP", "CP", "SP/RP"]);

const VERSATILITY_MAP: Record<string, number> = {
  "IF/OF": 7,
  IF: 4,
  "1B/OF": 4,
  OF: 3,
  "C/1B": 2,
  "SP/RP": 2,
};

const TRAIT_NORMALIZATION: Record<string, string> = {
  "PWR vs RHP": "POW vs RHP",
  "PWR vs LHP": "POW vs LHP",
  "Elite 4": "Elite 4F",
  "K Neglector": "K Neglecter",
  "Two Way (IF)": "Two Way",
  "Two Way (OF)": "Two Way",
  "Con vs LHP": "CON vs LHP",
  "Con vs RHP": "CON vs RHP",
  "Con vs RPH": "CON vs RHP",
  "CON vs RPH": "CON vs RHP",
  "POW vs PHP": "POW vs RHP",
  Slowpoke: "Slow Poke",
  "East Target": "Easy Target",
  "Base Rounds": "Base Rounder",
  Clitch: "Clutch",
};

const POSITIVE_TRAITS = new Set([
  "Cannon Arm",
  "Durable",
  "First Pitch Slayer",
  "Sprinter",
  "K Collector",
  "Tough Out",
  "Stimulated",
  "Specialist",
  "Reverse Splits",
  "Stealer",
  "Pick Officer",
  "Sign Stealer",
  "Mind Gamer",
  "Distractor",
  "Bad Ball Hitter",
  "Pinch Perfect",
  "Base Rounder",
  "Composed",
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
  "Rally Stopper",
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
  "Gets Ahead",
  "Workhorse",
  "Elite 4F",
  "Elite 2F",
  "Elite CF",
  "Elite FK",
  "Elite SL",
  "Elite CB",
  "Elite CH",
  "Elite SB",
]);

const NEGATIVE_TRAITS = new Set([
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
]);

const HITTER_MODEL: Smb4LinearModel = {
  intercept: 10.5965166711,
  features: {
    power: 0.2825983581,
    contact: 0.2806503532,
    speed: 0.2027213083,
    fielding: 0.1147824982,
    arm: 0.0915305332,
    pow_con: -0.0088454122,
    spd_fld: -0.0336045706,
    bat_L: 2.8497389733,
    bat_S: 4.5116226727,
    thr_L: -0.6571546448,
    vers: 0.0850728147,
    vers2: 0.0129488446,
    vers_util: 0.1909373936,
    pos_count: 0.9656824071,
    neg_count: -1.7517683256,
    "tr_First Pitch Slayer": 0.6985887989,
    "tr_Little Hack": -1.270830964,
    "tr_Mind Gamer": 1.501427613,
    "tr_Rally Starter": -0.199873804,
    "tr_Magic Hands": -0.8310486121,
    tr_Utility: -0.3052216719,
    "tr_Big Hack": -0.2192440495,
    tr_Sprinter: -0.2816825373,
    "tr_Cannon Arm": -0.5417638949,
    "tr_Fastball Hitter": 2.4542565444,
    "tr_Bad Ball Hitter": -0.4592940132,
    tr_Whiffer: -0.7381706008,
    pos_2B: 0.8313525554,
    pos_3B: -1.2668027922,
    pos_C: 2.2997744611,
    pos_CF: 0.6637032249,
    pos_LF: -0.5614229268,
    pos_RF: -0.1963177907,
    pos_SS: 0.1115302985,
    sec_1B: -0.0743925098,
    "sec_1B/OF": -0.9164565494,
    sec_2B: 0.8398362231,
    sec_3B: 0.3035512464,
    sec_C: -0.8721695187,
    sec_IF: 0.5288517627,
    sec_LF: 0.0694935796,
    sec_OF: 0.1776157661,
    sec_RF: -0.4608455812,
    sec_SS: 0.7115980783,
  },
};

const PITCHER_MODEL: Smb4LinearModel = {
  intercept: 16.5944849573,
  features: {
    velocity: 0.2529999141,
    junk: 0.2665900378,
    accuracy: 0.2632687105,
    power: 0.0427586837,
    contact: 0.0534777057,
    speed: 0.009015832,
    jnk_acc: 0.0204898106,
    arsenal_count: 1.0091022427,
    bat_L: 1.0968542297,
    bat_S: 0.3771555045,
    thr_L: -0.2226159177,
    pos_count: 1.21385024,
    neg_count: -1.1652812274,
    "tr_K Collector": 0.908746192,
    "tr_Gets Ahead": 1.0320910791,
    "tr_Elite 2F": -0.5280484145,
    "tr_Elite 4F": 0.4167563425,
    "tr_Falls Behind": -0.9976052263,
    "tr_Elite CF": 0.7579419877,
    "tr_Rally Stopper": -1.1328476477,
    "tr_Elite FK": 0.4854804797,
    tr_Specialist: 2.1540724826,
    "tr_Crossed Up": 1.5628438611,
    "tr_Elite CB": -0.2319264114,
    tr_Volatile: 1.6516084637,
    pos_RP: 0.0143423869,
    pos_SP: 0.236161321,
    "pos_SP/RP": -1.0149995619,
    pitch_2F: 0.473192469,
    pitch_4F: 0.6321855453,
    pitch_CB: 0.1994458286,
    pitch_CF: 0.4593316468,
    pitch_CH: 0.0411500855,
    pitch_FK: -0.4882808759,
    pitch_SB: 0.1040401887,
    pitch_SL: -0.4119626453,
  },
};

const PITCHER_TRAIT_FLAGS = [
  "K Collector",
  "Gets Ahead",
  "Elite 2F",
  "Elite 4F",
  "Falls Behind",
  "Elite CF",
  "Rally Stopper",
  "Elite FK",
  "Specialist",
  "Crossed Up",
  "Elite CB",
  "Volatile",
];

const HITTER_TRAIT_FLAGS = [
  "First Pitch Slayer",
  "Little Hack",
  "Mind Gamer",
  "Rally Starter",
  "Magic Hands",
  "Utility",
  "Big Hack",
  "Sprinter",
  "Cannon Arm",
  "Fastball Hitter",
  "Bad Ball Hitter",
  "Whiffer",
];

const PITCH_FLAGS = ["2F", "4F", "CB", "CF", "CH", "FK", "SB", "SL"];
const SMB4_PITCH_SET = new Set(PITCH_FLAGS);

function toNumber(value: number | string | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeHand(value: string | undefined, fallback: string): string {
  const normalized = (value || fallback).trim().toUpperCase();
  return normalized || fallback;
}

export function normalizeTrait(trait: string | undefined): string {
  const trimmed = (trait || "").trim();
  if (!trimmed) return "";
  return TRAIT_NORMALIZATION[trimmed] ?? trimmed;
}

export function normalizeSecondaryPosition(secondary: string | undefined): string {
  const trimmed = (secondary || "").trim();
  return trimmed === "" || trimmed === "none" || trimmed === "None" || trimmed === "(none)" ? "" : trimmed.toUpperCase();
}

export function normalizePitchName(pitch: string | undefined): string {
  return (pitch || "").trim().toUpperCase();
}

export function extractArsenalPitches(arsenal: Smb4PlayerInput["arsenal"]): string[] {
  if (Array.isArray(arsenal)) {
    return Array.from(new Set(arsenal.map(normalizePitchName).filter((pitch) => SMB4_PITCH_SET.has(pitch)))).sort();
  }

  const text = String(arsenal || "").replaceAll(",", "|");
  return Array.from(new Set(text.split("|").map(normalizePitchName).filter((pitch) => SMB4_PITCH_SET.has(pitch)))).sort();
}

export function isSmb4Pitcher(primaryPosition: string | undefined): boolean {
  return SMB4_PITCHER_POSITIONS.has((primaryPosition || "").trim().toUpperCase());
}

export function baseWeightedHitter(power: number, contact: number, speed: number, fielding: number, arm: number): number {
  return 0.3 * power + 0.3 * contact + 0.2 * speed + 0.1 * fielding + 0.1 * arm;
}

export function baseWeightedPitcher(velocity: number, junk: number, accuracy: number): number {
  return (velocity + junk + accuracy) / 3;
}

export function countTraitPolarity(traits: string[]): {
  positiveTraits: number;
  negativeTraits: number;
  unknownTraits: string[];
} {
  let positiveTraits = 0;
  let negativeTraits = 0;
  const unknownTraits: string[] = [];

  for (const trait of traits) {
    if (POSITIVE_TRAITS.has(trait)) {
      positiveTraits += 1;
    } else if (NEGATIVE_TRAITS.has(trait)) {
      negativeTraits += 1;
    } else {
      unknownTraits.push(trait);
    }
  }

  return { positiveTraits, negativeTraits, unknownTraits };
}

export function secondaryVersatility(secondary: string | undefined): number {
  const normalized = normalizeSecondaryPosition(secondary);
  if (!normalized) return 0;
  return VERSATILITY_MAP[normalized] ?? 1;
}

export function normalizeSmb4Player(input: Smb4PlayerInput): NormalizedSmb4Player {
  const primaryPosition = (input.primaryPosition || input.primary || "").trim().toUpperCase();
  const secondaryPosition = normalizeSecondaryPosition(input.secondaryPosition || input.secondary);
  const traits = [normalizeTrait(input.trait1), normalizeTrait(input.trait2)].filter(Boolean);

  return {
    name: input.name,
    primaryPosition,
    secondaryPosition,
    bats: normalizeHand(input.bats, "R"),
    throws: normalizeHand(input.throws, "R"),
    traits,
    pitches: extractArsenalPitches(input.arsenal),
    power: toNumber(input.power),
    contact: toNumber(input.contact),
    speed: toNumber(input.speed),
    fielding: toNumber(input.fielding),
    arm: toNumber(input.arm),
    velocity: toNumber(input.velocity),
    junk: toNumber(input.junk),
    accuracy: toNumber(input.accuracy),
  };
}

export function scoreWithSmb4Model(model: Smb4LinearModel, featureValues: Record<string, number>): number {
  let score = model.intercept;
  for (const [featureName, coefficient] of Object.entries(model.features)) {
    score += coefficient * (featureValues[featureName] ?? 0);
  }
  return score;
}

function gradeFromThresholds(score: number, thresholds: Smb4GradeThreshold[]): { gradeIndex: number; grade: Smb4Grade } {
  for (let index = 0; index < thresholds.length; index += 1) {
    if (score >= thresholds[index].threshold) {
      const grade = SMB4_FULL_GRADE_SCALE[index];
      return { grade, gradeIndex: SMB4_GRADE_TO_INDEX[grade] };
    }
  }

  const grade = SMB4_FULL_GRADE_SCALE[SMB4_FULL_GRADE_SCALE.length - 1];
  return { grade, gradeIndex: SMB4_GRADE_TO_INDEX[grade] };
}

export function numericScoreToSmb4GradeByCenters(score: number): { gradeIndex: number; grade: Smb4Grade } {
  let bestGrade: Smb4Grade = "F";
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const grade of SMB4_FULL_GRADE_SCALE) {
    const distance = Math.abs(score - SMB4_GRADE_NUMERIC_CENTERS[grade]);
    if (distance < bestDistance) {
      bestGrade = grade;
      bestDistance = distance;
    }
  }

  return {
    grade: bestGrade,
    gradeIndex: SMB4_GRADE_TO_INDEX[bestGrade],
  };
}

export function numericScoreToSmb4Grade(
  score: number,
  options: Smb4ScoreOptions = {},
): { gradeIndex: number; grade: Smb4Grade } {
  return options.gradeMapping === "center"
    ? numericScoreToSmb4GradeByCenters(score)
    : gradeFromThresholds(score, SMB4_CALIBRATED_GRADE_THRESHOLDS);
}

export function buildSmb4ModelPayload(input: Smb4PlayerInput): Smb4ModelPayload {
  const player = normalizeSmb4Player(input);
  const { positiveTraits, negativeTraits, unknownTraits } = countTraitPolarity(player.traits);
  const traitSet = new Set(player.traits);
  const batL = player.bats === "L" ? 1 : 0;
  const batS = player.bats === "S" ? 1 : 0;
  const thrL = player.throws === "L" ? 1 : 0;

  if (isSmb4Pitcher(player.primaryPosition)) {
    const pitchSet = new Set(player.pitches);
    const features: Record<string, number> = {
      velocity: player.velocity,
      junk: player.junk,
      accuracy: player.accuracy,
      power: player.power,
      contact: player.contact,
      speed: player.speed,
      jnk_acc: (player.junk * player.accuracy) / 100,
      arsenal_count: pitchSet.size,
      bat_L: batL,
      bat_S: batS,
      thr_L: thrL,
      pos_count: positiveTraits,
      neg_count: negativeTraits,
      pos_RP: player.primaryPosition === "RP" ? 1 : 0,
      pos_SP: player.primaryPosition === "SP" ? 1 : 0,
      "pos_SP/RP": player.primaryPosition === "SP/RP" ? 1 : 0,
    };

    for (const trait of PITCHER_TRAIT_FLAGS) {
      features[`tr_${trait}`] = traitSet.has(trait) ? 1 : 0;
    }
    for (const pitch of PITCH_FLAGS) {
      features[`pitch_${pitch}`] = pitchSet.has(pitch) ? 1 : 0;
    }

    return {
      playerType: "pitcher",
      player,
      baseWeighted: baseWeightedPitcher(player.velocity, player.junk, player.accuracy),
      positiveTraits,
      negativeTraits,
      unknownTraits,
      features,
      model: PITCHER_MODEL,
    };
  }

  const vers = secondaryVersatility(player.secondaryPosition);
  const features: Record<string, number> = {
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    pow_con: (player.power * player.contact) / 100,
    spd_fld: (player.speed * player.fielding) / 100,
    bat_L: batL,
    bat_S: batS,
    thr_L: thrL,
    vers,
    vers2: vers * vers,
    vers_util: traitSet.has("Utility") ? vers : 0,
    pos_count: positiveTraits,
    neg_count: negativeTraits,
    pos_2B: player.primaryPosition === "2B" ? 1 : 0,
    pos_3B: player.primaryPosition === "3B" ? 1 : 0,
    pos_C: player.primaryPosition === "C" ? 1 : 0,
    pos_CF: player.primaryPosition === "CF" ? 1 : 0,
    pos_LF: player.primaryPosition === "LF" ? 1 : 0,
    pos_RF: player.primaryPosition === "RF" ? 1 : 0,
    pos_SS: player.primaryPosition === "SS" ? 1 : 0,
    sec_1B: player.secondaryPosition === "1B" ? 1 : 0,
    "sec_1B/OF": player.secondaryPosition === "1B/OF" ? 1 : 0,
    sec_2B: player.secondaryPosition === "2B" ? 1 : 0,
    sec_3B: player.secondaryPosition === "3B" ? 1 : 0,
    sec_C: player.secondaryPosition === "C" ? 1 : 0,
    sec_IF: player.secondaryPosition === "IF" ? 1 : 0,
    sec_LF: player.secondaryPosition === "LF" ? 1 : 0,
    sec_OF: player.secondaryPosition === "OF" ? 1 : 0,
    sec_RF: player.secondaryPosition === "RF" ? 1 : 0,
    sec_SS: player.secondaryPosition === "SS" ? 1 : 0,
  };

  for (const trait of HITTER_TRAIT_FLAGS) {
    features[`tr_${trait}`] = traitSet.has(trait) ? 1 : 0;
  }

  return {
    playerType: "hitter",
    player,
    baseWeighted: baseWeightedHitter(player.power, player.contact, player.speed, player.fielding, player.arm),
    positiveTraits,
    negativeTraits,
    unknownTraits,
    features,
    model: HITTER_MODEL,
  };
}

function buildWarnings(payload: Smb4ModelPayload): string[] {
  const warnings: string[] = [];

  if (!payload.player.primaryPosition) {
    warnings.push("Missing primary position; scored as hitter because no pitcher role was detected.");
  }
  if (payload.unknownTraits.length > 0) {
    warnings.push(`Unknown trait(s): ${payload.unknownTraits.join(", ")}`);
  }
  if (payload.playerType === "pitcher" && payload.player.pitches.length === 0) {
    warnings.push("Pitcher has no parsed arsenal; arsenal-count and pitch-type features are zero.");
  }

  return warnings;
}

export function scoreSmb4Player(input: Smb4PlayerInput, options: Smb4ScoreOptions = {}): Smb4GradeResult {
  const payload = buildSmb4ModelPayload(input);
  const numericScore = scoreWithSmb4Model(payload.model, payload.features);
  const mapped = numericScoreToSmb4Grade(numericScore, options);

  return {
    numericScore,
    gradeIndex: mapped.gradeIndex,
    grade: mapped.grade,
    baseWeighted: payload.baseWeighted,
    positiveTraits: payload.positiveTraits,
    negativeTraits: payload.negativeTraits,
    unknownTraits: payload.unknownTraits,
    playerType: payload.playerType,
    warnings: buildWarnings(payload),
  };
}

export function explainSmb4Player(
  input: Smb4PlayerInput,
  topCount = 20,
  options: Smb4ScoreOptions = {},
): Smb4GradeExplanation {
  const payload = buildSmb4ModelPayload(input);
  const result = scoreSmb4Player(input, options);
  const allContributions: Smb4Contribution[] = [];

  for (const [feature, coefficient] of Object.entries(payload.model.features)) {
    const value = payload.features[feature] ?? 0;
    if (Math.abs(value) < 1e-12) continue;
    allContributions.push({
      feature,
      value,
      coefficient,
      contribution: coefficient * value,
    });
  }

  allContributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    ...result,
    intercept: payload.model.intercept,
    topContributions: allContributions.slice(0, topCount),
    allContributions,
  };
}
