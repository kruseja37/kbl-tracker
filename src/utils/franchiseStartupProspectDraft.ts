import {
  deletePlayer,
  getAllPlayers,
  getLeagueTemplate,
  getTeamRoster,
  savePlayer,
  saveTeamRoster,
  type Chemistry,
  type DepthChart,
  type Grade,
  type Personality,
  type PitchType,
  type Player,
  type Position,
  type TeamRoster,
} from './leagueBuilderStorage';
import { US_CITIES } from '../data/usCities';

export const STARTUP_PROSPECT_DRAFT_VERSION = 'startup-prospect-draft-v1-auto-snake';

const FARM_TARGET_SIZE = 10;

const GRADE_ORDER: Grade[] = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
const DRAFT_GRADES: Grade[] = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
const POSITION_POOL: Position[] = [
  'SP', 'SP', 'SP', 'SP',
  'RP', 'RP',
  'CP',
  'C',
  '1B',
  '2B',
  'SS',
  '3B',
  'LF',
  'CF',
  'CF',
  'RF',
  'IF/OF',
];
const CHEMISTRY_POOL: Chemistry[] = ['Competitive', 'Crafty', 'Disciplined', 'Spirited', 'Scholarly'];
const PERSONALITY_POOL: Personality[] = [
  'Competitive',
  'Spirited',
  'Crafty',
  'Scholarly',
  'Disciplined',
  'Tough',
  'Relaxed',
];
const BATTER_TRAITS = ['Clutch', 'Tough Out', 'Rally Starter', 'Sprinter', 'Magic Hands', 'Utility'];
const PITCHER_TRAITS = ['K Collector', 'Workhorse', 'Elite 4F', 'Elite SL', 'Specialist', 'Rally Stopper'];
const FIRST_NAMES = [
  'Ari',
  'Beck',
  'Cam',
  'Drew',
  'Ellis',
  'Finn',
  'Gray',
  'Harper',
  'Indy',
  'Jules',
  'Kai',
  'Lane',
  'Mika',
  'Nico',
  'Parker',
  'Quinn',
  'Rory',
  'Sage',
  'Tatum',
  'Vale',
];
const LAST_NAMES = [
  'Banks',
  'Cruz',
  'Davenport',
  'Ellington',
  'Fields',
  'Gable',
  'Hayes',
  'Ivers',
  'Jensen',
  'Keller',
  'Lopez',
  'Maddox',
  'Novak',
  'Ortiz',
  'Price',
  'Reed',
  'Santos',
  'Turner',
  'Vaughn',
  'West',
];

export interface StartupProspectDraftOptions {
  rounds?: number;
  seasonNumber?: number;
  seed?: string;
}

export interface StartupProspectDraftPick {
  round: number;
  pickNumber: number;
  teamId: string;
  playerId: string;
  playerName: string;
  position: Position;
  trueGrade: Grade;
  scoutedGrade: Grade;
  potentialGrade: Grade;
  salary: number;
}

export interface StartupProspectDraftReport {
  methodVersion: typeof STARTUP_PROSPECT_DRAFT_VERSION;
  leagueId: string;
  rounds: number;
  totalVacancies: number;
  picks: StartupProspectDraftPick[];
  teamFarmCounts: Record<string, { before: number; after: number; added: number }>;
  valid: boolean;
  issues: string[];
}

interface DraftCandidate {
  poolIndex: number;
  position: Position;
  trueGrade: Grade;
  scoutedGrade: Grade;
  potentialGrade: Grade;
  seed: string;
}

interface DraftTeamState {
  teamId: string;
  existingRoster: TeamRoster | null;
  nextRoster: TeamRoster;
  existingFarmCount: number;
  vacancies: number;
  payroll: number;
  picks: StartupProspectDraftPick[];
}

interface ProspectProfile {
  methodVersion: typeof STARTUP_PROSPECT_DRAFT_VERSION;
  source: 'startup-prospect-draft';
  draftYear: number;
  draftRound: number;
  draftPick: number;
  teamId: string;
  trueGrade: Grade;
  scoutedGrade: Grade;
  potentialGrade: Grade;
}

function createEmptyDepthChart(): DepthChart {
  return {
    C: [],
    '1B': [],
    '2B': [],
    SS: [],
    '3B': [],
    LF: [],
    CF: [],
    RF: [],
    DH: [],
    SP: [],
    RP: [],
    CP: [],
  };
}

function makeEmptyRoster(teamId: string): TeamRoster {
  return {
    teamId,
    mlbRoster: [],
    farmRoster: [],
    lineupWithDH: [],
    lineupWithoutDH: [],
    startingRotation: [],
    longRelievers: [],
    closingPitcher: '',
    setupPitchers: [],
    depthChart: createEmptyDepthChart(),
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
    lastModified: new Date(0).toISOString(),
  };
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomUnit(seed: string): number {
  const hash = hashString(seed);
  return hash / 0xffffffff;
}

function pickWeighted<T extends string>(seed: string, entries: Array<[T, number]>): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = randomUnit(seed) * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

function getRoundGradeWeights(round: number): Array<[Grade, number]> {
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

function adjustGrade(grade: Grade, steps: number): Grade {
  const index = DRAFT_GRADES.indexOf(grade);
  if (index < 0) return grade;
  return DRAFT_GRADES[Math.max(0, Math.min(DRAFT_GRADES.length - 1, index + steps))];
}

function gradeRank(grade: Grade): number {
  const index = GRADE_ORDER.indexOf(grade);
  return index < 0 ? GRADE_ORDER.length : index;
}

function gradeCenter(grade: Grade): number {
  const centers: Record<Grade, number> = {
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
    'D-': 40,
  };
  return centers[grade] ?? 58;
}

function clampRating(value: number): number {
  return Math.max(20, Math.min(99, Math.round(value)));
}

function rating(seed: string, center: number, bias = 0): number {
  const jitter = Math.round((randomUnit(seed) - 0.5) * 18);
  return clampRating(center + bias + jitter);
}

function seededHometown(seed: string): { city: string; state: string } {
  const totalWeight = US_CITIES.reduce((sum, city) => sum + city.weight, 0);
  let roll = randomUnit(seed) * totalWeight;
  for (const city of US_CITIES) {
    roll -= city.weight;
    if (roll <= 0) {
      return { city: city.city, state: city.state };
    }
  }
  const fallback = US_CITIES[US_CITIES.length - 1];
  return { city: fallback.city, state: fallback.state };
}

function isPitcher(position: Position): boolean {
  return ['SP', 'RP', 'CP', 'SP/RP', 'P', 'TWO-WAY'].includes(position);
}

function rookieSalary(round: number): number {
  if (round === 1) return 2.0;
  if (round === 2) return 1.2;
  if (round === 3) return 0.7;
  return 0.5;
}

function makeCandidate(seed: string, poolIndex: number, roundHint: number): DraftCandidate {
  const position = POSITION_POOL[Math.floor(randomUnit(`${seed}:position:${poolIndex}`) * POSITION_POOL.length)] ?? 'C';
  const trueGrade = pickWeighted(`${seed}:grade:${poolIndex}`, getRoundGradeWeights(roundHint));
  const scoutedGrade = adjustGrade(trueGrade, Math.round((randomUnit(`${seed}:scout:${poolIndex}`) - 0.5) * 2));
  const potentialGrade = adjustGrade(trueGrade, -Math.floor(randomUnit(`${seed}:potential:${poolIndex}`) * 3));
  return {
    poolIndex,
    position,
    trueGrade,
    scoutedGrade,
    potentialGrade,
    seed: `${seed}:candidate:${poolIndex}`,
  };
}

function buildDraftPool(seed: string, totalVacancies: number, rounds: number): DraftCandidate[] {
  const poolSize = Math.max(totalVacancies * 3, totalVacancies);
  return Array.from({ length: poolSize }, (_, index) =>
    makeCandidate(seed, index, Math.min(rounds, Math.floor(index / Math.max(1, totalVacancies)) + 1)),
  ).sort((a, b) => {
    const gradeDiff = gradeRank(a.scoutedGrade) - gradeRank(b.scoutedGrade);
    if (gradeDiff !== 0) return gradeDiff;
    return a.poolIndex - b.poolIndex;
  });
}

function selectBestAvailable(pool: DraftCandidate[], teamState: DraftTeamState): DraftCandidate {
  const positionCounts = new Map<Position, number>();
  for (const pick of teamState.picks) {
    positionCounts.set(pick.position, (positionCounts.get(pick.position) ?? 0) + 1);
  }

  const selected = pool.find((candidate) => (positionCounts.get(candidate.position) ?? 0) === 0) ?? pool[0];
  pool.splice(pool.indexOf(selected), 1);
  return selected;
}

function buildPlayer(
  leagueId: string,
  teamId: string,
  candidate: DraftCandidate,
  round: number,
  pickNumber: number,
  seasonNumber: number,
): Omit<Player, 'createdDate' | 'lastModified'> & { prospectProfile: ProspectProfile } {
  const center = gradeCenter(candidate.trueGrade);
  const pitcher = isPitcher(candidate.position);
  const traitSeed = `${candidate.seed}:traits`;
  const traitCountRoll = randomUnit(traitSeed);
  const traitCount = traitCountRoll < 0.3 ? 0 : traitCountRoll < 0.8 ? 1 : 2;
  const traitPool = pitcher ? PITCHER_TRAITS : BATTER_TRAITS;
  const trait1 = traitCount >= 1 ? traitPool[Math.floor(randomUnit(`${traitSeed}:1`) * traitPool.length)] : undefined;
  const trait2 = traitCount >= 2 ? traitPool[Math.floor(randomUnit(`${traitSeed}:2`) * traitPool.length)] : undefined;
  const firstName = FIRST_NAMES[Math.floor(randomUnit(`${candidate.seed}:first`) * FIRST_NAMES.length)] ?? 'Prospect';
  const lastName = LAST_NAMES[Math.floor(randomUnit(`${candidate.seed}:last`) * LAST_NAMES.length)] ?? 'Player';
  const playerId = `startup-prospect-${leagueId}-${teamId}-${round}-${pickNumber}`;
  const batsRoll = randomUnit(`${candidate.seed}:bats`);

  return {
    id: playerId,
    firstName,
    lastName,
    gender: randomUnit(`${candidate.seed}:gender`) < 0.18 ? 'F' : 'M',
    jerseyNumber: 60 + ((pickNumber - 1) % 40),
    age: 18 + Math.floor(randomUnit(`${candidate.seed}:age`) * 6),
    bats: batsRoll < 0.45 ? 'R' : batsRoll < 0.9 ? 'L' : 'S',
    throws: randomUnit(`${candidate.seed}:throws`) < 0.72 ? 'R' : 'L',
    primaryPosition: candidate.position,
    secondaryPosition: pitcher ? 'P' : undefined,
    power: pitcher ? rating(`${candidate.seed}:power`, 35) : rating(`${candidate.seed}:power`, center),
    contact: pitcher ? rating(`${candidate.seed}:contact`, 35) : rating(`${candidate.seed}:contact`, center),
    speed: pitcher ? rating(`${candidate.seed}:speed`, 45) : rating(`${candidate.seed}:speed`, center),
    fielding: rating(`${candidate.seed}:fielding`, center, pitcher ? -8 : 0),
    arm: rating(`${candidate.seed}:arm`, center, pitcher ? -5 : 0),
    velocity: pitcher ? rating(`${candidate.seed}:velocity`, center) : rating(`${candidate.seed}:velocity`, 30),
    junk: pitcher ? rating(`${candidate.seed}:junk`, center) : rating(`${candidate.seed}:junk`, 30),
    accuracy: pitcher ? rating(`${candidate.seed}:accuracy`, center) : rating(`${candidate.seed}:accuracy`, 30),
    arsenal: pitcher ? (['4F', 'SL', 'CH'] as PitchType[]) : [],
    overallGrade: candidate.trueGrade,
    trait1,
    trait2: trait2 === trait1 ? undefined : trait2,
    personality: PERSONALITY_POOL[Math.floor(randomUnit(`${candidate.seed}:personality`) * PERSONALITY_POOL.length)] ?? 'Competitive',
    chemistry: CHEMISTRY_POOL[Math.floor(randomUnit(`${candidate.seed}:chemistry`) * CHEMISTRY_POOL.length)] ?? 'Competitive',
    morale: 75,
    mojo: 'Normal',
    fame: 0,
    salary: rookieSalary(round),
    contractYears: 3,
    leagueAssignments: [{ leagueId, teamId, rosterStatus: 'FARM' }],
    ratingRevealState: 'hidden',
    isCustom: false,
    sourceDatabase: 'startup-prospect-draft',
    hometown: seededHometown(`${candidate.seed}:hometown`),
    prospectProfile: {
      methodVersion: STARTUP_PROSPECT_DRAFT_VERSION,
      source: 'startup-prospect-draft',
      draftYear: seasonNumber,
      draftRound: round,
      draftPick: pickNumber,
      teamId,
      trueGrade: candidate.trueGrade,
      scoutedGrade: candidate.scoutedGrade,
      potentialGrade: candidate.potentialGrade,
    },
  };
}

function getTeamPayroll(teamId: string, leagueId: string, players: Player[]): number {
  return players.reduce((sum, player) => {
    const assignment = player.leagueAssignments?.find((candidate) =>
      candidate.leagueId === leagueId &&
      candidate.teamId === teamId &&
      candidate.rosterStatus === 'MLB',
    );
    return assignment ? sum + (Number(player.salary) || 0) : sum;
  }, 0);
}

function cloneRoster(roster: TeamRoster): TeamRoster {
  const depthChart: DepthChart = {
    C: [...roster.depthChart.C],
    '1B': [...roster.depthChart['1B']],
    '2B': [...roster.depthChart['2B']],
    SS: [...roster.depthChart.SS],
    '3B': [...roster.depthChart['3B']],
    LF: [...roster.depthChart.LF],
    CF: [...roster.depthChart.CF],
    RF: [...roster.depthChart.RF],
    DH: [...roster.depthChart.DH],
    SP: [...roster.depthChart.SP],
    RP: [...roster.depthChart.RP],
    CP: [...roster.depthChart.CP],
  };

  return {
    ...roster,
    mlbRoster: [...roster.mlbRoster],
    farmRoster: [...roster.farmRoster],
    lineupWithDH: [...roster.lineupWithDH],
    lineupWithoutDH: [...roster.lineupWithoutDH],
    startingRotation: [...roster.startingRotation],
    longRelievers: [...roster.longRelievers],
    setupPitchers: [...roster.setupPitchers],
    depthChart,
    pinchHitOrder: [...roster.pinchHitOrder],
    pinchRunOrder: [...roster.pinchRunOrder],
    defensiveSubOrder: [...roster.defensiveSubOrder],
  };
}

export async function runStartupProspectDraftForLeague(
  leagueId: string,
  options: StartupProspectDraftOptions = {},
): Promise<StartupProspectDraftReport> {
  const league = await getLeagueTemplate(leagueId);
  if (!league) {
    throw new Error(`League template "${leagueId}" not found`);
  }

  const rounds = options.rounds ?? FARM_TARGET_SIZE;
  const seasonNumber = options.seasonNumber ?? 1;
  const allPlayers = await getAllPlayers();
  const teamStates: DraftTeamState[] = [];
  const teamFarmCounts: StartupProspectDraftReport['teamFarmCounts'] = {};

  for (const teamId of league.teamIds) {
    const existingRoster = await getTeamRoster(teamId);
    const nextRoster = cloneRoster(existingRoster ?? makeEmptyRoster(teamId));
    const existingFarmCount = nextRoster.farmRoster.length;
    const vacancies = Math.max(0, FARM_TARGET_SIZE - existingFarmCount);
    teamFarmCounts[teamId] = {
      before: existingFarmCount,
      after: existingFarmCount,
      added: 0,
    };
    teamStates.push({
      teamId,
      existingRoster,
      nextRoster,
      existingFarmCount,
      vacancies,
      payroll: getTeamPayroll(teamId, leagueId, allPlayers),
      picks: [],
    });
  }

  const totalVacancies = teamStates.reduce((sum, team) => sum + team.vacancies, 0);
  if (totalVacancies === 0) {
    return {
      methodVersion: STARTUP_PROSPECT_DRAFT_VERSION,
      leagueId,
      rounds,
      totalVacancies,
      picks: [],
      teamFarmCounts,
      valid: true,
      issues: [],
    };
  }

  const baseOrder = [...teamStates].sort((a, b) => {
    const payrollDiff = a.payroll - b.payroll;
    if (payrollDiff !== 0) return payrollDiff;
    return a.teamId.localeCompare(b.teamId);
  });
  const seed = options.seed ?? `${STARTUP_PROSPECT_DRAFT_VERSION}:${leagueId}:${seasonNumber}:${totalVacancies}`;
  const pool = buildDraftPool(seed, totalVacancies, rounds);
  const createdPlayerIds: string[] = [];
  const touchedTeams = new Set<string>();
  const picks: StartupProspectDraftPick[] = [];
  let pickNumber = 0;

  try {
    for (let round = 1; round <= rounds; round += 1) {
      const roundOrder = round % 2 === 1 ? baseOrder : [...baseOrder].reverse();
      for (const teamState of roundOrder) {
        if (teamState.picks.length >= teamState.vacancies) continue;
        pickNumber += 1;
        const candidate = selectBestAvailable(pool, teamState);
        const player = buildPlayer(leagueId, teamState.teamId, candidate, round, pickNumber, seasonNumber);
        const savedPlayer = await savePlayer(player);
        createdPlayerIds.push(savedPlayer.id);
        teamState.nextRoster.farmRoster.push(savedPlayer.id);
        touchedTeams.add(teamState.teamId);
        const pick: StartupProspectDraftPick = {
          round,
          pickNumber,
          teamId: teamState.teamId,
          playerId: savedPlayer.id,
          playerName: `${savedPlayer.firstName} ${savedPlayer.lastName}`,
          position: savedPlayer.primaryPosition,
          trueGrade: candidate.trueGrade,
          scoutedGrade: candidate.scoutedGrade,
          potentialGrade: candidate.potentialGrade,
          salary: savedPlayer.salary,
        };
        teamState.picks.push(pick);
        picks.push(pick);
      }
    }

    for (const teamState of teamStates) {
      if (!touchedTeams.has(teamState.teamId)) continue;
      await saveTeamRoster(teamState.nextRoster);
      teamFarmCounts[teamState.teamId] = {
        before: teamState.existingFarmCount,
        after: teamState.nextRoster.farmRoster.length,
        added: teamState.nextRoster.farmRoster.length - teamState.existingFarmCount,
      };
    }
  } catch (error) {
    for (const teamState of teamStates) {
      if (!touchedTeams.has(teamState.teamId)) continue;
      if (teamState.existingRoster) {
        await saveTeamRoster(teamState.existingRoster);
      } else {
        await saveTeamRoster(makeEmptyRoster(teamState.teamId));
      }
    }
    for (const playerId of createdPlayerIds) {
      await deletePlayer(playerId).catch(() => undefined);
    }
    throw error;
  }

  const issues = picks.length !== totalVacancies
    ? [`Startup prospect draft filled ${picks.length} of ${totalVacancies} farm vacancies.`]
    : [];

  return {
    methodVersion: STARTUP_PROSPECT_DRAFT_VERSION,
    leagueId,
    rounds,
    totalVacancies,
    picks,
    teamFarmCounts,
    valid: issues.length === 0,
    issues,
  };
}
