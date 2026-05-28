import {
  POSITION_STAT_BIAS,
  type Grade,
  type PitcherRatings,
  type PositionPlayerRatings,
} from '../engines/gradeEngine';

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
  | 'RP'
  | 'CP';

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

export interface HiddenPersonalityModifiers {
  leadership: number;
  volatility: number;
  adaptability: number;
  pressure: number;
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
}

export interface GeneratedProspectCandidate {
  candidateId: string;
  firstName: string;
  lastName: string;
  position: DraftPosition;
  trueGrade: Grade;
  potentialGrade: Grade;
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
  primaryPosition: DraftPosition;
  secondaryPosition?: DraftPosition | 'P';
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
const POSITION_POOL: DraftPosition[] = [
  'SP', 'SP', 'SP', 'SP',
  'RP', 'RP', 'CP',
  'C',
  '1B',
  '2B',
  'SS',
  '3B',
  'LF',
  'CF', 'CF',
  'RF',
];
const CHEMISTRY_POOL = ['Competitive', 'Crafty', 'Disciplined', 'Spirited', 'Scholarly'];
const PERSONALITY_POOL = ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined', 'Tough', 'Relaxed'];
const BATTER_TRAITS = ['Clutch', 'Tough Out', 'Rally Starter', 'Sprinter', 'Magic Hands', 'Utility'];
const PITCHER_TRAITS = ['K Collector', 'Workhorse', 'Elite 4F', 'Elite SL', 'Specialist', 'Rally Stopper'];
const FIRST_NAMES = ['Ari', 'Beck', 'Cam', 'Drew', 'Ellis', 'Finn', 'Gray', 'Harper', 'Indy', 'Jules', 'Kai', 'Lane', 'Mika', 'Nico', 'Parker', 'Quinn', 'Rory', 'Sage', 'Tatum', 'Vale'];
const LAST_NAMES = ['Banks', 'Cruz', 'Davenport', 'Ellington', 'Fields', 'Gable', 'Hayes', 'Ivers', 'Jensen', 'Keller', 'Lopez', 'Maddox', 'Novak', 'Ortiz', 'Price', 'Reed', 'Santos', 'Turner', 'Vaughn', 'West'];
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

function randomUnit(seed: string): number {
  return hashString(seed) / 0xffffffff;
}

function normal(seed: string): number {
  const u1 = Math.max(randomUnit(`${seed}:u1`), Number.EPSILON);
  const u2 = randomUnit(`${seed}:u2`);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function pick<T>(seed: string, values: readonly T[]): T {
  return values[Math.floor(randomUnit(seed) * values.length)] ?? values[0];
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function isPitcher(position: DraftPosition): boolean {
  return position === 'SP' || position === 'RP' || position === 'CP';
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

function roundGradeWeights(round: number): Array<[Grade, number]> {
  if (round === 1) {
    return [
      ['A', 4],
      ['A-', 8],
      ['B+', 15],
      ['B', 20],
      ['B-', 22],
      ['C+', 18],
      ['C', 8],
      ['C-', 3],
      ['D+', 1],
      ['D', 1],
    ];
  }
  if (round <= 3) {
    return [
      ['A', 2],
      ['A-', 5],
      ['B+', 10],
      ['B', 15],
      ['B-', 20],
      ['C+', 25],
      ['C', 15],
      ['C-', 5],
      ['D+', 2],
      ['D', 1],
    ];
  }
  return [
    ['A', 1],
    ['A-', 2],
    ['B+', 5],
    ['B', 10],
    ['B-', 15],
    ['C+', 25],
    ['C', 25],
    ['C-', 12],
    ['D+', 4],
    ['D', 1],
  ];
}

function gradeCenter(grade: Grade): number {
  const centers: Partial<Record<Grade, number>> = {
    S: 95,
    'A+': 92,
    A: 87,
    'A-': 83,
    'B+': 78,
    B: 73,
    'B-': 68,
    'C+': 63,
    C: 58,
    'C-': 53,
    'D+': 49,
    D: 45,
  };
  return centers[grade] ?? 58;
}

function potentialGrade(seed: string, trueGrade: Grade): Grade {
  const boost = Math.floor(randomUnit(seed) * 3);
  return adjustGrade(trueGrade, boost);
}

function rating(seed: string, center: number, bias = 0): number {
  return clamp(center + bias + normal(seed) * 7, 20, 99);
}

function buildRatings(seed: string, grade: Grade, position: DraftPosition): PositionPlayerRatings & PitcherRatings {
  const center = gradeCenter(grade);
  if (isPitcher(position)) {
    const roleBias =
      position === 'SP'
        ? { velocity: -2, junk: -2, accuracy: 5 }
        : position === 'CP'
          ? { velocity: 8, junk: 5, accuracy: -8 }
          : { velocity: 3, junk: 2, accuracy: -2 };
    return {
      power: rating(`${seed}:power`, 35),
      contact: rating(`${seed}:contact`, 35),
      speed: rating(`${seed}:speed`, 45),
      fielding: rating(`${seed}:fielding`, center, -8),
      arm: rating(`${seed}:arm`, center, -5),
      velocity: rating(`${seed}:velocity`, center, roleBias.velocity),
      junk: rating(`${seed}:junk`, center, roleBias.junk),
      accuracy: rating(`${seed}:accuracy`, center, roleBias.accuracy),
    };
  }

  const bias = POSITION_STAT_BIAS[position] ?? {};
  return {
    power: rating(`${seed}:power`, center, bias.power ?? 0),
    contact: rating(`${seed}:contact`, center, bias.contact ?? 0),
    speed: rating(`${seed}:speed`, center, bias.speed ?? 0),
    fielding: rating(`${seed}:fielding`, center, bias.fielding ?? 0),
    arm: rating(`${seed}:arm`, center, bias.arm ?? 0),
    velocity: rating(`${seed}:velocity`, 30),
    junk: rating(`${seed}:junk`, 30),
    accuracy: rating(`${seed}:accuracy`, 30),
  };
}

function buildArsenal(seed: string, position: DraftPosition, junk: number): string[] {
  if (!isPitcher(position)) return [];
  const offspeed = ['CB', 'SL', 'CH', 'FK', 'CF', 'SB'];
  const shuffled = [...offspeed].sort((a, b) =>
    randomUnit(`${seed}:pitch:${a}`) - randomUnit(`${seed}:pitch:${b}`),
  );
  const count = junk >= 70 ? 4 : junk >= 55 ? 3 : junk >= 40 ? 2 : 1;
  return ['4F', ...shuffled.slice(0, count)];
}

function prospectSalary(round: number): number {
  if (round === 1) return 2.0;
  if (round === 2) return 1.2;
  if (round === 3) return 0.7;
  return 0.5;
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
  if (specialty === 'contact') return ['C', '2B', 'SS', 'DH'].includes(position);
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
  };
  return byPosition[position] ?? 70;
}

function scoutAccuracy(position: DraftPosition, scout?: ProspectScoutDescriptor): number {
  const specialtyBonus = scout?.specialties?.some((specialty) => specialtyMatches(position, specialty)) ? 18 : 0;
  const weaknessPenalty = scout?.weaknesses?.some((weakness) => specialtyMatches(position, weakness)) ? 18 : 0;
  return clamp(baseAccuracy(position) + (scout?.accuracyModifier ?? 0) + specialtyBonus - weaknessPenalty, 45, 92);
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

function buildCandidate(input: ProspectScoutingDraftInput, index: number, totalPicks: number): GeneratedProspectCandidate {
  const seed = `${input.seed}:candidate:${index}`;
  const position = pick(`${seed}:position`, POSITION_POOL);
  const roundHint = Math.min(input.rounds, Math.floor(index / Math.max(1, totalPicks)) + 1);
  const trueGrade = pickWeighted(`${seed}:grade`, roundGradeWeights(roundHint));
  const ratings = buildRatings(seed, trueGrade, position);
  const traitPool = isPitcher(position) ? PITCHER_TRAITS : BATTER_TRAITS;
  const traitRoll = randomUnit(`${seed}:trait-count`);
  const traitCount = traitRoll < 0.3 ? 0 : traitRoll < 0.8 ? 1 : 2;
  const trait1 = traitCount >= 1 ? pick(`${seed}:trait1`, traitPool) : undefined;
  const trait2Raw = traitCount >= 2 ? pick(`${seed}:trait2`, traitPool) : undefined;
  return {
    candidateId: `candidate-${input.leagueId}-${input.seasonNumber}-${index + 1}`,
    firstName: pick(`${seed}:first`, FIRST_NAMES),
    lastName: pick(`${seed}:last`, LAST_NAMES),
    position,
    trueGrade,
    potentialGrade: potentialGrade(`${seed}:potential`, trueGrade),
    ratings,
    arsenal: buildArsenal(seed, position, ratings.junk),
    trait1,
    trait2: trait2Raw === trait1 ? undefined : trait2Raw,
    personality: pick(`${seed}:personality`, PERSONALITY_POOL),
    chemistry: pick(`${seed}:chemistry`, CHEMISTRY_POOL),
    hiddenPersonalityModifiers: {
      leadership: clamp(50 + normal(`${seed}:leadership`) * 20, 0, 100),
      volatility: clamp(50 + normal(`${seed}:volatility`) * 20, 0, 100),
      adaptability: clamp(50 + normal(`${seed}:adaptability`) * 20, 0, 100),
      pressure: clamp(50 + normal(`${seed}:pressure`) * 20, 0, 100),
    },
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
  const salary = prospectSalary(draftPick.round);
  return {
    id: playerId,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    gender: randomUnit(`${seed}:gender`) < 0.18 ? 'F' : 'M',
    jerseyNumber: 60 + ((draftPick.pickNumber - 1) % 40),
    age: 18 + Math.floor(randomUnit(`${seed}:age`) * 6),
    bats: pick(`${seed}:bats`, ['L', 'R', 'S'] as const),
    throws: pick(`${seed}:throws`, ['L', 'R'] as const),
    primaryPosition: candidate.position,
    secondaryPosition: isPitcher(candidate.position) ? 'P' : undefined,
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
    },
    hiddenPersonalityModifiers: candidate.hiddenPersonalityModifiers,
  };
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
  const draftClass = Array.from({ length: poolSize }, (_, index) => buildCandidate(input, index, totalPicks));
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
