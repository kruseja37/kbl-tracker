import { baseWeightedPitcher, isSmb4Pitcher, type Smb4PlayerInput } from "./smb4GradeEmulator";

export const SMB4_TEAM_PROFILE_CATEGORIES = ["power", "contact", "speed", "rotation", "bullpen"] as const;

export type Smb4TeamProfileCategory = (typeof SMB4_TEAM_PROFILE_CATEGORIES)[number];

export interface Smb4TeamProfileLevels {
  power: number;
  contact: number;
  speed: number;
  rotation: number;
  bullpen: number;
}

export interface Smb4TeamProfileRawScores {
  power: number;
  contact: number;
  speed: number;
  rotation: number;
  bullpen: number;
}

export interface Smb4TeamProfileCounts {
  players: number;
  hitters: number;
  rotation: number;
  bullpen: number;
}

export interface Smb4TeamProfile {
  teamName?: string;
  levels: Smb4TeamProfileLevels;
  rawScores: Smb4TeamProfileRawScores;
  counts: Smb4TeamProfileCounts;
  warnings: string[];
}

export interface Smb4TeamProfileRange {
  min: number;
  max: number;
  average: number;
}

export type Smb4TeamProfileCalibration = Record<Smb4TeamProfileCategory, Smb4TeamProfileRange>;

export interface Smb4TeamProfileDistance {
  levelDistance: number;
  scoreDistance: number;
  totalDistance: number;
  byCategory: Record<Smb4TeamProfileCategory, { levelDelta: number; scoreDelta: number; normalizedScoreDelta: number }>;
}

export const SMB4_STANDARD_TEAM_PROFILE_CALIBRATION: Smb4TeamProfileCalibration = {
  power: { min: 47.15, max: 75.38, average: 60.22 },
  contact: { min: 46.85, max: 75.15, average: 60.91 },
  speed: { min: 47.23, max: 73.23, average: 60.1 },
  rotation: { min: 50.6, max: 69.53, average: 59.25 },
  bullpen: { min: 50.08, max: 73.92, average: 60.34 },
};

export const SMB4_STANDARD_TEAM_PROFILES: Record<string, Smb4TeamProfile> = {
  Beewolves: makeStandardProfile("Beewolves", [2, 3, 4, 4, 0], [54.4, 61.0, 63.9, 63.2, 50.1]),
  Blowfish: makeStandardProfile("Blowfish", [2, 6, 4, 2, 0], [56.6, 73.2, 64.8, 56.5, 51.8], [13, 6, 3]),
  Buzzards: makeStandardProfile("Buzzards", [2, 4, 4, 1, 2], [55.2, 63.7, 65.0, 54.2, 56.4], [13, 6, 3]),
  Crocodons: makeStandardProfile("Crocodons", [1, 4, 2, 6, 1], [51.3, 64.8, 56.1, 69.1, 53.2]),
  Freebooters: makeStandardProfile("Freebooters", [2, 4, 1, 4, 6], [58.4, 66.1, 51.1, 62.3, 73.9]),
  Grapplers: makeStandardProfile("Grapplers", [2, 1, 4, 1, 5], [58.5, 49.2, 64.1, 53.4, 69.0]),
  Heaters: makeStandardProfile("Heaters", [1, 2, 5, 3, 1], [53.6, 56.5, 67.5, 58.8, 53.6]),
  Herbisaurs: makeStandardProfile("Herbisaurs", [1, 2, 5, 4, 0], [51.7, 54.9, 66.8, 64.7, 50.8]),
  "Hot Corners": makeStandardProfile("Hot Corners", [4, 6, 2, 4, 3], [64.6, 72.8, 55.1, 62.0, 63.9]),
  Jacks: makeStandardProfile("Jacks", [3, 6, 0, 0, 4], [63.2, 75.2, 47.2, 50.6, 67.5]),
  Moonstars: makeStandardProfile("Moonstars", [3, 3, 1, 6, 5], [60.1, 60.1, 49.7, 69.5, 70.9], [14, 5, 3]),
  Moose: makeStandardProfile("Moose", [5, 1, 1, 3, 6], [69.3, 52.8, 52.0, 59.5, 72.4], [13, 6, 3]),
  Nemesis: makeStandardProfile("Nemesis", [5, 4, 1, 0, 0], [71.7, 64.2, 49.8, 51.3, 50.4]),
  Overdogs: makeStandardProfile("Overdogs", [3, 2, 6, 2, 2], [62.9, 57.7, 71.5, 56.9, 58.8]),
  Platypi: makeStandardProfile("Platypi", [1, 5, 4, 1, 1], [52.6, 68.5, 63.5, 55.0, 53.8], [13, 6, 3]),
  Sandcats: makeStandardProfile("Sandcats", [0, 2, 6, 0, 5], [47.2, 58.1, 73.2, 51.3, 68.6]),
  Sawteeth: makeStandardProfile("Sawteeth", [3, 3, 3, 2, 4], [61.1, 61.6, 58.2, 57.2, 64.5]),
  Sirloins: makeStandardProfile("Sirloins", [6, 0, 3, 5, 1], [75.4, 46.8, 61.3, 65.5, 53.1]),
  Wideloads: makeStandardProfile("Wideloads", [5, 3, 1, 4, 2], [70.5, 62.1, 53.0, 63.5, 56.6]),
  "Wild Pigs": makeStandardProfile("Wild Pigs", [4, 0, 5, 3, 4], [66.1, 48.8, 68.4, 60.6, 67.4], [13, 6, 3]),
};

function makeStandardProfile(
  teamName: string,
  levels: [number, number, number, number, number],
  rawScores: [number, number, number, number, number],
  counts: [number, number, number] = [13, 5, 4],
): Smb4TeamProfile {
  return {
    teamName,
    levels: {
      power: levels[0],
      contact: levels[1],
      speed: levels[2],
      rotation: levels[3],
      bullpen: levels[4],
    },
    rawScores: {
      power: rawScores[0],
      contact: rawScores[1],
      speed: rawScores[2],
      rotation: rawScores[3],
      bullpen: rawScores[4],
    },
    counts: {
      players: 22,
      hitters: counts[0],
      rotation: counts[1],
      bullpen: counts[2],
    },
    warnings: [],
  };
}

function toNumber(value: number | string | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const fraction = scaled - floor;
  const epsilon = 1e-10;

  if (Math.abs(fraction - 0.5) < epsilon) {
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }

  return Math.round(scaled) / factor;
}

function clampLevel(value: number): number {
  const floor = Math.floor(value);
  const fraction = value - floor;
  const rounded =
    Math.abs(fraction - 0.5) < 1e-10
      ? floor % 2 === 0
        ? floor
        : floor + 1
      : Math.round(value);

  return Math.max(0, Math.min(6, rounded));
}

export function scoreToTeamProfileLevel(
  category: Smb4TeamProfileCategory,
  score: number,
  calibration: Smb4TeamProfileCalibration = SMB4_STANDARD_TEAM_PROFILE_CALIBRATION,
): number {
  const range = calibration[category];
  if (range.max <= range.min) return 0;
  return clampLevel((6 * (score - range.min)) / (range.max - range.min));
}

export function levelToImpliedScore(
  category: Smb4TeamProfileCategory,
  level: number,
  calibration: Smb4TeamProfileCalibration = SMB4_STANDARD_TEAM_PROFILE_CALIBRATION,
): number {
  const range = calibration[category];
  const clamped = Math.max(0, Math.min(6, level));
  return range.min + (clamped / 6) * (range.max - range.min);
}

export function calculateTeamProfile(
  players: Smb4PlayerInput[],
  options: {
    teamName?: string;
    calibration?: Smb4TeamProfileCalibration;
  } = {},
): Smb4TeamProfile {
  const hitters = players.filter((player) => !isSmb4Pitcher(player.primaryPosition || player.primary));
  const rotation = players.filter((player) => {
    const primary = (player.primaryPosition || player.primary || "").trim().toUpperCase();
    return primary === "SP" || primary === "SP/RP";
  });
  const bullpen = players.filter((player) => {
    const primary = (player.primaryPosition || player.primary || "").trim().toUpperCase();
    return primary === "RP" || primary === "CP";
  });

  const exactScores: Smb4TeamProfileRawScores = {
    power: mean(hitters.map((player) => toNumber(player.power))),
    contact: mean(hitters.map((player) => toNumber(player.contact))),
    speed: mean(hitters.map((player) => toNumber(player.speed))),
    rotation: mean(rotation.map((player) => baseWeightedPitcher(toNumber(player.velocity), toNumber(player.junk), toNumber(player.accuracy)))),
    bullpen: mean(bullpen.map((player) => baseWeightedPitcher(toNumber(player.velocity), toNumber(player.junk), toNumber(player.accuracy)))),
  };

  const rawScores: Smb4TeamProfileRawScores = {
    power: roundTo(exactScores.power, 1),
    contact: roundTo(exactScores.contact, 1),
    speed: roundTo(exactScores.speed, 1),
    rotation: roundTo(exactScores.rotation, 1),
    bullpen: roundTo(exactScores.bullpen, 1),
  };

  const calibration = options.calibration ?? SMB4_STANDARD_TEAM_PROFILE_CALIBRATION;
  const levels: Smb4TeamProfileLevels = {
    power: scoreToTeamProfileLevel("power", exactScores.power, calibration),
    contact: scoreToTeamProfileLevel("contact", exactScores.contact, calibration),
    speed: scoreToTeamProfileLevel("speed", exactScores.speed, calibration),
    rotation: scoreToTeamProfileLevel("rotation", exactScores.rotation, calibration),
    bullpen: scoreToTeamProfileLevel("bullpen", exactScores.bullpen, calibration),
  };

  const warnings: string[] = [];
  if (hitters.length === 0) warnings.push("No hitters found; power/contact/speed scores are zero.");
  if (rotation.length === 0) warnings.push("No rotation pitchers found; rotation score is zero.");
  if (bullpen.length === 0) warnings.push("No bullpen pitchers found; bullpen score is zero.");

  return {
    teamName: options.teamName,
    levels,
    rawScores,
    counts: {
      players: players.length,
      hitters: hitters.length,
      rotation: rotation.length,
      bullpen: bullpen.length,
    },
    warnings,
  };
}

export function compareTeamProfiles(
  actual: Smb4TeamProfile,
  target: Smb4TeamProfile,
  calibration: Smb4TeamProfileCalibration = SMB4_STANDARD_TEAM_PROFILE_CALIBRATION,
): Smb4TeamProfileDistance {
  let levelDistance = 0;
  let scoreDistance = 0;
  const byCategory = {} as Smb4TeamProfileDistance["byCategory"];

  for (const category of SMB4_TEAM_PROFILE_CATEGORIES) {
    const levelDelta = actual.levels[category] - target.levels[category];
    const scoreDelta = actual.rawScores[category] - target.rawScores[category];
    const range = calibration[category];
    const normalizedScoreDelta = range.max > range.min ? Math.abs(scoreDelta) / (range.max - range.min) : 0;

    levelDistance += Math.abs(levelDelta);
    scoreDistance += normalizedScoreDelta;
    byCategory[category] = {
      levelDelta,
      scoreDelta,
      normalizedScoreDelta,
    };
  }

  return {
    levelDistance,
    scoreDistance,
    totalDistance: levelDistance + 0.35 * scoreDistance,
    byCategory,
  };
}

export function targetLevelsToTeamProfile(levels: Smb4TeamProfileLevels, teamName?: string): Smb4TeamProfile {
  const rawScores = {} as Smb4TeamProfileRawScores;
  for (const category of SMB4_TEAM_PROFILE_CATEGORIES) {
    rawScores[category] = roundTo(levelToImpliedScore(category, levels[category]), 1);
  }

  return {
    teamName,
    levels,
    rawScores,
    counts: {
      players: 0,
      hitters: 0,
      rotation: 0,
      bullpen: 0,
    },
    warnings: [],
  };
}
