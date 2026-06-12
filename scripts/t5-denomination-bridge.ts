import { getAllPlayers, type PlayerData } from '../src/data/playerDatabase.ts';
import { computeIV, type IVPlayerInput } from '../src/engines/ivEngine.ts';
import { readFileSync } from 'node:fs';

/**
 * T5 bridge note:
 * This script intentionally reimplements the legacy salary pipeline instead of
 * importing deprecated salaryCalculator exports. The salaryCalculator import
 * chain pulls browser/Supabase `import.meta.env` dependencies into tsx and
 * crashes outside the app bundle. T5-AUDIT LOW-3 verified equivalence against
 * `git show 165a78a`; the strict-legacy variant produced the identical BRIDGE.
 */

type LegacyPosition =
  | 'C' | 'SS' | 'CF' | '2B' | '3B' | 'RF' | 'LF' | '1B' | 'DH'
  | 'SP' | 'RP' | 'CP' | 'SP/RP' | 'UTIL' | 'BENCH' | 'TWO-WAY';

const LEGACY_POSITION_MULTIPLIERS: Record<LegacyPosition, number> = {
  C: 1.15,
  SS: 1.12,
  CF: 1.08,
  '2B': 1.05,
  '3B': 1.02,
  SP: 1.00,
  CP: 1.00,
  RF: 0.98,
  LF: 0.95,
  '1B': 0.92,
  DH: 0.88,
  RP: 0.85,
  'SP/RP': 0.92,
  UTIL: 1.05,
  BENCH: 0.80,
  'TWO-WAY': 1.00,
};

const ELITE_POSITIVE_TRAITS = new Set(['Clutch', 'Two Way', 'Utility', 'Durable', 'Composed']);
const GOOD_POSITIVE_TRAITS = new Set([
  'Cannon Arm', 'Stealer', 'Magic Hands', 'Dive Wizard', 'K Collector',
  'Rally Stopper', 'RBI Hero', 'Gets Ahead', 'Tough Out', 'First Pitch Slayer', 'Sprinter',
]);
const MINOR_POSITIVE_TRAITS = new Set([
  'Pinch Perfect', 'Base Rounder', 'Stimulated', 'Specialist', 'Reverse Splits',
  'Pick Officer', 'Sign Stealer', 'Mind Gamer', 'Distractor', 'Bad Ball Hitter',
  'Fastball Hitter', 'Off-Speed Hitter', 'Low Pitch', 'High Pitch', 'Inside Pitch',
  'Outside Pitch', 'Metal Head', 'Consistent', 'Rally Starter', 'CON vs LHP',
  'CON vs RHP', 'POW vs LHP', 'POW vs RHP', 'Ace Exterminator', 'Bunter',
  'Big Hack', 'Little Hack', 'Elite 4F', 'Elite 2F', 'Elite CF', 'Elite FK',
  'Elite SL', 'Elite CB', 'Elite CH', 'Elite SB',
]);
const SEVERE_NEGATIVE_TRAITS = new Set(['Choker', 'Meltdown', 'Injury Prone', 'Volatile']);
const MODERATE_NEGATIVE_TRAITS = new Set([
  'Whiffer', 'Butter Fingers', 'Noodle Arm', 'Wild Thrower', 'BB Prone',
  'Wild Thing', 'Falls Behind', 'K Neglecter', 'Slow Poke',
]);
const MINOR_NEGATIVE_TRAITS = new Set([
  'First Pitch Prayer', 'Bad Jumps', 'Easy Jumps', 'Easy Target',
  'Base Jogger', 'Surrounded', 'RBI Zero', 'Crossed Up',
]);

const TRAIT_NAME_FIXES: Record<string, string> = {
  Clitch: 'Clutch',
  'K Neglecter': 'K Neglector',
  'Off-speed Hitter': 'Off-Speed Hitter',
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function weightedBat(player: PlayerData): number {
  const ratings = player.batterRatings ?? { power: 0, contact: 0, speed: 0, fielding: 0, arm: 0 };
  return ratings.power * 0.30 + ratings.contact * 0.30 + ratings.speed * 0.20 + ratings.fielding * 0.10 + ratings.arm * 0.10;
}

function weightedPitch(player: PlayerData): number {
  const ratings = player.pitcherRatings ?? { velocity: 0, junk: 0, accuracy: 0 };
  return (ratings.velocity + ratings.junk + ratings.accuracy) / 3;
}

function ratingsToBaseSalary(weightedRating: number): number {
  return round1(Math.pow(weightedRating / 100, 2.5) * 50);
}

function pitcherBattingBonus(player: PlayerData): number {
  const battingRating = weightedBat(player);
  if (battingRating >= 70) return 1.50;
  if (battingRating >= 55) return 1.25;
  if (battingRating >= 40) return 1.10;
  return 1.0;
}

function isTwoWay(player: PlayerData): boolean {
  return [player.traits.trait1, player.traits.trait2].some((trait) => trait?.startsWith('Two Way'));
}

function normalizeTrait(trait: string | undefined): string | undefined {
  if (!trait) return undefined;
  return TRAIT_NAME_FIXES[trait] ?? trait;
}

function legacyTraitModifier(player: PlayerData): number {
  let modifier = 1.0;
  for (const trait of [normalizeTrait(player.traits.trait1), normalizeTrait(player.traits.trait2)]) {
    if (!trait) continue;
    if (ELITE_POSITIVE_TRAITS.has(trait) || trait.startsWith('Two Way')) modifier *= 1.10;
    else if (GOOD_POSITIVE_TRAITS.has(trait)) modifier *= 1.05;
    else if (MINOR_POSITIVE_TRAITS.has(trait)) modifier *= 1.02;
    else if (SEVERE_NEGATIVE_TRAITS.has(trait)) modifier *= 0.90;
    else if (MODERATE_NEGATIVE_TRAITS.has(trait) || trait === 'K Neglector') modifier *= 0.95;
    else if (MINOR_NEGATIVE_TRAITS.has(trait)) modifier *= 0.98;
  }
  return modifier;
}

function legacyPosition(player: PlayerData): LegacyPosition {
  if (player.isPitcher) return (player.pitcherRole ?? 'SP') as LegacyPosition;
  const pos = player.primaryPosition;
  if (pos === 'IF' || pos === 'OF' || pos === 'IF/OF' || pos === '1B/OF') return 'UTIL';
  return (pos in LEGACY_POSITION_MULTIPLIERS ? pos : 'UTIL') as LegacyPosition;
}

function legacyNeutralSalaryMillions(player: PlayerData): number {
  let base: number;
  if (player.isPitcher && isTwoWay(player) && player.batterRatings && player.pitcherRatings) {
    base = (ratingsToBaseSalary(weightedBat(player)) + ratingsToBaseSalary(weightedPitch(player))) * 1.25;
  } else if (player.isPitcher) {
    base = ratingsToBaseSalary(weightedPitch(player)) * pitcherBattingBonus(player);
  } else {
    base = ratingsToBaseSalary(weightedBat(player));
  }
  const withPosition = base * LEGACY_POSITION_MULTIPLIERS[legacyPosition(player)];
  const withTraits = withPosition * legacyTraitModifier(player);
  return Math.min(50, Math.max(0.5, round1(withTraits)));
}

function toIvInput(player: PlayerData): IVPlayerInput {
  const traits = [player.traits.trait1, player.traits.trait2].filter((trait): trait is string => Boolean(trait));
  return {
    id: player.id,
    name: player.name,
    isPitcher: player.isPitcher,
    bats: player.bats,
    primaryPosition: player.isPitcher ? undefined : player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    pitcherRole: player.isPitcher ? player.pitcherRole : undefined,
    curveBlock: player.isPitcher ? player.pitcherRole : undefined,
    batterRatings: {
      power: player.batterRatings?.power ?? 0,
      contact: player.batterRatings?.contact ?? 0,
      speed: player.batterRatings?.speed ?? 0,
      fielding: player.batterRatings?.fielding ?? 0,
      arm: player.batterRatings?.arm ?? 0,
    },
    pitcherRatings: player.isPitcher ? {
      velocity: player.pitcherRatings?.velocity ?? 0,
      junk: player.pitcherRatings?.junk ?? 0,
      accuracy: player.pitcherRatings?.accuracy ?? 0,
    } : undefined,
    traits,
    arsenal: player.arsenal ?? [],
    armSlot: player.armSlot ?? null,
  };
}

const oracle = JSON.parse(readFileSync('spec-docs/reference/iv_oracle.json', 'utf8')) as {
  players: Array<{ id: string }>;
};
const oracleIds = new Set(oracle.players.map((player) => player.id));
const players = getAllPlayers().filter((player) => oracleIds.has(player.id));
if (players.length !== oracleIds.size) {
  throw new Error(`Expected ${oracleIds.size} oracle stock players, found ${players.length} in playerDatabase`);
}
const oldSalariesDollars = players.map((player) => legacyNeutralSalaryMillions(player) * 1_000_000);
const kblValues = players.map((player) => computeIV(toIvInput(player)).kblIV);
const medianOldDollars = median(oldSalariesDollars);
const medianKblIV = median(kblValues);
const bridge = medianOldDollars / medianKblIV;

function convertMillionConstant(value: number): number {
  return Math.round((value * 1_000_000 / bridge) * 100) / 100;
}

function convertRoiThreshold(value: number): number {
  return Math.round((value * bridge / 10) * 1000) / 1000;
}

const converted = {
  MIN_SALARY: convertMillionConstant(0.5),
  MAX_SALARY: convertMillionConstant(50),
  BASE_DRAFT_ALLOCATION: convertMillionConstant(5),
  STANDINGS_BONUS_PER_POSITION: convertMillionConstant(0.5),
  ROI_THRESHOLDS: {
    ELITE_VALUE: convertRoiThreshold(1.0),
    GREAT_VALUE: convertRoiThreshold(0.5),
    GOOD_VALUE: convertRoiThreshold(0.25),
    FAIR_VALUE: convertRoiThreshold(0.15),
    POOR_VALUE: convertRoiThreshold(0.05),
    BUST: 0,
  },
  salaryTierBands: [40, 30, 20, 10, 5, 2].map(convertMillionConstant),
};

console.log('T5 denomination bridge');
console.log(`stockPlayers=${players.length}`);
console.log(`medianOldSalaryDollars=${medianOldDollars.toFixed(2)}`);
console.log(`medianKblIV=${medianKblIV.toFixed(2)}`);
console.log(`BRIDGE=${bridge.toFixed(6)}`);
console.log(JSON.stringify(converted, null, 2));
