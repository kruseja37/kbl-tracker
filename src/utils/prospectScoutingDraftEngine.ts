import {
  POSITION_STAT_BIAS,
  type Grade,
  type PitcherRatings,
  type PositionPlayerRatings,
} from '../engines/gradeEngine';
import {
  SMB4_CALIBRATED_GRADE_THRESHOLDS,
  scoreSmb4Player,
  type Smb4Grade,
  type Smb4PlayerInput,
} from '../engines/smb4GradeEmulator';
import {
  CHEMISTRY_CODES,
  CHEMISTRY_CODE_TO_WORD,
  CHEMISTRY_TARGET_DISTRIBUTION,
  type ChemistryCode,
} from '../data/chemistryCanonical';
import { FIRST_NAMES as SMB4_FIRST_NAMES, LAST_NAMES as SMB4_LAST_NAMES } from '../data/nameDatabase';
import type { Position } from '../types/game';
import { prospectSalaryForDraftRound } from './prospectSalary';

export { prospectSalaryForDraftRound } from './prospectSalary';

export const PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION =
  'league-builder-startup-prospect-scouting-draft-v1';

export type DraftPosition =
  | 'C'
  | '1B'
  | '2B'
  | 'SS'
  | '3B'
  | 'LF'
  | 'CF'
  | 'RF'
  | 'DH'
  | 'SP'
  | 'SP/RP'
  | 'RP'
  | 'CP';

type PitcherDraftPosition = Extract<DraftPosition, 'SP' | 'SP/RP' | 'RP' | 'CP'>;
type FieldingDraftPosition = Exclude<DraftPosition, 'DH' | PitcherDraftPosition>;

export type ScoutSpecialty =
  | DraftPosition
  | 'P'
  | 'IF'
  | 'OF'
  | 'INF'
  | 'infield'
  | 'outfield'
  | 'pitching'
  | 'catching'
  | 'power'
  | 'contact'
  | 'defense'
  | 'speed';

export interface ProspectDraftTeam {
  teamId: string;
  teamName?: string;
}

export interface ProspectScoutDescriptor {
  scoutId: string;
  scoutName: string;
  specialties?: ScoutSpecialty[];
  weaknesses?: ScoutSpecialty[];
  accuracyModifier?: number;
}

export interface ProspectScoutingDraftInput {
  leagueId: string;
  seasonNumber: number;
  teamDraftOrder: ProspectDraftTeam[];
  rounds: number;
  seed: string;
  scoutsByTeamId?: Record<string, ProspectScoutDescriptor | undefined>;
  existingPlayerIds?: string[];
  existingTeamIds?: string[];
  candidatePoolMultiplier?: number;
}

export interface ProspectPoolInput {
  leagueId: string;
  seasonNumber: number;
  seed: string;
  teamDraftOrder?: ProspectDraftTeam[];
  scoutsByTeamId?: Record<string, ProspectScoutDescriptor | undefined>;
  existingPlayerIds?: string[];
  existingTeamIds?: string[];
}

export interface HiddenPersonalityModifiers {
  loyalty: number;
  ambition: number;
  resilience: number;
  charisma: number;
}

export interface ProspectProfile {
  methodVersion: typeof PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION;
  source: 'league-builder-startup-prospect-draft';
  draftYear: number;
  draftRound: number;
  draftPick: number;
  teamId: string;
  trueGrade: Grade;
  scoutedGrade: Grade;
  potentialGrade: Grade;
  scoutId?: string;
  scoutName?: string;
  scoutAccuracy: number;
  scoutConfidence: 'low' | 'medium' | 'high';
  scoutGradeError: number;
  scoutSpecialtiesVisible: ScoutSpecialty[];
  scoutWeaknessesVisible: ScoutSpecialty[];
  archetypeFamily?: ProspectArchetypeFamily;
}

export interface GeneratedProspectCandidate {
  candidateId: string;
  firstName: string;
  lastName: string;
  position: DraftPosition;
  secondaryPosition?: Position;
  bats?: 'L' | 'R' | 'S';
  throws?: 'L' | 'R';
  trueGrade: Grade;
  potentialGrade: Grade;
  archetypeFamily: ProspectArchetypeFamily;
  ratings: PositionPlayerRatings & PitcherRatings;
  arsenal: string[];
  trait1?: string;
  trait2?: string;
  personality: string;
  chemistry: string;
  hiddenPersonalityModifiers: HiddenPersonalityModifiers;
}

export interface ProspectScoutingReport {
  candidateId: string;
  scoutedGrade: Grade;
  scoutAccuracy: number;
  scoutConfidence: 'low' | 'medium' | 'high';
  gradeError: number;
  scout: {
    scoutId?: string;
    scoutName?: string;
    specialties: ScoutSpecialty[];
    weaknesses: ScoutSpecialty[];
  };
}

export interface VisibleSafeProspectReport {
  candidateId: string;
  playerId?: string;
  playerName: string;
  position: DraftPosition;
  age: number;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  scoutedGrade: Grade;
  potentialGrade: Grade;
  scoutConfidence: 'low' | 'medium' | 'high';
  chemistry: string;
  personality: string;
  trait1?: string;
  trait2?: string;
  salary: number;
}

export interface LeagueBuilderProspectPlayerDto {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  jerseyNumber: number;
  age: number;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  armSlot: null;
  primaryPosition: DraftPosition;
  secondaryPosition?: Position;
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity: number;
  junk: number;
  accuracy: number;
  arsenal: string[];
  overallGrade: Grade;
  trait1?: string;
  trait2?: string;
  personality: string;
  chemistry: string;
  morale: number;
  mojo: 'Normal';
  fame: number;
  salary: number;
  contractYears: number;
  leagueAssignments: Array<{
    leagueId: string;
    teamId: string;
    rosterStatus: 'FARM';
  }>;
  ratingRevealState: 'hidden';
  isCustom: boolean;
  sourceDatabase: 'league-builder-startup-prospect-draft';
  hometown: { city: string; state: string };
  prospectProfile: ProspectProfile;
  hiddenPersonalityModifiers: HiddenPersonalityModifiers;
}

export interface ProspectDraftPick {
  round: number;
  pickNumber: number;
  teamId: string;
  teamName?: string;
  candidateId: string;
  playerId: string;
  playerName: string;
  position: DraftPosition;
  trueGrade: Grade;
  scoutedGrade: Grade;
  potentialGrade: Grade;
  scoutAccuracy: number;
  scoutConfidence: 'low' | 'medium' | 'high';
  salary: number;
  player: LeagueBuilderProspectPlayerDto;
  visibleReport: VisibleSafeProspectReport;
}

export interface ProspectScoutingDraftOutput {
  methodVersion: typeof PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION;
  leagueId: string;
  seasonNumber: number;
  seed: string;
  rounds: number;
  draftClass: GeneratedProspectCandidate[];
  pickOrder: Array<{
    round: number;
    pickNumber: number;
    teamId: string;
    teamName?: string;
  }>;
  selectedPicks: ProspectDraftPick[];
  generatedPlayers: LeagueBuilderProspectPlayerDto[];
  farmAssignments: Array<{
    leagueId: string;
    teamId: string;
    playerId: string;
    rosterStatus: 'FARM';
    ratingRevealState: 'hidden';
  }>;
  visibleReports: VisibleSafeProspectReport[];
  warnings: string[];
  limitations: string[];
}

const GRADES: Grade[] = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
const STANDARD_GRADE_WEIGHTS: Array<[Grade, number]> = [
  ['A', 2],
  ['A-', 5],
  ['B+', 10],
  ['B', 15],
  ['B-', 15],
  ['C+', 15],
  ['C', 18],
  ['C-', 12],
  ['D', 8],
  ['A+', 0],
];
const POSITION_PRIMARY_WEIGHTS: Array<[DraftPosition, number]> = [
  ['SP', 18],
  ['SP/RP', 6],
  ['RP', 13],
  ['CP', 4],
  ['C', 9],
  ['1B', 7],
  ['2B', 8],
  ['SS', 7],
  ['3B', 6],
  ['LF', 8],
  ['CF', 7],
  ['RF', 7],
];
const CHEMISTRY_POOL = ['Competitive', 'Crafty', 'Disciplined', 'Spirited', 'Scholarly'];
export const PERSONALITY_POOL = ['Competitive', 'Relaxed', 'Droopy', 'Jolly', 'Tough', 'Timid', 'Egotistical'];
const PROSPECT_MIN_RATING = 20;
const PROSPECT_MAX_RATING = 99;
const PROSPECT_BASE_RATING_CENTER = 60;
const PROSPECT_TOOL_SIGMA = 7;
const PROSPECT_SOLVE_MIN_SHIFT = -80;
const PROSPECT_SOLVE_MAX_SHIFT = 80;
const PROSPECT_SOLVE_ITERATIONS = 28;
const PROSPECT_CORRECTION_STEP = 0.25;
const PROSPECT_ARCHETYPE_ATTEMPT_SCALES = [1, 0.65, 0.4, 0.2, 0] as const;
export const PROSPECT_HITTER_TRAIT_POOL = [
  'Ace Exterminator',
  'Bad Ball Hitter',
  'Base Rounder',
  'Big Hack',
  'Bunter',
  'Cannon Arm',
  'CON vs LHP',
  'CON vs RHP',
  'Distractor',
  'Dive Wizard',
  'Fastball Hitter',
  'First Pitch Slayer',
  'High Pitch',
  'Inside Pitch',
  'Little Hack',
  'Low Pitch',
  'Magic Hands',
  'Mind Gamer',
  'Off-Speed Hitter',
  'Outside Pitch',
  'Pinch Perfect',
  'POW vs LHP',
  'POW vs RHP',
  'Rally Starter',
  'RBI Hero',
  'Sprinter',
  'Stealer',
  'Tough Out',
  'Utility',
] as const;
export const PROSPECT_PITCHER_TRAIT_POOL = [
  'Composed',
  'Elite 2F',
  'Elite 4F',
  'Elite CB',
  'Elite CF',
  'Elite CH',
  'Elite FK',
  'Elite SB',
  'Elite SL',
  'Gets Ahead',
  'K Collector',
  'Metal Head',
  'Pick Officer',
  'Rally Stopper',
  'Reverse Splits',
  'Specialist',
  'Workhorse',
] as const;
export const PROSPECT_TRAIT_CONFLICT_PAIRS = [
  ['Big Hack', 'Little Hack'],
  ['High Pitch', 'Low Pitch'],
  ['Inside Pitch', 'Outside Pitch'],
  ['Specialist', 'Reverse Splits'],
] as const;
type ProspectBatHand = LeagueBuilderProspectPlayerDto['bats'];
type ProspectThrowHand = LeagueBuilderProspectPlayerDto['throws'];
const PROSPECT_BATS_WEIGHTS: Array<[ProspectBatHand, number]> = [
  ['R', 51.6],
  ['L', 41.4],
  ['S', 7.0],
];
const PROSPECT_THROWS_BY_BATS: Record<ProspectBatHand, Array<[ProspectThrowHand, number]>> = {
  L: [['L', 40], ['R', 60]],
  R: [['L', 10], ['R', 90]],
  S: [['L', 19], ['R', 81]],
};
const FASTBALL_PITCH_TYPES = ['4F', '2F', 'CF'] as const;
const OFFSPEED_PITCH_TYPES = ['SL', 'CB', 'CH', 'FK', 'SB'] as const;
const ALL_PITCH_TYPES = [...FASTBALL_PITCH_TYPES, ...OFFSPEED_PITCH_TYPES] as const;
const FASTBALL_PITCH_SET = new Set<string>(FASTBALL_PITCH_TYPES);
const OFFSPEED_PITCH_SET = new Set<string>(OFFSPEED_PITCH_TYPES);
const ELITE_TRAIT_TO_PITCH: Record<string, string> = {
  'Elite 2F': '2F',
  'Elite 4F': '4F',
  'Elite CB': 'CB',
  'Elite CF': 'CF',
  'Elite CH': 'CH',
  'Elite FK': 'FK',
  'Elite SB': 'SB',
  'Elite SL': 'SL',
};
const SECONDARY_POSITION_WEIGHTS: Record<FieldingDraftPosition, Array<[Position | undefined, number]>> = {
  // PROSPECT_GENERATION_SPEC.md §6 raw counts from the real 440-player pool.
  C: [['1B', 17], ['RF', 4], ['LF', 3], ['3B', 2], ['IF/OF', 1], [undefined, 13]],
  '1B': [['3B', 7], ['C', 5], ['LF', 4], ['RF', 2], ['2B', 1], [undefined, 12]],
  '2B': [['SS', 15], ['3B', 9], ['IF', 4], ['IF/OF', 2], [undefined, 4]],
  '3B': [['SS', 11], ['1B', 8], ['IF', 3], ['2B', 2], [undefined, 4]],
  SS: [['2B', 14], ['3B', 4], ['IF', 4], ['IF/OF', 4], ['OF', 1], [undefined, 3]],
  LF: [['OF', 16], ['RF', 8], ['C', 5], ['1B/OF', 3], ['1B', 2], [undefined, 3]],
  CF: [['OF', 23], ['1B/OF', 6], [undefined, 1]],
  RF: [['OF', 10], ['C', 10], ['LF', 7], ['1B/OF', 2], [undefined, 2]],
};
type RatingTool = keyof PositionPlayerRatings | keyof PitcherRatings;
type ArchetypeBiasVector = Partial<Record<RatingTool, number>>;
type ArchetypeRole = 'hitter' | 'pitcher' | 'both';

interface ArchetypeFamilyDefinition {
  family: string;
  role: ArchetypeRole;
  template: ArchetypeBiasVector;
  positionAffinity: Partial<Record<DraftPosition, number>>;
  baseWeight?: number;
}

const ARCHETYPE_FAMILIES = [
  {
    family: 'Slugger',
    role: 'hitter',
    template: { power: 1, arm: 0.3, contact: -0.35, speed: -0.55, fielding: -0.25 },
    positionAffinity: { '1B': 1.55, LF: 1.35, RF: 1.3, '3B': 1.2, C: 0.9, CF: 0.75, SS: 0.7, '2B': 0.75 },
    baseWeight: 1.1,
  },
  {
    family: 'Pure-Power',
    role: 'hitter',
    template: { power: 1, contact: -0.6, speed: -0.45, fielding: -0.3, arm: 0.2 },
    positionAffinity: { '1B': 1.65, LF: 1.45, RF: 1.35, '3B': 1.25, C: 0.8, CF: 0.65, SS: 0.6, '2B': 0.65 },
  },
  {
    family: 'Power-Speed',
    role: 'hitter',
    template: { power: 0.9, speed: 1, arm: 0.25, contact: -0.25, fielding: -0.2 },
    positionAffinity: { CF: 1.35, LF: 1.25, RF: 1.25, SS: 1.05, '2B': 1.0, '3B': 0.95, '1B': 0.75, C: 0.65 },
  },
  {
    family: 'Five-Tool',
    role: 'hitter',
    template: { power: 0.65, contact: 0.65, speed: 0.65, fielding: 0.55, arm: 0.55 },
    positionAffinity: { CF: 1.35, SS: 1.2, RF: 1.1, '2B': 1.0, '3B': 1.0, LF: 0.95, C: 0.85, '1B': 0.75 },
    baseWeight: 0.9,
  },
  {
    family: 'Speedster',
    role: 'hitter',
    template: { speed: 1, contact: 0.35, fielding: 0.25, power: -0.65, arm: -0.2 },
    positionAffinity: { CF: 1.6, '2B': 1.3, SS: 1.25, LF: 1.15, RF: 1.0, '3B': 0.75, C: 0.65, '1B': 0.55 },
  },
  {
    family: 'Slap-Hitter',
    role: 'hitter',
    template: { contact: 1, speed: 0.55, fielding: 0.2, power: -0.75, arm: -0.25 },
    positionAffinity: { '2B': 1.45, CF: 1.35, SS: 1.25, LF: 1.1, RF: 0.95, C: 0.8, '3B': 0.75, '1B': 0.65 },
  },
  {
    family: 'Contact-Glove',
    role: 'hitter',
    template: { contact: 1, fielding: 0.75, speed: 0.25, power: -0.55, arm: -0.1 },
    positionAffinity: { '2B': 1.45, SS: 1.35, CF: 1.2, C: 1.05, '3B': 0.95, LF: 0.85, RF: 0.85, '1B': 0.75 },
  },
  {
    family: 'Defensive-Wizard',
    role: 'hitter',
    template: { fielding: 1, arm: 0.75, speed: 0.35, power: -0.65, contact: -0.25 },
    positionAffinity: { C: 1.45, SS: 1.45, CF: 1.35, '2B': 1.25, '3B': 1.1, RF: 1.0, LF: 0.75, '1B': 0.65 },
  },
  {
    family: 'Cannon-Corner',
    role: 'hitter',
    template: { arm: 1, power: 0.65, fielding: 0.25, speed: -0.55, contact: -0.25 },
    positionAffinity: { RF: 1.55, '3B': 1.45, C: 1.25, LF: 1.0, '1B': 0.9, SS: 0.85, CF: 0.8, '2B': 0.75 },
  },
  {
    family: 'Project',
    role: 'hitter',
    template: { power: 0.75, speed: 0.6, arm: 0.45, contact: -0.55, fielding: -0.45 },
    positionAffinity: { '1B': 1.15, LF: 1.1, RF: 1.1, CF: 1.0, '3B': 1.0, C: 0.95, SS: 0.95, '2B': 0.95 },
    baseWeight: 0.85,
  },
  {
    family: 'Balanced',
    role: 'both',
    template: {
      power: 0.35,
      contact: 0.35,
      speed: 0.25,
      fielding: 0.25,
      arm: 0.25,
      velocity: 0.35,
      junk: 0.35,
      accuracy: 0.35,
    },
    positionAffinity: {},
    baseWeight: 1.15,
  },
  {
    family: 'Power-Ace',
    role: 'pitcher',
    template: { velocity: 1, junk: 0.55, accuracy: -0.5, power: 0.2, speed: -0.25 },
    positionAffinity: { SP: 1.35, 'SP/RP': 1.25, RP: 1.2, CP: 1.45 },
    baseWeight: 1.1,
  },
  {
    family: 'Power-Reliever',
    role: 'pitcher',
    template: { velocity: 1, junk: 0.75, accuracy: -0.65, fielding: -0.2 },
    positionAffinity: { CP: 1.65, RP: 1.45, 'SP/RP': 1.05, SP: 0.75 },
  },
  {
    family: 'Crafty-Ace',
    role: 'pitcher',
    template: { junk: 1, accuracy: 0.55, velocity: -0.55, fielding: 0.2 },
    positionAffinity: { SP: 1.3, 'SP/RP': 1.25, RP: 1.1, CP: 0.9 },
  },
  {
    family: 'Command-Artist',
    role: 'pitcher',
    template: { accuracy: 1, junk: 0.55, velocity: -0.45, contact: 0.2 },
    positionAffinity: { SP: 1.35, 'SP/RP': 1.25, RP: 1.0, CP: 0.95 },
  },
  {
    family: 'Pitchability',
    role: 'pitcher',
    template: { accuracy: 0.85, junk: 0.85, velocity: -0.35, fielding: 0.25 },
    positionAffinity: { SP: 1.25, 'SP/RP': 1.25, RP: 1.05, CP: 0.9 },
  },
  {
    family: 'Pitching-Project',
    role: 'pitcher',
    template: { velocity: 0.85, junk: 0.65, accuracy: -0.85, fielding: -0.25 },
    positionAffinity: { SP: 1.1, 'SP/RP': 1.25, RP: 1.2, CP: 1.15 },
    baseWeight: 0.85,
  },
] as const satisfies readonly ArchetypeFamilyDefinition[];

export type ProspectArchetypeFamily = typeof ARCHETYPE_FAMILIES[number]['family'];

function calibratedThreshold(higherGrade: Smb4Grade, lowerGrade: Smb4Grade): number {
  const threshold = SMB4_CALIBRATED_GRADE_THRESHOLDS.find((entry) =>
    entry.higherGrade === higherGrade && entry.lowerGrade === lowerGrade,
  );
  if (!threshold) {
    throw new Error(`Missing SMB4 calibrated threshold ${higherGrade}/${lowerGrade}.`);
  }
  return threshold.threshold;
}

const PROSPECT_ANALYZER_TARGET_SCORES: Partial<Record<Grade, number>> = {
  A: (calibratedThreshold('A+', 'A') + calibratedThreshold('A', 'A-')) / 2,
  'A-': (calibratedThreshold('A', 'A-') + calibratedThreshold('A-', 'B+')) / 2,
  'B+': (calibratedThreshold('A-', 'B+') + calibratedThreshold('B+', 'B')) / 2,
  B: (calibratedThreshold('B+', 'B') + calibratedThreshold('B', 'B-')) / 2,
  'B-': (calibratedThreshold('B', 'B-') + calibratedThreshold('B-', 'C+')) / 2,
  'C+': (calibratedThreshold('B-', 'C+') + calibratedThreshold('C+', 'C')) / 2,
  C: (calibratedThreshold('C+', 'C') + calibratedThreshold('C', 'C-')) / 2,
  'C-': (calibratedThreshold('C', 'C-') + calibratedThreshold('C-', 'D+')) / 2,
  D: 46,
};
export const PROSPECT_AGE_BANDS = [
  { min: 18, max: 21, weight: 0.40 },
  { min: 22, max: 24, weight: 0.30 },
  { min: 25, max: 31, weight: 0.18 },
  { min: 32, max: 35, weight: 0.08 },
  { min: 36, max: 42, weight: 0.04 },
] as const;
const CITIES = [
  { city: 'Denver', state: 'CO' },
  { city: 'Portland', state: 'OR' },
  { city: 'Austin', state: 'TX' },
  { city: 'Madison', state: 'WI' },
  { city: 'Raleigh', state: 'NC' },
  { city: 'Tucson', state: 'AZ' },
  { city: 'Tulsa', state: 'OK' },
  { city: 'Boise', state: 'ID' },
];

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function randomUnit(seed: string): number {
  return hashString(seed) / 0xffffffff;
}

export function drawProspectAge(seed: string): number {
  const totalWeight = PROSPECT_AGE_BANDS.reduce((sum, band) => sum + band.weight, 0);
  let roll = randomUnit(`${seed}:age:band`) * totalWeight;
  let selectedBand = PROSPECT_AGE_BANDS[PROSPECT_AGE_BANDS.length - 1];

  for (const band of PROSPECT_AGE_BANDS) {
    roll -= band.weight;
    if (roll <= 0) {
      selectedBand = band;
      break;
    }
  }

  const ageCount = selectedBand.max - selectedBand.min + 1;
  const ageOffset = Math.min(ageCount - 1, Math.floor(randomUnit(`${seed}:age:within`) * ageCount));
  return selectedBand.min + ageOffset;
}

function normal(seed: string): number {
  const u1 = Math.max(randomUnit(`${seed}:u1`), Number.EPSILON);
  const u2 = randomUnit(`${seed}:u2`);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function pick<T>(seed: string, values: readonly T[]): T {
  return values[Math.floor(randomUnit(seed) * values.length)] ?? values[0];
}

export function rebalanceProspectChemistryToTarget(
  prospects: readonly GeneratedProspectCandidate[],
  batchSeed: string,
): GeneratedProspectCandidate[] {
  const batchSize = prospects.length;
  if (batchSize === 0) {
    return [];
  }

  const quotaRows = CHEMISTRY_CODES.map((code, orderIndex) => {
    const exactCount = batchSize * CHEMISTRY_TARGET_DISTRIBUTION[code];
    const floorCount = Math.floor(exactCount);
    return {
      code,
      orderIndex,
      count: floorCount,
      remainder: exactCount - floorCount,
    };
  });

  let assignedCount = quotaRows.reduce((sum, row) => sum + row.count, 0);
  const remainders = [...quotaRows].sort((left, right) => {
    const remainderDiff = right.remainder - left.remainder;
    if (remainderDiff !== 0) return remainderDiff;
    return left.orderIndex - right.orderIndex;
  });

  for (let index = 0; assignedCount < batchSize; index += 1) {
    const row = remainders[index % remainders.length];
    row.count += 1;
    assignedCount += 1;
  }

  const chemistryCodes: ChemistryCode[] = [];
  for (const code of CHEMISTRY_CODES) {
    const count = quotaRows.find((row) => row.code === code)?.count ?? 0;
    for (let index = 0; index < count; index += 1) {
      chemistryCodes.push(code);
    }
  }

  for (let index = chemistryCodes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(
      index,
      Math.floor(randomUnit(`${batchSeed}:shuffle:${index}`) * (index + 1)),
    );
    [chemistryCodes[index], chemistryCodes[swapIndex]] = [chemistryCodes[swapIndex], chemistryCodes[index]];
  }

  return prospects.map((prospect, index) => ({
    ...prospect,
    chemistry: CHEMISTRY_CODE_TO_WORD[chemistryCodes[index] ?? CHEMISTRY_CODES[0]],
  }));
}

export function prospectTraitsConflict(left: string, right: string): boolean {
  return PROSPECT_TRAIT_CONFLICT_PAIRS.some(([first, second]) =>
    (left === first && right === second) || (left === second && right === first),
  );
}

function drawProspectTraitCount(seed: string): 0 | 1 | 2 {
  const traitRoll = randomUnit(`${seed}:trait-count`);
  if (traitRoll < 0.3) return 0;
  if (traitRoll < 0.8) return 1;
  return 2;
}

function pickSecondProspectTrait(
  seed: string,
  traitPool: readonly string[],
  firstTrait: string,
): string | undefined {
  const eligible = traitPool.filter((trait) =>
    trait !== firstTrait && !prospectTraitsConflict(firstTrait, trait),
  );
  return eligible.length > 0 ? pick(`${seed}:trait2`, eligible) : undefined;
}

function pickWeighted<T extends string>(seed: string, weights: Array<[T, number]>): T {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = randomUnit(seed) * total;
  for (const [value, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return weights[weights.length - 1][0];
}

function pickWeightedValue<T>(seed: string, weights: Array<[T, number]>): T {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = randomUnit(seed) * total;
  for (const [value, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return weights[weights.length - 1][0];
}

function drawProspectBats(seed: string): ProspectBatHand {
  return pickWeighted(`${seed}:bats`, PROSPECT_BATS_WEIGHTS);
}

function drawProspectThrows(seed: string, bats: ProspectBatHand): ProspectThrowHand {
  return pickWeighted(`${seed}:throws`, PROSPECT_THROWS_BY_BATS[bats]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function isPitcher(position: DraftPosition): position is PitcherDraftPosition {
  return position === 'SP' || position === 'SP/RP' || position === 'RP' || position === 'CP';
}

function activeArchetypeRole(position: DraftPosition): Exclude<ArchetypeRole, 'both'> {
  return isPitcher(position) ? 'pitcher' : 'hitter';
}

function archetypeWeightsForPosition(
  position: DraftPosition,
): Array<[ArchetypeFamilyDefinition, number]> {
  const role = activeArchetypeRole(position);
  return (ARCHETYPE_FAMILIES as readonly ArchetypeFamilyDefinition[])
    .filter((family) => family.role === 'both' || family.role === role)
    .map((family) => [
      family,
      (family.baseWeight ?? 1) * (family.positionAffinity[position] ?? 1),
    ]);
}

function gradeArchetypeTaper(targetGrade: Grade): number {
  switch (targetGrade) {
    case 'S':
    case 'A+':
      return 0.55;
    case 'A':
    case 'D':
      return 0.68;
    case 'A-':
    case 'D+':
    case 'C-':
      return 0.82;
    case 'B+':
    case 'B':
    case 'B-':
    case 'C+':
      return 1;
    case 'C':
      return 0.92;
    default:
      return 0.85;
  }
}

function addBias(
  bias: ArchetypeBiasVector,
  tool: RatingTool,
  amount: number,
): void {
  bias[tool] = (bias[tool] ?? 0) + amount;
}

function activeTemplateEntries(
  family: ArchetypeFamilyDefinition,
  position: DraftPosition,
): Array<[RatingTool, number]> {
  const ignoredTools = isPitcher(position)
    ? new Set<RatingTool>()
    : new Set<RatingTool>(['velocity', 'junk', 'accuracy']);
  return (Object.entries(family.template) as Array<[RatingTool, number]>)
    .filter(([tool]) => !ignoredTools.has(tool));
}

function drawArchetypeBias(input: {
  seed: string;
  position: DraftPosition;
  targetGrade: Grade;
  attempt: number;
  scale: number;
}): { family: ProspectArchetypeFamily; bias: ArchetypeBiasVector } {
  const seedPrefix = input.attempt === 0
    ? `${input.seed}:archetype`
    : `${input.seed}:archetype:retry:${input.attempt}`;
  const family = pickWeightedValue(`${seedPrefix}:family`, archetypeWeightsForPosition(input.position));
  const entries = activeTemplateEntries(family, input.position);
  const positives = entries.filter(([, value]) => value > 0);
  const negatives = entries.filter(([, value]) => value < 0);
  const strongestPositive = positives.reduce((max, [, value]) => Math.max(max, value), 0);
  const primaryTools = positives.filter(([, value]) => value >= strongestPositive * 0.9);
  const secondaryTools = positives.filter(([, value]) => value < strongestPositive * 0.9);
  const primaryTool = primaryTools.length > 0
    ? pick(`${seedPrefix}:primary`, primaryTools.map(([tool]) => tool))
    : undefined;
  const secondaryToolPool = (secondaryTools.length > 0 ? secondaryTools : positives)
    .map(([tool]) => tool)
    .filter((tool) => tool !== primaryTool);
  const secondaryTool = secondaryToolPool.length > 0
    ? pick(`${seedPrefix}:secondary`, secondaryToolPool)
    : undefined;
  const weaknessTool = negatives.length > 0
    ? pick(`${seedPrefix}:weakness`, negatives.map(([tool]) => tool))
    : undefined;
  const taper = gradeArchetypeTaper(input.targetGrade) * input.scale;
  const primaryMagnitude = (12 + randomUnit(`${seedPrefix}:mag`) * 10) * taper;
  const secondaryMagnitude = (6 + randomUnit(`${seedPrefix}:jitter`) * 6) * taper;
  const weaknessMagnitude = (8 + randomUnit(`${seedPrefix}:weakness-mag`) * 7) * taper;
  const bias: ArchetypeBiasVector = {};

  for (const [tool, value] of entries) {
    const toolJitter = 0.85 + randomUnit(`${seedPrefix}:jitter:${tool}`) * 0.3;
    if (value > 0) {
      const magnitude = tool === primaryTool
        ? primaryMagnitude
        : tool === secondaryTool
          ? secondaryMagnitude
          : secondaryMagnitude * 0.45;
      addBias(bias, tool, value * magnitude * toolJitter);
    } else if (value < 0) {
      const magnitude = tool === weaknessTool ? weaknessMagnitude : weaknessMagnitude * 0.5;
      addBias(bias, tool, value * magnitude * toolJitter);
    }
  }

  return { family: family.family as ProspectArchetypeFamily, bias };
}

function chooseSecondary(primary: DraftPosition, seed: string): Position | undefined {
  if (isPitcher(primary)) return undefined;
  if (primary === 'DH') return undefined;
  return pickWeightedValue(`${seed}:secondary`, SECONDARY_POSITION_WEIGHTS[primary]);
}

function gradeIndex(grade: Grade): number {
  return GRADES.indexOf(grade);
}

export function gradeDistance(left: Grade, right: Grade): number {
  return Math.abs(gradeIndex(left) - gradeIndex(right));
}

function adjustGrade(grade: Grade, stepsTowardBetter: number): Grade {
  const index = gradeIndex(grade);
  if (index < 0) return grade;
  return GRADES[Math.max(0, Math.min(GRADES.length - 1, index - stepsTowardBetter))];
}

function targetAnalyzerScore(grade: Grade): number {
  const target = PROSPECT_ANALYZER_TARGET_SCORES[grade];
  if (target === undefined) {
    throw new Error(`Prospect grade ${grade} is not a §3.2 generation target.`);
  }
  return target;
}

function potentialGrade(seed: string, trueGrade: Grade): Grade {
  const boost = Math.floor(randomUnit(seed) * 3);
  return adjustGrade(trueGrade, boost);
}

function baseRating(seed: string, center = PROSPECT_BASE_RATING_CENTER, bias = 0): number {
  return center + bias + normal(seed) * PROSPECT_TOOL_SIGMA;
}

function clampRating(value: number): number {
  return clamp(value, PROSPECT_MIN_RATING, PROSPECT_MAX_RATING);
}

function buildBaseRatings(
  seed: string,
  position: DraftPosition,
  archetypeBias: ArchetypeBiasVector = {},
): PositionPlayerRatings & PitcherRatings {
  if (isPitcher(position)) {
    const roleBias =
      position === 'SP' || position === 'SP/RP'
        ? { velocity: -2, junk: -2, accuracy: 5 }
        : position === 'CP'
          ? { velocity: 8, junk: 5, accuracy: -8 }
          : { velocity: 3, junk: 2, accuracy: -2 };
    return {
      power: baseRating(`${seed}:power`, 35, archetypeBias.power ?? 0),
      contact: baseRating(`${seed}:contact`, 35, archetypeBias.contact ?? 0),
      speed: baseRating(`${seed}:speed`, 45, archetypeBias.speed ?? 0),
      fielding: baseRating(`${seed}:fielding`, PROSPECT_BASE_RATING_CENTER, -8 + (archetypeBias.fielding ?? 0)),
      arm: baseRating(`${seed}:arm`, PROSPECT_BASE_RATING_CENTER, -5 + (archetypeBias.arm ?? 0)),
      velocity: baseRating(`${seed}:velocity`, PROSPECT_BASE_RATING_CENTER, roleBias.velocity + (archetypeBias.velocity ?? 0)),
      junk: baseRating(`${seed}:junk`, PROSPECT_BASE_RATING_CENTER, roleBias.junk + (archetypeBias.junk ?? 0)),
      accuracy: baseRating(`${seed}:accuracy`, PROSPECT_BASE_RATING_CENTER, roleBias.accuracy + (archetypeBias.accuracy ?? 0)),
    };
  }

  const bias = POSITION_STAT_BIAS[position] ?? {};
  return {
    power: baseRating(`${seed}:power`, PROSPECT_BASE_RATING_CENTER, (bias.power ?? 0) + (archetypeBias.power ?? 0)),
    contact: baseRating(`${seed}:contact`, PROSPECT_BASE_RATING_CENTER, (bias.contact ?? 0) + (archetypeBias.contact ?? 0)),
    speed: baseRating(`${seed}:speed`, PROSPECT_BASE_RATING_CENTER, (bias.speed ?? 0) + (archetypeBias.speed ?? 0)),
    fielding: baseRating(`${seed}:fielding`, PROSPECT_BASE_RATING_CENTER, (bias.fielding ?? 0) + (archetypeBias.fielding ?? 0)),
    arm: baseRating(`${seed}:arm`, PROSPECT_BASE_RATING_CENTER, (bias.arm ?? 0) + (archetypeBias.arm ?? 0)),
    velocity: 0,
    junk: 0,
    accuracy: 0,
  };
}

function applyRatingShift(
  baseRatings: PositionPlayerRatings & PitcherRatings,
  position: DraftPosition,
  shift: number,
): PositionPlayerRatings & PitcherRatings {
  if (isPitcher(position)) {
    return {
      power: clampRating(baseRatings.power + shift),
      contact: clampRating(baseRatings.contact + shift),
      speed: clampRating(baseRatings.speed + shift),
      fielding: clampRating(baseRatings.fielding + shift),
      arm: clampRating(baseRatings.arm + shift),
      velocity: clampRating(baseRatings.velocity + shift),
      junk: clampRating(baseRatings.junk + shift),
      accuracy: clampRating(baseRatings.accuracy + shift),
    };
  }

  return {
    power: clampRating(baseRatings.power + shift),
    contact: clampRating(baseRatings.contact + shift),
    speed: clampRating(baseRatings.speed + shift),
    fielding: clampRating(baseRatings.fielding + shift),
    arm: clampRating(baseRatings.arm + shift),
    velocity: 0,
    junk: 0,
    accuracy: 0,
  };
}

function zeroRatings(): PositionPlayerRatings & PitcherRatings {
  return {
    power: 0,
    contact: 0,
    speed: 0,
    fielding: 0,
    arm: 0,
    velocity: 0,
    junk: 0,
    accuracy: 0,
  };
}

function buildAnalyzerInput(input: {
  position: DraftPosition;
  secondaryPosition?: Position;
  bats: ProspectBatHand;
  throws: ProspectThrowHand;
  ratings: PositionPlayerRatings & PitcherRatings;
  arsenal: readonly string[];
  trait1?: string;
  trait2?: string;
}): Smb4PlayerInput {
  return {
    primaryPosition: input.position,
    secondaryPosition: input.secondaryPosition,
    bats: input.bats,
    throws: input.throws,
    power: input.ratings.power,
    contact: input.ratings.contact,
    speed: input.ratings.speed,
    fielding: input.ratings.fielding,
    arm: input.ratings.arm,
    velocity: input.ratings.velocity,
    junk: input.ratings.junk,
    accuracy: input.ratings.accuracy,
    arsenal: [...input.arsenal],
    trait1: input.trait1,
    trait2: input.trait2,
  };
}

interface AnalyzerRatingSolveInput {
  targetGrade: Grade;
  position: DraftPosition;
  secondaryPosition?: Position;
  bats: ProspectBatHand;
  throws: ProspectThrowHand;
  baseRatings: PositionPlayerRatings & PitcherRatings;
  arsenal: readonly string[];
  trait1?: string;
  trait2?: string;
}

interface AnalyzerRatingSolveCandidate {
  shift: number;
  ratings: PositionPlayerRatings & PitcherRatings;
  result: ReturnType<typeof scoreSmb4Player>;
}

function scoreShiftedRatings(input: AnalyzerRatingSolveInput, shift: number): AnalyzerRatingSolveCandidate {
  const ratings = applyRatingShift(input.baseRatings, input.position, shift);
  const result = scoreSmb4Player(buildAnalyzerInput({
    position: input.position,
    secondaryPosition: input.secondaryPosition,
    bats: input.bats,
    throws: input.throws,
    ratings,
    arsenal: input.arsenal,
    trait1: input.trait1,
    trait2: input.trait2,
  }));
  return { shift, ratings, result };
}

function closerToTarget(
  candidate: AnalyzerRatingSolveCandidate,
  incumbent: AnalyzerRatingSolveCandidate,
  targetScore: number,
  targetGrade: Grade,
): boolean {
  const candidateGradeMatches = candidate.result.grade === targetGrade;
  const incumbentGradeMatches = incumbent.result.grade === targetGrade;
  if (candidateGradeMatches !== incumbentGradeMatches) return candidateGradeMatches;
  const candidateError = Math.abs(candidate.result.numericScore - targetScore);
  const incumbentError = Math.abs(incumbent.result.numericScore - targetScore);
  if (Math.abs(candidateError - incumbentError) > 1e-9) return candidateError < incumbentError;
  return candidate.shift < incumbent.shift;
}

function scanForTargetGrade(
  input: AnalyzerRatingSolveInput,
  targetScore: number,
  startShift: number,
  endShift: number,
): AnalyzerRatingSolveCandidate | undefined {
  const startTick = Math.ceil(startShift / PROSPECT_CORRECTION_STEP);
  const endTick = Math.floor(endShift / PROSPECT_CORRECTION_STEP);
  let best: AnalyzerRatingSolveCandidate | undefined;

  for (let tick = startTick; tick <= endTick; tick += 1) {
    const candidate = scoreShiftedRatings(input, tick * PROSPECT_CORRECTION_STEP);
    if (candidate.result.grade !== input.targetGrade) continue;
    if (!best || closerToTarget(candidate, best, targetScore, input.targetGrade)) {
      best = candidate;
    }
  }

  return best;
}

function buildRatings(input: AnalyzerRatingSolveInput): {
  ratings: PositionPlayerRatings & PitcherRatings;
  realizedGrade: Grade;
  numericScore: number;
  featureOnlyScore: number;
} {
  const targetScore = targetAnalyzerScore(input.targetGrade);
  const featureOnlyScore = scoreSmb4Player(buildAnalyzerInput({
    position: input.position,
    secondaryPosition: input.secondaryPosition,
    bats: input.bats,
    throws: input.throws,
    ratings: zeroRatings(),
    arsenal: input.arsenal,
    trait1: input.trait1,
    trait2: input.trait2,
  })).numericScore;
  const lowScore = scoreShiftedRatings(input, PROSPECT_SOLVE_MIN_SHIFT);
  const highScore = scoreShiftedRatings(input, PROSPECT_SOLVE_MAX_SHIFT);
  let best = closerToTarget(lowScore, highScore, targetScore, input.targetGrade) ? lowScore : highScore;
  let low = PROSPECT_SOLVE_MIN_SHIFT;
  let high = PROSPECT_SOLVE_MAX_SHIFT;

  for (let iteration = 0; iteration < PROSPECT_SOLVE_ITERATIONS; iteration += 1) {
    const mid = (low + high) / 2;
    const candidate = scoreShiftedRatings(input, mid);
    if (closerToTarget(candidate, best, targetScore, input.targetGrade)) {
      best = candidate;
    }
    if (candidate.result.numericScore < targetScore) {
      low = mid;
    } else {
      high = mid;
    }
  }

  if (best.result.grade !== input.targetGrade) {
    const localCorrection = scanForTargetGrade(
      input,
      targetScore,
      Math.max(PROSPECT_SOLVE_MIN_SHIFT, best.shift - 8),
      Math.min(PROSPECT_SOLVE_MAX_SHIFT, best.shift + 8),
    );
    const fullCorrection = localCorrection ?? scanForTargetGrade(
      input,
      targetScore,
      PROSPECT_SOLVE_MIN_SHIFT,
      PROSPECT_SOLVE_MAX_SHIFT,
    );
    if (fullCorrection) {
      best = fullCorrection;
    }
  }

  if (best.result.grade !== input.targetGrade) {
    throw new Error(
      `Unable to solve prospect analyzer grade ${input.targetGrade} within [${PROSPECT_MIN_RATING},${PROSPECT_MAX_RATING}] ratings. ` +
        `featureOnly=${featureOnlyScore.toFixed(3)} low=${lowScore.result.grade}/${lowScore.result.numericScore.toFixed(3)} ` +
        `high=${highScore.result.grade}/${highScore.result.numericScore.toFixed(3)} ` +
        `best=${best.result.grade}/${best.result.numericScore.toFixed(3)}.`,
    );
  }

  return {
    ratings: best.ratings,
    realizedGrade: input.targetGrade,
    numericScore: best.result.numericScore,
    featureOnlyScore,
  };
}

function prospectArsenalRange(position: PitcherDraftPosition): [number, number] {
  if (position === 'SP' || position === 'SP/RP') return [3, 5];
  if (position === 'CP') return [2, 3];
  return [2, 4];
}

function targetArsenalCount(position: PitcherDraftPosition, junk: number): number {
  const [min, max] = prospectArsenalRange(position);
  const junkRatio = (Math.max(20, Math.min(99, junk)) - 20) / 79;
  return clamp(min + junkRatio * (max - min), min, max);
}

function buildArsenal(seed: string, position: DraftPosition, junk: number, traits: readonly string[]): string[] {
  if (!isPitcher(position)) return [];
  const forced = traits
    .map((trait) => ELITE_TRAIT_TO_PITCH[trait])
    .filter((pitch): pitch is string => Boolean(pitch));
  const pitches = Array.from(new Set(forced));
  const pool = junk >= 75
    ? ['CF', 'CB', 'SL', 'CH', 'FK', 'SB', '4F', '2F']
    : junk <= 40
      ? ['4F', '2F', 'CF', 'SL', 'CH', 'CB', 'FK', 'SB']
      : ['4F', 'CF', 'SL', 'CB', 'CH', '2F', 'FK', 'SB'];
  const rankedPool = [...pool].sort((left, right) =>
    randomUnit(`${seed}:pitch:${left}`) - randomUnit(`${seed}:pitch:${right}`),
  );
  const needsFastball = !pitches.some((pitch) => FASTBALL_PITCH_SET.has(pitch));
  const needsOffspeed = !pitches.some((pitch) => OFFSPEED_PITCH_SET.has(pitch));
  const requiredFamilySlots = Number(needsFastball) + Number(needsOffspeed);
  const baseTargetCount = targetArsenalCount(position, junk);
  const targetCount = Math.min(5, Math.max(baseTargetCount, pitches.length + requiredFamilySlots));

  if (needsFastball) {
    pitches.push(pick(`${seed}:fastball`, FASTBALL_PITCH_TYPES));
  }
  if (needsOffspeed) {
    pitches.push(pick(`${seed}:offspeed`, OFFSPEED_PITCH_TYPES));
  }

  for (const pitch of rankedPool) {
    if (pitches.length >= targetCount) break;
    if (!pitches.includes(pitch)) pitches.push(pitch);
  }

  for (const pitch of ALL_PITCH_TYPES) {
    if (pitches.length >= targetCount) break;
    if (!pitches.includes(pitch)) pitches.push(pitch);
  }

  return pitches;
}

function specialtyMatches(position: DraftPosition, specialty: ScoutSpecialty): boolean {
  if (specialty === position) return true;
  if (specialty === 'P' || specialty === 'pitching') return isPitcher(position);
  if (specialty === 'OF' || specialty === 'outfield') return ['LF', 'CF', 'RF'].includes(position);
  if (specialty === 'IF' || specialty === 'INF' || specialty === 'infield') return ['1B', '2B', 'SS', '3B'].includes(position);
  if (specialty === 'catching') return position === 'C';
  if (specialty === 'defense') return ['C', '2B', 'SS', 'CF'].includes(position);
  if (specialty === 'speed') return ['SS', 'CF', 'LF'].includes(position);
  if (specialty === 'power') return ['1B', '3B', 'LF', 'RF', 'CP'].includes(position);
  if (specialty === 'contact') return ['C', '2B', 'SS'].includes(position);
  return false;
}

function baseAccuracy(position: DraftPosition): number {
  const byPosition: Record<DraftPosition, number> = {
    DH: 85,
    '1B': 80,
    SP: 75,
    '3B': 75,
    C: 70,
    '2B': 70,
    LF: 70,
    RF: 70,
    SS: 65,
    CF: 65,
    RP: 65,
    CP: 60,
    'SP/RP': 70,
  };
  return byPosition[position] ?? 70;
}

export function scoutAccuracy(position: DraftPosition, scout?: ProspectScoutDescriptor): number {
  const specialtyBonus = scout?.specialties?.some((specialty) => specialtyMatches(position, specialty)) ? 18 : 0;
  const weaknessPenalty = scout?.weaknesses?.some((weakness) => specialtyMatches(position, weakness)) ? 18 : 0;
  return clamp(baseAccuracy(position) + (scout?.accuracyModifier ?? 0) + specialtyBonus - weaknessPenalty, 45, 92);
}

export function scoutTierForPosition(
  position: DraftPosition,
  scout?: { specialties?: string[]; weaknesses?: string[] },
): 'high' | 'medium' | 'low' {
  if (scout?.specialties?.includes(position)) return 'high';
  if (scout?.weaknesses?.includes(position)) return 'low';
  return 'medium';
}

export const SCOUT_TOOL_BAND_WIDTHS: Record<'high' | 'medium' | 'low', number> = {
  high: 30,
  medium: 50,
  low: 70,
};

export const HITTER_SCOUT_TOOLS = ['power', 'contact', 'speed', 'fielding', 'arm'] as const;
export const PITCHER_SCOUT_TOOLS = [
  'velocity',
  'junk',
  'accuracy',
  'power',
  'contact',
  'speed',
  'fielding',
] as const;

export function scoutToolBand(
  trueValue: number,
  tier: 'high' | 'medium' | 'low',
  seed: string,
): { lower: number; upper: number } {
  const width = SCOUT_TOOL_BAND_WIDTHS[tier];
  const trueClamped = clamp(trueValue, 0, 99);
  const loBound = Math.max(0, trueClamped - width);
  const hiBound = Math.min(trueClamped, 99 - width);
  const span = Math.max(0, hiBound - loBound);
  const lower = Math.round(loBound + randomUnit(seed) * span);
  return { lower, upper: lower + width };
}

export function scoutToolBands(input: {
  ratings: Record<string, number>;
  position: DraftPosition;
  scout?: { specialties?: string[]; weaknesses?: string[] };
  seed: string;
}): Record<string, { lower: number; upper: number }> {
  const tier = scoutTierForPosition(input.position, input.scout);
  const tools = isPitcher(input.position) ? PITCHER_SCOUT_TOOLS : HITTER_SCOUT_TOOLS;
  const bands: Record<string, { lower: number; upper: number }> = {};
  for (const tool of tools) {
    bands[tool] = scoutToolBand(input.ratings[tool] ?? 0, tier, `${input.seed}:${tool}`);
  }
  return bands;
}

function confidenceFromAccuracy(accuracy: number): 'low' | 'medium' | 'high' {
  if (accuracy >= 82) return 'high';
  if (accuracy >= 68) return 'medium';
  return 'low';
}

export function scoutProspect(
  candidate: Pick<GeneratedProspectCandidate, 'candidateId' | 'position' | 'trueGrade'>,
  scout: ProspectScoutDescriptor | undefined,
  seed: string,
): ProspectScoutingReport {
  const accuracy = scoutAccuracy(candidate.position, scout);
  const sigma = (100 - accuracy) / 22;
  const rawDeviation = normal(`${seed}:scout:${candidate.candidateId}:${scout?.scoutId ?? 'default'}`) * sigma;
  const deviation = Math.max(-4, Math.min(4, Math.round(rawDeviation)));
  const scoutedGrade = adjustGrade(candidate.trueGrade, deviation);
  return {
    candidateId: candidate.candidateId,
    scoutedGrade,
    scoutAccuracy: accuracy,
    scoutConfidence: confidenceFromAccuracy(accuracy),
    gradeError: gradeDistance(candidate.trueGrade, scoutedGrade),
    scout: {
      scoutId: scout?.scoutId,
      scoutName: scout?.scoutName,
      specialties: scout?.specialties ?? [],
      weaknesses: scout?.weaknesses ?? [],
    },
  };
}

function buildPickOrder(input: ProspectScoutingDraftInput): ProspectScoutingDraftOutput['pickOrder'] {
  const order: ProspectScoutingDraftOutput['pickOrder'] = [];
  let pickNumber = 0;
  for (let round = 1; round <= input.rounds; round += 1) {
    const roundOrder = round % 2 === 1
      ? input.teamDraftOrder
      : [...input.teamDraftOrder].reverse();
    for (const team of roundOrder) {
      pickNumber += 1;
      order.push({
        round,
        pickNumber,
        teamId: team.teamId,
        teamName: team.teamName,
      });
    }
  }
  return order;
}

export function generateHiddenPersonalityModifiers(seed: string): HiddenPersonalityModifiers {
  return {
    loyalty: clamp(50 + normal(`${seed}:loyalty`) * 20, 0, 100),
    ambition: clamp(50 + normal(`${seed}:ambition`) * 20, 0, 100),
    resilience: clamp(50 + normal(`${seed}:resilience`) * 20, 0, 100),
    charisma: clamp(50 + normal(`${seed}:charisma`) * 20, 0, 100),
  };
}

function buildCandidate(input: ProspectScoutingDraftInput, index: number): GeneratedProspectCandidate {
  const seed = `${input.seed}:candidate:${index}`;
  const position = pickWeightedValue(`${seed}:position`, POSITION_PRIMARY_WEIGHTS);
  const secondaryPosition = chooseSecondary(position, seed);
  const targetGrade = pickWeighted(`${seed}:grade`, STANDARD_GRADE_WEIGHTS);
  const bats = drawProspectBats(seed);
  const throws = drawProspectThrows(seed, bats);
  const traitPool = isPitcher(position) ? PROSPECT_PITCHER_TRAIT_POOL : PROSPECT_HITTER_TRAIT_POOL;
  const traitCount = drawProspectTraitCount(seed);
  const trait1 = traitCount >= 1 ? pick(`${seed}:trait1`, traitPool) : undefined;
  const trait2 = traitCount >= 2 && trait1
    ? pickSecondProspectTrait(seed, traitPool, trait1)
    : undefined;
  const traits = [trait1, trait2].filter((trait): trait is string => Boolean(trait));
  let solved: ReturnType<typeof buildRatings> | undefined;
  let solvedArsenal: string[] = [];
  let archetypeFamily: ProspectArchetypeFamily = 'Balanced';

  for (let attempt = 0; attempt < PROSPECT_ARCHETYPE_ATTEMPT_SCALES.length; attempt += 1) {
    const archetype = drawArchetypeBias({
      seed,
      position,
      targetGrade,
      attempt,
      scale: PROSPECT_ARCHETYPE_ATTEMPT_SCALES[attempt],
    });
    const baseRatings = buildBaseRatings(seed, position, archetype.bias);
    const arsenal = buildArsenal(seed, position, baseRatings.junk, traits);

    try {
      solved = buildRatings({
        targetGrade,
        position,
        secondaryPosition,
        bats,
        throws,
        baseRatings,
        arsenal,
        trait1,
        trait2,
      });
      solvedArsenal = arsenal;
      archetypeFamily = archetype.family;
      break;
    } catch {
      // PROSPECT_GENERATION_SPEC §5.6: extreme archetypes can clamp out;
      // re-draw/scale instead of letting solver non-convergence escape.
    }
  }

  if (!solved) {
    const baseRatings = buildBaseRatings(seed, position);
    const arsenal = buildArsenal(seed, position, baseRatings.junk, traits);
    solved = buildRatings({
      targetGrade,
      position,
      secondaryPosition,
      bats,
      throws,
      baseRatings,
      arsenal,
      trait1,
      trait2,
    });
    solvedArsenal = arsenal;
    archetypeFamily = 'Balanced';
  }

  const trueGrade = solved.realizedGrade;
  return {
    candidateId: `candidate-${input.leagueId}-${input.seasonNumber}-${index + 1}`,
    firstName: pick(`${seed}:first`, SMB4_FIRST_NAMES),
    lastName: pick(`${seed}:last`, SMB4_LAST_NAMES),
    position,
    secondaryPosition,
    bats,
    throws,
    trueGrade,
    potentialGrade: potentialGrade(`${seed}:potential`, trueGrade),
    archetypeFamily,
    ratings: solved.ratings,
    arsenal: solvedArsenal,
    trait1,
    trait2,
    personality: pick(`${seed}:personality`, PERSONALITY_POOL),
    chemistry: pick(`${seed}:chemistry`, CHEMISTRY_POOL),
    hiddenPersonalityModifiers: generateHiddenPersonalityModifiers(seed),
  };
}

function deterministicPlayerId(
  input: ProspectScoutingDraftInput,
  teamId: string,
  round: number,
  pickNumber: number,
  usedIds: Set<string>,
): string {
  const base = `prospect-${input.leagueId}-${input.seasonNumber}-${teamId}-${round}-${pickNumber}`;
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }
  let suffix = 1;
  while (usedIds.has(`${base}-alt-${suffix}`)) {
    suffix += 1;
  }
  const next = `${base}-alt-${suffix}`;
  usedIds.add(next);
  return next;
}

function visibleReportFromPlayer(
  candidate: GeneratedProspectCandidate,
  player: LeagueBuilderProspectPlayerDto,
  report: ProspectScoutingReport,
): VisibleSafeProspectReport {
  return {
    candidateId: candidate.candidateId,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    position: player.primaryPosition,
    age: player.age,
    bats: player.bats,
    throws: player.throws,
    scoutedGrade: report.scoutedGrade,
    potentialGrade: candidate.potentialGrade,
    scoutConfidence: report.scoutConfidence,
    chemistry: player.chemistry,
    personality: player.personality,
    trait1: player.trait1,
    trait2: player.trait2,
    salary: player.salary,
  };
}

function buildPlayerDto(input: {
  engineInput: ProspectScoutingDraftInput;
  candidate: GeneratedProspectCandidate;
  report: ProspectScoutingReport;
  pick: { round: number; pickNumber: number; teamId: string };
  playerId: string;
}): LeagueBuilderProspectPlayerDto {
  const { engineInput, candidate, report, pick: draftPick, playerId } = input;
  const seed = `${engineInput.seed}:player:${playerId}`;
  const hometown = pick(`${seed}:hometown`, CITIES);
  const salary = prospectSalaryForDraftRound(draftPick.round);
  const bats = candidate.bats ?? drawProspectBats(seed);
  const throws = candidate.throws ?? drawProspectThrows(seed, bats);
  return {
    id: playerId,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    gender: randomUnit(`${seed}:gender`) < 0.18 ? 'F' : 'M',
    jerseyNumber: 60 + ((draftPick.pickNumber - 1) % 40),
    age: drawProspectAge(seed),
    bats,
    throws,
    armSlot: null,
    primaryPosition: candidate.position,
    secondaryPosition: candidate.secondaryPosition,
    power: candidate.ratings.power,
    contact: candidate.ratings.contact,
    speed: candidate.ratings.speed,
    fielding: candidate.ratings.fielding,
    arm: candidate.ratings.arm,
    velocity: candidate.ratings.velocity,
    junk: candidate.ratings.junk,
    accuracy: candidate.ratings.accuracy,
    arsenal: candidate.arsenal,
    overallGrade: candidate.trueGrade,
    trait1: candidate.trait1,
    trait2: candidate.trait2,
    personality: candidate.personality,
    chemistry: candidate.chemistry,
    morale: 75,
    mojo: 'Normal',
    fame: 0,
    salary,
    contractYears: 3,
    leagueAssignments: [{
      leagueId: engineInput.leagueId,
      teamId: draftPick.teamId,
      rosterStatus: 'FARM',
    }],
    ratingRevealState: 'hidden',
    isCustom: false,
    sourceDatabase: 'league-builder-startup-prospect-draft',
    hometown,
    prospectProfile: {
      methodVersion: PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION,
      source: 'league-builder-startup-prospect-draft',
      draftYear: engineInput.seasonNumber,
      draftRound: draftPick.round,
      draftPick: draftPick.pickNumber,
      teamId: draftPick.teamId,
      trueGrade: candidate.trueGrade,
      scoutedGrade: report.scoutedGrade,
      potentialGrade: candidate.potentialGrade,
      scoutId: report.scout.scoutId,
      scoutName: report.scout.scoutName,
      scoutAccuracy: report.scoutAccuracy,
      scoutConfidence: report.scoutConfidence,
      scoutGradeError: report.gradeError,
      scoutSpecialtiesVisible: report.scout.specialties,
      scoutWeaknessesVisible: report.scout.weaknesses,
      archetypeFamily: candidate.archetypeFamily,
    },
    hiddenPersonalityModifiers: candidate.hiddenPersonalityModifiers,
  };
}

export function buildProspectPlayerForPick(input: {
  engineInput: ProspectScoutingDraftInput;
  candidate: GeneratedProspectCandidate;
  report: ProspectScoutingReport;
  pick: { round: number; pickNumber: number; teamId: string };
  playerId: string;
}): LeagueBuilderProspectPlayerDto {
  return buildPlayerDto(input);
}

const FARM_AUCTION_POOL_TEAM_ID = '__farm_auction_pool_unassigned__';

export function generateProspectPool(
  input: ProspectPoolInput,
  count: number,
): LeagueBuilderProspectPlayerDto[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Prospect pool count must be a non-negative integer.');
  }

  const teamDraftOrder = input.teamDraftOrder && input.teamDraftOrder.length > 0
    ? [...input.teamDraftOrder]
    : [{ teamId: FARM_AUCTION_POOL_TEAM_ID, teamName: 'Farm Auction Pool' }];
  const engineInput: ProspectScoutingDraftInput = {
    leagueId: input.leagueId,
    seasonNumber: input.seasonNumber,
    seed: input.seed,
    teamDraftOrder,
    rounds: 1,
    scoutsByTeamId: input.scoutsByTeamId,
    existingPlayerIds: input.existingPlayerIds,
    existingTeamIds: input.existingTeamIds,
    candidatePoolMultiplier: 1,
  };
  const usedIds = new Set(input.existingPlayerIds ?? []);

  const candidates = rebalanceProspectChemistryToTarget(
    Array.from({ length: count }, (_, index) => buildCandidate(engineInput, index)),
    `${input.seed}:chemistry-rebalance`,
  );

  return candidates.map((candidate, index) => {
    const report = scoutProspect(candidate, undefined, input.seed);
    const pickNumber = index + 1;
    const playerId = deterministicPlayerId(
      engineInput,
      FARM_AUCTION_POOL_TEAM_ID,
      Math.floor(index / teamDraftOrder.length) + 1,
      pickNumber,
      usedIds,
    );
    const player = buildPlayerDto({
      engineInput,
      candidate,
      report,
      pick: {
        round: Math.floor(index / teamDraftOrder.length) + 1,
        pickNumber,
        teamId: FARM_AUCTION_POOL_TEAM_ID,
      },
      playerId,
    });

    return {
      ...player,
      leagueAssignments: [],
      prospectProfile: {
        ...player.prospectProfile,
        teamId: FARM_AUCTION_POOL_TEAM_ID,
      },
    };
  });
}

export function visibleReportForProspectPlayer(input: {
  candidate: GeneratedProspectCandidate;
  player: LeagueBuilderProspectPlayerDto;
  report: ProspectScoutingReport;
}): VisibleSafeProspectReport {
  return visibleReportFromPlayer(input.candidate, input.player, input.report);
}

export function generateProspectScoutingDraft(
  input: ProspectScoutingDraftInput,
): ProspectScoutingDraftOutput {
  const warnings: string[] = [];
  const limitations = [
    'Pure Slice 2 engine only; no League Builder draft UI or scout persistence is implemented.',
    'Scouting output remains imperfect and true ratings remain hidden until call-up/reveal.',
  ];
  if (input.rounds <= 0) {
    throw new Error('Prospect scouting draft requires at least one round.');
  }
  if (input.teamDraftOrder.length === 0) {
    throw new Error('Prospect scouting draft requires at least one team.');
  }

  const uniqueTeamIds = new Set(input.teamDraftOrder.map((team) => team.teamId));
  if (uniqueTeamIds.size !== input.teamDraftOrder.length) {
    warnings.push('Team draft order contains duplicate team ids.');
  }
  const existingTeamIds = new Set(input.existingTeamIds ?? []);
  if (existingTeamIds.size > 0) {
    for (const team of input.teamDraftOrder) {
      if (!existingTeamIds.has(team.teamId)) {
        warnings.push(`Draft team "${team.teamId}" was not found in existing team ids.`);
      }
    }
  }
  for (const team of input.teamDraftOrder) {
    if (!input.scoutsByTeamId?.[team.teamId]) {
      warnings.push(`Team "${team.teamId}" has no scout descriptor; default imperfect scouting was used.`);
    }
  }

  const pickOrder = buildPickOrder(input);
  const totalPicks = pickOrder.length;
  const poolSize = Math.max(totalPicks, totalPicks * (input.candidatePoolMultiplier ?? 3));
  const draftClass = rebalanceProspectChemistryToTarget(
    Array.from({ length: poolSize }, (_, index) => buildCandidate(input, index)),
    `${input.seed}:chemistry-rebalance`,
  );
  const available = [...draftClass];
  const usedIds = new Set(input.existingPlayerIds ?? []);
  const selectedPicks: ProspectDraftPick[] = [];
  const generatedPlayers: LeagueBuilderProspectPlayerDto[] = [];
  const visibleReports: VisibleSafeProspectReport[] = [];
  const farmAssignments: ProspectScoutingDraftOutput['farmAssignments'] = [];

  for (const pickSlot of pickOrder) {
    const scout = input.scoutsByTeamId?.[pickSlot.teamId];
    const ranked = available
      .map((candidate) => ({
        candidate,
        report: scoutProspect(candidate, scout, input.seed),
      }))
      .sort((a, b) => {
        const gradeDiff = gradeIndex(a.report.scoutedGrade) - gradeIndex(b.report.scoutedGrade);
        if (gradeDiff !== 0) return gradeDiff;
        const potentialDiff = gradeIndex(a.candidate.potentialGrade) - gradeIndex(b.candidate.potentialGrade);
        if (potentialDiff !== 0) return potentialDiff;
        return a.candidate.candidateId.localeCompare(b.candidate.candidateId);
      });
    const selected = ranked[0];
    available.splice(available.indexOf(selected.candidate), 1);

    const playerId = deterministicPlayerId(input, pickSlot.teamId, pickSlot.round, pickSlot.pickNumber, usedIds);
    const player = buildPlayerDto({
      engineInput: input,
      candidate: selected.candidate,
      report: selected.report,
      pick: pickSlot,
      playerId,
    });
    const visibleReport = visibleReportFromPlayer(selected.candidate, player, selected.report);
    generatedPlayers.push(player);
    visibleReports.push(visibleReport);
    farmAssignments.push({
      leagueId: input.leagueId,
      teamId: pickSlot.teamId,
      playerId,
      rosterStatus: 'FARM',
      ratingRevealState: 'hidden',
    });
    selectedPicks.push({
      ...pickSlot,
      candidateId: selected.candidate.candidateId,
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.primaryPosition,
      trueGrade: selected.candidate.trueGrade,
      scoutedGrade: selected.report.scoutedGrade,
      potentialGrade: selected.candidate.potentialGrade,
      scoutAccuracy: selected.report.scoutAccuracy,
      scoutConfidence: selected.report.scoutConfidence,
      salary: player.salary,
      player,
      visibleReport,
    });
  }

  return {
    methodVersion: PROSPECT_SCOUTING_DRAFT_ENGINE_VERSION,
    leagueId: input.leagueId,
    seasonNumber: input.seasonNumber,
    seed: input.seed,
    rounds: input.rounds,
    draftClass,
    pickOrder,
    selectedPicks,
    generatedPlayers,
    farmAssignments,
    visibleReports,
    warnings,
    limitations,
  };
}
