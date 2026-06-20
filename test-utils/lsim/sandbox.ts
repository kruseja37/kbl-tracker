import { getStableParkId } from '../../src/data/parkLookup';
import { getDerivedParkFactorsIfAvailable } from '../../src/engines/parkFactorDeriver';
import { FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION } from '../../src/utils/franchiseSalary';
import {
  __resetLeagueBuilderDatabaseForTests,
  saveLeagueTemplate,
  savePlayer,
  saveTeam,
  saveTeamRoster,
  type Chemistry,
  type Player,
  type Position,
  type Team,
  type TeamRoster,
} from '../../src/utils/leagueBuilderStorage';
import {
  deleteFranchiseDatabase,
  saveFranchisePlayer,
  saveFranchiseTeam,
} from '../../src/utils/franchisePlayerStorage';
import { saveFranchiseConfig } from '../../src/utils/franchiseManager';
import { applyFranchiseMoraleEffect } from '../../src/utils/franchiseMoraleState';
import {
  ensureDefaultManagerProfiles,
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  saveManagerAssignment,
} from '../../src/utils/managerIdentityStorage';
import {
  getOrCreateBattingStats,
  getOrCreateFieldingStats,
  getOrCreatePitchingStats,
  saveSeasonMetadata,
  updateBattingStats,
  updateFieldingStats,
  updatePitchingStats,
} from '../../src/utils/seasonStorage';
import {
  importFranchiseScheduleRows,
  initScheduleDatabase,
  type ScheduledGame,
} from '../../src/utils/scheduleStorage';
import { resetFranchiseMoraleDatabaseForTests } from '../../src/utils/franchiseMoraleState';
import { resetManagerIdentityDatabaseForTests } from '../../src/utils/managerIdentityStorage';
import { resetTrackerDbForTests } from '../../src/utils/trackerDb';
import { syncEngine } from '../../src/utils/syncEngine';
import type { StoredFranchiseConfig } from '../../src/types/franchise';
import type { processCompletedGame } from '../../src/utils/processCompletedGame';

export const L_SIM_IDS = {
  franchiseId: 'lsim-franchise-h1',
  leagueId: 'lsim-league-h1',
  seasonId: 'lsim-franchise-h1-season-step3-3',
  statsScopeId: 'lsim-franchise-h1-season-step3-3',
  seasonNumber: 1,
  gamesPerTeam: 20,
  inningsPerGame: 9,
  checkpointGameNumber: 4,
} as const;

export type LsimProcessOptions = Parameters<typeof processCompletedGame>[1];
export type LsimArchiveOptions = Parameters<typeof processCompletedGame>[3];

export interface LsimTeamSeed {
  team: Team;
  mlbPlayers: Player[];
  farmPlayers: Player[];
  positionPlayers: Player[];
  pitchers: Player[];
}

export interface LsimSandboxContext {
  ids: typeof L_SIM_IDS;
  teams: Team[];
  teamSeeds: LsimTeamSeed[];
  scheduleByGameNumber: Map<number, ScheduledGame>;
  totalScheduledGames: number;
  processOptions: LsimProcessOptions;
  scope: {
    franchiseId: string;
    seasonId: string;
    statsScopeId: string;
  };
  setupPath: 'direct';
  salaryBaseline: StoredFranchiseConfig['salaryBaseline'];
  trueValueCandidatePlayerId: string;
}

export interface LsimSandboxSetupOptions {
  totalScheduledGames?: number;
  initialGamesPlayed?: number;
  preseedPriorStats?: boolean;
  deterministicScheduleIds?: boolean;
}

const FIXED_ISO = '2026-06-19T12:00:00.000Z';
const FIXED_PLUS_ONE_MINUTE_ISO = '2026-06-19T12:01:00.000Z';
const FIXED_START = Date.UTC(2026, 5, 19, 12, 0, 0);
const MLB_POSITIONS: Position[] = [
  'C',
  '1B',
  '2B',
  'SS',
  '3B',
  'LF',
  'CF',
  'RF',
  'DH',
  'C',
  '1B',
  '2B',
  'SS',
  'SP',
  'SP',
  'SP/RP',
  'RP',
  'RP',
  'RP',
  'CP',
  'LF',
  'CF',
];
const FARM_POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'SP', 'RP'];
const CHEMISTRIES: Chemistry[] = ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined'];
const STADIUMS = ['Swagger Center', 'Bingata Bowl', 'Tiger Den', 'Sakura Hills', 'Motor Yard', 'Apple Field'];
const STRUGGLING_TEAM_INDEXES = new Set([1, 4]);
const STRUGGLING_TEAM_MORALE_TARGETS: Record<string, number> = {
  'lsim-team-02': 21,
  'lsim-team-05': 22,
};
const DB_NAMES_TO_DELETE = [
  'kbl-tracker',
  'kbl-franchise-morale',
  'kbl-league-builder',
];

function isPitcherPosition(position: Position): boolean {
  return position === 'SP' || position === 'SP/RP' || position === 'RP' || position === 'CP' || position === 'P';
}

function playerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`;
}

function heldTraitsFor(
  teamIndex: number,
  rosterIndex: number,
  position: Position,
  rosterStatus: 'MLB' | 'FARM',
): Pick<Player, 'trait1' | 'trait2'> {
  if (rosterStatus !== 'MLB' || !STRUGGLING_TEAM_INDEXES.has(teamIndex)) return {};

  if (!isPitcherPosition(position)) {
    if (rosterIndex === 0) return { trait1: 'Tough Out' };
    if (rosterIndex === 1) return { trait1: 'Rally Starter' };
    if (rosterIndex === 4) return { trait1: 'Clutch' };
    if (rosterIndex === 7) return { trait1: 'Durable' };
  }

  if (position === 'SP' && rosterIndex === 13) return { trait1: 'K Collector' };
  if (position === 'RP' && rosterIndex === 16) return { trait1: 'Composed' };

  return {};
}

function seededPlayerMorale(teamIndex: number, rosterIndex: number, isStar: boolean): number {
  if (isStar) return 92;
  if (STRUGGLING_TEAM_INDEXES.has(teamIndex) && rosterIndex < 18) {
    return 28 + ((teamIndex * 3 + rosterIndex * 5) % 13);
  }
  return 42 + ((teamIndex * 7 + rosterIndex * 5) % 46);
}

function deleteDatabaseIfPresent(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Failed to delete IndexedDB database ${name}`));
    request.onblocked = () => resolve();
  });
}

async function clearStoresIfPresent(dbName: string, storeNames: string[]): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(`Failed to open IndexedDB database ${dbName}`));
    request.onblocked = () => reject(new Error(`IndexedDB database ${dbName} open was blocked`));
  });

  try {
    const existingStores = storeNames.filter((storeName) => db.objectStoreNames.contains(storeName));
    if (existingStores.length === 0) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(existingStores, 'readwrite');
      for (const storeName of existingStores) {
        tx.objectStore(storeName).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error(`Failed to clear IndexedDB database ${dbName}`));
      tx.onabort = () => reject(tx.error ?? new Error(`Clearing IndexedDB database ${dbName} aborted`));
    });
  } finally {
    db.close();
  }
}

async function resetSandboxDatabases(): Promise<void> {
  syncEngine.setEnabled(false);
  resetTrackerDbForTests();
  resetFranchiseMoraleDatabaseForTests();
  resetManagerIdentityDatabaseForTests();
  __resetLeagueBuilderDatabaseForTests();
  await deleteFranchiseDatabase(L_SIM_IDS.franchiseId);
  await Promise.all([
    clearStoresIfPresent('kbl-app-meta', ['franchiseList', 'appSettings', 'franchiseConfigs', 'eliminationList']).catch(() => undefined),
    clearStoresIfPresent('kbl-schedule', ['scheduledGames', 'scheduleMetadata']).catch(() => undefined),
    clearStoresIfPresent('kbl-event-log', [
      'gameHeaders',
      'atBatEvents',
      'pitchingAppearances',
      'fieldingEvents',
      'betweenPlayEvents',
    ]).catch(() => undefined),
    clearStoresIfPresent('kbl-manager-identity', ['managerProfiles', 'managerAssignments']).catch(() => undefined),
  ]);
  await Promise.all(DB_NAMES_TO_DELETE.map(deleteDatabaseIfPresent));
}

function makeTeam(index: number): Omit<Team, 'createdDate' | 'lastModified'> {
  const stadium = STADIUMS[index] ?? STADIUMS[0];
  return {
    id: `lsim-team-${String(index + 1).padStart(2, '0')}`,
    name: `L-SIM Team ${index + 1}`,
    abbreviation: `LS${index + 1}`,
    location: `Sandbox ${index + 1}`,
    nickname: `Signals ${index + 1}`,
    colors: {
      primary: ['#2451A6', '#A6333F', '#237A57', '#8A5A12', '#5D3A9B', '#4B6574'][index] ?? '#2451A6',
      secondary: '#F7F2EA',
      accent: ['#F7B32B', '#59C3C3', '#F45B69', '#79B473', '#E0A458', '#78A1BB'][index] ?? '#F7B32B',
    },
    stadium,
    stadiumId: getStableParkId(stadium),
    parkFactors: getDerivedParkFactorsIfAvailable(stadium),
    controlledBy: index === 0 ? 'human' : 'ai',
    leagueIds: [L_SIM_IDS.leagueId],
    foundedYear: 2026,
  };
}

function makePlayer(team: Team, teamIndex: number, rosterIndex: number, position: Position, rosterStatus: 'MLB' | 'FARM'): Player {
  const isStar = teamIndex === 0 && rosterStatus === 'MLB' && rosterIndex === 0;
  const isPitcher = isPitcherPosition(position);
  const ratingBase = isStar ? 91 : Math.max(38, 78 - rosterIndex + teamIndex);
  const salary = isStar
    ? 20_000
    : rosterStatus === 'FARM'
      ? 12_000 + (teamIndex * 500) + (rosterIndex * 250)
      : 280_000 + (teamIndex * 35_000) + (rosterIndex * 9_000);
  const personality = (['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined', 'Tough', 'Relaxed', 'Egotistical', 'Timid', 'Droopy'] as const)[
    (teamIndex + rosterIndex) % 10
  ];
  const heldTraits = heldTraitsFor(teamIndex, rosterIndex, position, rosterStatus);

  return {
    id: `${team.id}-${rosterStatus.toLowerCase()}-${String(rosterIndex + 1).padStart(2, '0')}-${position.replace('/', '-')}`,
    firstName: isStar ? 'Catalyst' : `Seed${teamIndex + 1}`,
    lastName: isStar ? 'Anchor' : `Player${rosterIndex + 1}`,
    gender: rosterIndex % 5 === 0 ? 'F' : 'M',
    jerseyNumber: (rosterIndex + 7 + teamIndex * 11) % 99,
    age: rosterStatus === 'FARM' ? 20 + (rosterIndex % 4) : 23 + (rosterIndex % 12),
    bats: rosterIndex % 3 === 0 ? 'S' : rosterIndex % 2 === 0 ? 'L' : 'R',
    throws: rosterIndex % 2 === 0 ? 'R' : 'L',
    primaryPosition: position,
    secondaryPosition: isPitcher ? 'RP' : rosterIndex % 2 === 0 ? 'IF' : 'OF',
    power: isPitcher ? 28 : ratingBase,
    contact: isPitcher ? 24 : Math.min(99, ratingBase + (isStar ? 4 : 0)),
    speed: isPitcher ? 30 : Math.min(99, ratingBase - 5 + (rosterIndex % 8)),
    fielding: isPitcher ? Math.max(40, ratingBase - 10) : Math.min(99, ratingBase - 2),
    arm: Math.min(99, ratingBase + (isPitcher ? 2 : 0)),
    velocity: isPitcher ? Math.min(99, ratingBase + 5) : 20,
    junk: isPitcher ? Math.min(99, ratingBase) : 20,
    accuracy: isPitcher ? Math.min(99, ratingBase - 1) : 20,
    arsenal: isPitcher ? ['4F', 'SL', 'CH'] : [],
    overallGrade: isStar ? 'S' : rosterIndex < 5 ? 'A-' : rosterIndex < 13 ? 'B' : 'C+',
    personality,
    chemistry: CHEMISTRIES[(teamIndex + rosterIndex) % CHEMISTRIES.length],
    hiddenPersonalityModifiers: {
      loyalty: isStar ? 70 : 35 + ((teamIndex * 9 + rosterIndex * 7) % 55),
      ambition: isStar ? 95 : 25 + ((teamIndex * 11 + rosterIndex * 5) % 60),
      resilience: isStar ? 82 : 30 + ((teamIndex * 13 + rosterIndex * 3) % 58),
      charisma: isStar ? 88 : 28 + ((teamIndex * 5 + rosterIndex * 11) % 62),
    },
    ...heldTraits,
    morale: seededPlayerMorale(teamIndex, rosterIndex, isStar),
    mojo: isStar ? 'Hot' : 'Normal',
    fame: isStar ? 24 : 4 + ((teamIndex + rosterIndex) % 9),
    salary,
    salaryCalculationVersion: FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION,
    salarySeasonId: L_SIM_IDS.seasonId,
    salaryStatsScopeId: L_SIM_IDS.statsScopeId,
    salarySeasonNumber: L_SIM_IDS.seasonNumber,
    salaryUpdatedAt: FIXED_ISO,
    contractYears: rosterStatus === 'FARM' ? 1 : 2 + (rosterIndex % 4),
    leagueAssignments: [{
      leagueId: L_SIM_IDS.leagueId,
      teamId: team.id,
      rosterStatus,
    }],
    ratingRevealState: rosterStatus === 'FARM' ? 'hidden' : 'revealed',
    createdDate: FIXED_ISO,
    lastModified: FIXED_ISO,
    isCustom: true,
    sourceDatabase: 'lsim-h1',
  };
}

function depthChart(players: Player[]): TeamRoster['depthChart'] {
  const idsByPosition = (position: Position) => players.filter((player) => player.primaryPosition === position).map((player) => player.id);
  const pitchers = players.filter((player) => isPitcherPosition(player.primaryPosition)).map((player) => player.id);
  return {
    C: idsByPosition('C'),
    '1B': idsByPosition('1B'),
    '2B': idsByPosition('2B'),
    SS: idsByPosition('SS'),
    '3B': idsByPosition('3B'),
    LF: idsByPosition('LF'),
    CF: idsByPosition('CF'),
    RF: idsByPosition('RF'),
    DH: idsByPosition('DH'),
    SP: players.filter((player) => player.primaryPosition === 'SP' || player.primaryPosition === 'SP/RP').map((player) => player.id),
    RP: pitchers.filter((id) => !idsByPosition('SP').includes(id)),
    CP: idsByPosition('CP'),
  };
}

function rosterLineup(players: Player[]): TeamRoster['lineupWithDH'] {
  const fieldingOrder: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'];
  return fieldingOrder.map((position, index) => ({
    battingOrder: index + 1,
    playerId: players.find((player) => player.primaryPosition === position)?.id ?? players[index].id,
    fieldingPosition: position,
  }));
}

async function seedLeagueAndFranchisePlayers(): Promise<Omit<LsimSandboxContext, 'scheduleByGameNumber' | 'processOptions' | 'scope' | 'setupPath' | 'salaryBaseline' | 'trueValueCandidatePlayerId'>> {
  const teams: Team[] = [];
  const teamSeeds: LsimTeamSeed[] = [];

  await saveLeagueTemplate({
    id: L_SIM_IDS.leagueId,
    name: 'L-SIM H1 Sandbox League',
    description: 'Synthetic L-SIM Phase-1 harness league.',
    teamIds: Array.from({ length: 6 }, (_, index) => `lsim-team-${String(index + 1).padStart(2, '0')}`),
    conferences: [
      { id: 'lsim-conf-a', name: 'Sandbox Alpha', abbreviation: 'SA', divisionIds: ['lsim-div-a'] },
      { id: 'lsim-conf-b', name: 'Sandbox Beta', abbreviation: 'SB', divisionIds: ['lsim-div-b'] },
    ],
    divisions: [
      { id: 'lsim-div-a', name: 'Alpha', conferenceId: 'lsim-conf-a', teamIds: ['lsim-team-01', 'lsim-team-02', 'lsim-team-03'] },
      { id: 'lsim-div-b', name: 'Beta', conferenceId: 'lsim-conf-b', teamIds: ['lsim-team-04', 'lsim-team-05', 'lsim-team-06'] },
    ],
    defaultRulesPreset: 'lsim-rules',
    tier: 'standard',
    balanceMode: 'advisory',
    color: '#2451A6',
  });

  for (let teamIndex = 0; teamIndex < 6; teamIndex += 1) {
    let team = await saveTeam(makeTeam(teamIndex));
    const mlbPlayers = MLB_POSITIONS.map((position, rosterIndex) => makePlayer(team, teamIndex, rosterIndex, position, 'MLB'));
    const farmPlayers = FARM_POSITIONS.map((position, rosterIndex) => makePlayer(team, teamIndex, rosterIndex, position, 'FARM'));
    team = {
      ...team,
      captainPlayerId: mlbPlayers[0]?.id ?? null,
      fanHopefulPlayerId: farmPlayers[0]?.id ?? null,
    };
    await saveTeam(team);
    await saveFranchiseTeam(L_SIM_IDS.franchiseId, team);

    for (const player of [...mlbPlayers, ...farmPlayers]) {
      await savePlayer(player);
      await saveFranchisePlayer(L_SIM_IDS.franchiseId, player);
    }

    const positionPlayers = mlbPlayers.filter((player) => !isPitcherPosition(player.primaryPosition));
    const pitchers = mlbPlayers.filter((player) => isPitcherPosition(player.primaryPosition));
    const lineupWithDH = rosterLineup(positionPlayers);
    const lineupWithoutDH = lineupWithDH.filter((slot) => slot.fieldingPosition !== 'DH');

    await saveTeamRoster({
      teamId: team.id,
      mlbRoster: mlbPlayers.map((player) => player.id),
      farmRoster: farmPlayers.map((player) => player.id),
      lineupWithDH,
      lineupWithoutDH,
      startingRotation: pitchers.filter((player) => player.primaryPosition === 'SP' || player.primaryPosition === 'SP/RP').map((player) => player.id),
      longRelievers: pitchers.filter((player) => player.primaryPosition === 'RP').slice(0, 2).map((player) => player.id),
      closingPitcher: pitchers.find((player) => player.primaryPosition === 'CP')?.id ?? pitchers[pitchers.length - 1].id,
      setupPitchers: pitchers.filter((player) => player.primaryPosition === 'RP').slice(2).map((player) => player.id),
      depthChart: depthChart(mlbPlayers),
      pinchHitOrder: positionPlayers.slice(9).map((player) => player.id),
      pinchRunOrder: [...positionPlayers].sort((left, right) => right.speed - left.speed).map((player) => player.id),
      defensiveSubOrder: [...positionPlayers].sort((left, right) => right.fielding - left.fielding).map((player) => player.id),
      lastModified: FIXED_ISO,
    });

    teams.push(team);
    teamSeeds.push({ team, mlbPlayers, farmPlayers, positionPlayers, pitchers });
  }

  return { ids: L_SIM_IDS, teams, teamSeeds };
}

async function seedManagerAssignments(teams: Team[]): Promise<void> {
  const profiles = await ensureDefaultManagerProfiles(teams);
  const profileByTeamId = new Map(profiles.map((profile, index) => [teams[index].id, profile]));

  for (const team of teams) {
    const profile = profileByTeamId.get(team.id);
    if (!profile) continue;
    await saveManagerAssignment({
      managerId: profile.managerId,
      teamId: team.id,
      mode: 'franchise',
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
      startDate: FIXED_ISO,
    });
  }
}

async function seedStrugglingFanMoraleTrajectory(): Promise<void> {
  for (const [teamId, target] of Object.entries(STRUGGLING_TEAM_MORALE_TARGETS)) {
    const firstDrop = Math.ceil((50 - target) * 0.55);
    const secondDrop = 50 - target - firstDrop;
    await applyFranchiseMoraleEffect({
      franchiseId: L_SIM_IDS.franchiseId,
      seasonId: L_SIM_IDS.seasonId,
      statsScopeId: L_SIM_IDS.statsScopeId,
      seasonNumber: L_SIM_IDS.seasonNumber,
      targetType: 'team-fan',
      teamId,
      delta: -firstDrop,
      reason: 'L-SIM seeded early fan concern for a struggling club',
      sourceEventId: `lsim-step3-fan-drop:${teamId}:opening`,
      sourceKind: 'manual-override',
      actorDisplayName: 'L-SIM Step 3 seeder',
      timestamp: FIXED_ISO,
    });
    await applyFranchiseMoraleEffect({
      franchiseId: L_SIM_IDS.franchiseId,
      seasonId: L_SIM_IDS.seasonId,
      statsScopeId: L_SIM_IDS.statsScopeId,
      seasonNumber: L_SIM_IDS.seasonNumber,
      targetType: 'team-fan',
      teamId,
      delta: -secondDrop,
      reason: 'L-SIM seeded sustained fan decline for a struggling club',
      sourceEventId: `lsim-step3-fan-drop:${teamId}:sustained`,
      sourceKind: 'manual-override',
      actorDisplayName: 'L-SIM Step 3 seeder',
      timestamp: FIXED_PLUS_ONE_MINUTE_ISO,
    });
  }
}

function buildSalaryBaseline(teamSeeds: LsimTeamSeed[]): StoredFranchiseConfig['salaryBaseline'] {
  const teamPayrolls: Record<string, number> = {};
  let totalSalary = 0;
  let salariedPlayerCount = 0;

  for (const seed of teamSeeds) {
    const payroll = [...seed.mlbPlayers, ...seed.farmPlayers].reduce((sum, player) => {
      if (Number.isFinite(player.salary) && player.salary > 0) {
        salariedPlayerCount += 1;
        totalSalary += player.salary;
        return sum + player.salary;
      }
      return sum;
    }, 0);
    teamPayrolls[seed.team.id] = payroll;
  }

  return {
    calculationVersion: FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION,
    playerCount: teamSeeds.reduce((count, seed) => count + seed.mlbPlayers.length + seed.farmPlayers.length, 0),
    salariedPlayerCount,
    totalSalary,
    teamPayrolls,
  };
}

function buildFranchiseConfig(teamSeeds: LsimTeamSeed[], salaryBaseline: StoredFranchiseConfig['salaryBaseline']): StoredFranchiseConfig {
  const selectedTeams = teamSeeds.map((seed) => seed.team.id);
  const teamControl = Object.fromEntries(teamSeeds.map((seed, index) => [seed.team.id, index === 0 ? 'human' : 'ai'] as const));
  const controlledTeams = teamSeeds.map((seed, index) => ({
    teamId: seed.team.id,
    teamName: seed.team.name,
    controlledBy: index === 0 ? 'human' as const : 'ai' as const,
  }));
  const rulesSnapshot = {
    gamesPerTeam: L_SIM_IDS.gamesPerTeam,
    inningsPerGame: L_SIM_IDS.inningsPerGame,
    extraInningsRule: 'classic',
    scheduleType: 'manual',
    useDH: true,
    allStarGame: true,
    tradeDeadline: true,
    mercyRule: false,
  };
  const playoffSetupSnapshot = {
    teamsQualifying: 4,
    format: 'seeded-bracket',
    seriesLengths: {
      wildCard: 'best-of-1',
      divisionSeries: 'best-of-3',
      championship: 'best-of-3',
      worldSeries: 'best-of-5',
    },
    homeFieldAdvantage: 'higher-seed',
  };
  const seasonLength = {
    gamesPerTeam: L_SIM_IDS.gamesPerTeam,
    expectedRegularSeasonGamesPerTeam: L_SIM_IDS.gamesPerTeam,
    inningsPerGame: L_SIM_IDS.inningsPerGame,
    adaptiveStandardsInningsPerGame: L_SIM_IDS.inningsPerGame,
  };
  const schedulePolicy = {
    policy: 'empty-manual-user-supplied' as const,
    generatedSchedulesAllowed: false as const,
    initialScheduleRows: 0,
    allowedSources: ['manual', 'csv'] as Array<'manual' | 'csv'>,
  };
  const rosterRequirements = {
    mlbPlayersPerTeam: 22,
    farmPlayersPerTeam: 10,
    validationStatus: 'passed' as const,
    teamCounts: Object.fromEntries(teamSeeds.map((seed) => [seed.team.id, { MLB: seed.mlbPlayers.length, FARM: seed.farmPlayers.length }])),
  };
  const stadiums = teamSeeds.map((seed) => ({
    teamId: seed.team.id,
    teamName: seed.team.name,
    stadium: seed.team.stadium,
    stadiumId: seed.team.stadiumId,
    hasSeedParkFactors: Boolean(seed.team.parkFactors),
  }));
  const teamSnapshot = {
    franchiseType: 'solo' as const,
    aiScoreEntry: true,
    teamControl,
    controlledTeams,
  };
  const handoffContract = {
    version: 'mode1-mode2-v1' as const,
    franchiseType: 'solo' as const,
    teamControl: teamSnapshot,
    rulesSnapshot,
    playoffSetupSnapshot,
    seasonLength,
    schedulePolicy,
    rosterRequirements,
    stadiums,
    salaryBaseline,
  };

  return {
    franchiseId: L_SIM_IDS.franchiseId,
    createdAt: FIXED_START,
    league: L_SIM_IDS.leagueId,
    leagueDetails: {
      name: 'L-SIM H1 Sandbox League',
      teams: teamSeeds.length,
      conferences: 2,
      divisions: 2,
    },
    season: rulesSnapshot,
    playoffs: playoffSetupSnapshot,
    teams: {
      selectedTeams,
      mode: 'single',
      playerAssignments: { [selectedTeams[0]]: 'human' },
    },
    roster: {
      mode: 'existing',
      startupProspectDraft: {
        enabled: false,
        rounds: 0,
        mode: 'auto-snake-v1',
      },
    },
    franchiseName: 'L-SIM H1 Sandbox',
    franchiseType: 'solo',
    aiScoreEntry: true,
    teamControl,
    controlledTeams,
    rulesSnapshot,
    playoffSetupSnapshot,
    seasonLength,
    schedulePolicy,
    rosterRequirements,
    stadiums,
    salaryBaseline,
    handoffContract,
  };
}

async function seedSeasonMetadata(totalScheduledGames: number, initialGamesPlayed: number): Promise<void> {
  await saveSeasonMetadata({
    seasonId: L_SIM_IDS.seasonId,
    seasonNumber: L_SIM_IDS.seasonNumber,
    seasonName: 'L-SIM H1 Season 1',
    status: 'active',
    startDate: FIXED_START,
    gamesPlayed: initialGamesPlayed,
    totalGames: totalScheduledGames,
    gamesPerTeam: L_SIM_IDS.gamesPerTeam,
  });
}

function buildRoundRobinScheduleRows(teams: Team[], totalScheduledGames: number): Array<{
  gameNumber: number;
  dayNumber: number;
  date: string;
  time: string;
  notes: string;
  awayTeamId: string;
  homeTeamId: string;
}> {
  const pairings: Array<[Team, Team]> = [];
  for (let left = 0; left < teams.length; left += 1) {
    for (let right = left + 1; right < teams.length; right += 1) {
      pairings.push([teams[left], teams[right]]);
    }
  }

  return Array.from({ length: totalScheduledGames }, (_, index) => {
    const gameNumber = index + 1;
    const pairing = pairings[index % pairings.length];
    const cycle = Math.floor(index / pairings.length);
    const home = cycle % 2 === 0 ? pairing[0] : pairing[1];
    const away = cycle % 2 === 0 ? pairing[1] : pairing[0];

    return {
      gameNumber,
      dayNumber: gameNumber,
      date: `LSIM Day ${gameNumber}`,
      time: '7:05 PM',
      notes: 'L-SIM H2 seeded schedule row',
      awayTeamId: away.id,
      homeTeamId: home.id,
    };
  });
}

async function seedDeterministicScheduleRows(teams: Team[], totalScheduledGames: number): Promise<Map<number, ScheduledGame>> {
  const rows = buildRoundRobinScheduleRows(teams, totalScheduledGames);
  const games: ScheduledGame[] = rows.map((row) => ({
    id: `lsim-schedule-g${String(row.gameNumber).padStart(3, '0')}`,
    franchiseId: L_SIM_IDS.franchiseId,
    seasonId: L_SIM_IDS.seasonId,
    statsScopeId: L_SIM_IDS.statsScopeId,
    seasonNumber: L_SIM_IDS.seasonNumber,
    gameNumber: row.gameNumber,
    dayNumber: row.dayNumber,
    date: row.date,
    time: row.time,
    notes: row.notes,
    awayTeamId: row.awayTeamId,
    homeTeamId: row.homeTeamId,
    status: 'SCHEDULED',
    createdAt: FIXED_START + (row.gameNumber * 60_000),
    importedAt: FIXED_START,
    source: 'csv-import',
  }));

  const db = await initScheduleDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['scheduledGames', 'scheduleMetadata'], 'readwrite');
    const gameStore = tx.objectStore('scheduledGames');
    for (const game of games) {
      gameStore.put(game);
    }
    tx.objectStore('scheduleMetadata').put({
      seasonNumber: L_SIM_IDS.seasonNumber,
      totalGamesScheduled: games.length,
      totalGamesCompleted: 0,
      lastUpdated: FIXED_START,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to seed deterministic L-SIM schedule'));
    tx.onabort = () => reject(tx.error ?? new Error('Deterministic L-SIM schedule seed aborted'));
  });

  return new Map(games.map((game) => [game.gameNumber, game]));
}

async function seedScheduleRows(teams: Team[], totalScheduledGames: number, deterministicIds: boolean): Promise<Map<number, ScheduledGame>> {
  if (deterministicIds) {
    return seedDeterministicScheduleRows(teams, totalScheduledGames);
  }

  const rows = Array.from({ length: totalScheduledGames }, (_, index) => {
    const gameNumber = index + 1;
    const homeTeamId = gameNumber === L_SIM_IDS.checkpointGameNumber
      ? teams[0].id
      : teams[index % teams.length].id;
    const awayTeamId = gameNumber === L_SIM_IDS.checkpointGameNumber
      ? teams[1].id
      : teams[(index + 1) % teams.length].id;
    return {
      gameNumber,
      dayNumber: gameNumber,
      date: `LSIM Day ${gameNumber}`,
      time: '7:05 PM',
      notes: 'L-SIM H1 seeded schedule row',
      awayTeamId,
      homeTeamId,
    };
  });

  const games = await importFranchiseScheduleRows({
    franchiseId: L_SIM_IDS.franchiseId,
    seasonNumber: L_SIM_IDS.seasonNumber,
    seasonId: L_SIM_IDS.seasonId,
    statsScopeId: L_SIM_IDS.statsScopeId,
    rows,
  });

  return new Map(games.map((game) => [game.gameNumber, game]));
}

async function seedPriorRegularSeasonStats(teamSeeds: LsimTeamSeed[]): Promise<void> {
  for (const seed of teamSeeds) {
    for (const [index, player] of seed.positionPlayers.entries()) {
      const batting = await getOrCreateBattingStats(L_SIM_IDS.statsScopeId, player.id, playerName(player), seed.team.id);
      await updateBattingStats({
        ...batting,
        games: 4,
        pa: 18,
        ab: 16,
        hits: index === 0 && seed.team.id === 'lsim-team-01' ? 11 : 4 + (index % 4),
        singles: index === 0 && seed.team.id === 'lsim-team-01' ? 4 : 3,
        doubles: index % 3,
        triples: index === 2 ? 1 : 0,
        homeRuns: index === 0 && seed.team.id === 'lsim-team-01' ? 5 : index % 2,
        rbi: index === 0 && seed.team.id === 'lsim-team-01' ? 15 : 3 + index,
        runs: index === 0 && seed.team.id === 'lsim-team-01' ? 11 : 2 + (index % 5),
        walks: 2,
        strikeouts: index % 5,
        hitByPitch: 0,
        sacFlies: index % 2,
        sacBunts: 0,
        stolenBases: index % 3,
        caughtStealing: 0,
        gidp: 0,
        fameBonuses: 0,
        fameBoners: 0,
        fameNet: 0,
      });

      const fielding = await getOrCreateFieldingStats(L_SIM_IDS.statsScopeId, player.id, playerName(player), seed.team.id);
      await updateFieldingStats({
        ...fielding,
        games: 4,
        putouts: 10 + index,
        assists: 4 + (index % 5),
        errors: index === 0 ? 0 : index % 2,
        doublePlays: index % 2,
        divingCatches: index === 0 && seed.team.id === 'lsim-team-01' ? 3 : index % 2,
        robberies: index === 0 && seed.team.id === 'lsim-team-01' ? 1 : 0,
        nutshots: 0,
        gamesByPosition: { [player.primaryPosition]: 4 },
        putoutsByPosition: { [player.primaryPosition]: 10 + index },
        assistsByPosition: { [player.primaryPosition]: 4 + (index % 5) },
        errorsByPosition: { [player.primaryPosition]: index === 0 ? 0 : index % 2 },
      });
    }

    for (const [index, player] of seed.pitchers.entries()) {
      const pitching = await getOrCreatePitchingStats(L_SIM_IDS.statsScopeId, player.id, playerName(player), seed.team.id);
      const isStarter = player.primaryPosition === 'SP' || player.primaryPosition === 'SP/RP';
      await updatePitchingStats({
        ...pitching,
        games: 3,
        gamesStarted: isStarter ? 3 : 0,
        outsRecorded: isStarter ? 45 : 18,
        hitsAllowed: isStarter ? 10 + index : 8 + index,
        runsAllowed: isStarter ? 4 + index : 3 + index,
        earnedRuns: isStarter ? 4 + index : 3 + index,
        walksAllowed: 3 + index,
        strikeouts: isStarter ? 22 + index : 12 + index,
        homeRunsAllowed: index % 2,
        hitBatters: 0,
        wildPitches: 0,
        wins: index === 0 ? 2 : 0,
        losses: index === 1 ? 1 : 0,
        saves: player.primaryPosition === 'CP' ? 2 : 0,
        holds: player.primaryPosition === 'RP' ? 1 : 0,
        blownSaves: 0,
        qualityStarts: isStarter ? 2 : 0,
        completeGames: 0,
        shutouts: 0,
        noHitters: 0,
        perfectGames: 0,
        fameBonuses: 0,
        fameBoners: 0,
        fameNet: 0,
        pitchingWpa: index === 0 && seed.team.id === 'lsim-team-01' ? 1.8 : 0.2,
      });
    }
  }
}

export function lsimArchiveOptionsFor(scheduleGame: ScheduledGame, finalScore: { away: number; home: number }): LsimArchiveOptions {
  return {
    finalScore,
    inningScores: [
      { away: 1, home: 2 },
      { away: 0, home: 1 },
      { away: 2, home: 0 },
      { away: 0, home: 3 },
      { away: 1, home: 0 },
      { away: 0, home: 2 },
      { away: 2, home: 1 },
      { away: 0, home: 1 },
      { away: 0, home: 2 },
    ],
    seasonId: L_SIM_IDS.seasonId,
    context: {
      statsScopeId: L_SIM_IDS.statsScopeId,
      competitionType: 'franchise',
      competitionId: L_SIM_IDS.franchiseId,
      competitionName: 'L-SIM H1 Sandbox',
      leagueId: L_SIM_IDS.leagueId,
      franchiseId: L_SIM_IDS.franchiseId,
      scheduleGameId: scheduleGame.id,
      totalInnings: L_SIM_IDS.inningsPerGame,
      useGhostRunner: false,
      extraInningRunner: false,
      extraInningRunnerDelay: 2,
    },
  };
}

export async function setupLsimSandbox(options: LsimSandboxSetupOptions = {}): Promise<LsimSandboxContext> {
  const totalScheduledGames = options.totalScheduledGames ?? L_SIM_IDS.gamesPerTeam;
  const initialGamesPlayed = options.initialGamesPlayed ?? (
    options.preseedPriorStats === false ? 0 : L_SIM_IDS.checkpointGameNumber - 1
  );
  const preseedPriorStats = options.preseedPriorStats ?? true;
  const deterministicScheduleIds = options.deterministicScheduleIds ?? false;

  await resetSandboxDatabases();
  const seeded = await seedLeagueAndFranchisePlayers();
  await seedManagerAssignments(seeded.teams);
  const salaryBaseline = buildSalaryBaseline(seeded.teamSeeds);
  await saveFranchiseConfig(buildFranchiseConfig(seeded.teamSeeds, salaryBaseline));
  await seedSeasonMetadata(totalScheduledGames, initialGamesPlayed);
  await seedStrugglingFanMoraleTrajectory();
  const scheduleByGameNumber = await seedScheduleRows(seeded.teams, totalScheduledGames, deterministicScheduleIds);
  if (preseedPriorStats) {
    await seedPriorRegularSeasonStats(seeded.teamSeeds);
  }

  return {
    ...seeded,
    scheduleByGameNumber,
    totalScheduledGames,
    processOptions: {
      seasonId: L_SIM_IDS.seasonId,
      seasonNumber: L_SIM_IDS.seasonNumber,
      seasonName: 'L-SIM H1 Season 1',
      seasonTotalGames: totalScheduledGames,
      gamesPerTeam: L_SIM_IDS.gamesPerTeam,
      gamesPerSeason: L_SIM_IDS.gamesPerTeam,
      inningsPerGame: L_SIM_IDS.inningsPerGame,
      detectMilestones: true,
      milestoneConfig: {
        gamesPerSeason: L_SIM_IDS.gamesPerTeam,
        inningsPerGame: L_SIM_IDS.inningsPerGame,
      },
      franchiseId: L_SIM_IDS.franchiseId,
      currentGame: initialGamesPlayed + 1,
      currentSeason: L_SIM_IDS.seasonNumber,
    },
    scope: {
      franchiseId: L_SIM_IDS.franchiseId,
      seasonId: L_SIM_IDS.seasonId,
      statsScopeId: L_SIM_IDS.statsScopeId,
    },
    setupPath: 'direct',
    salaryBaseline,
    trueValueCandidatePlayerId: seeded.teamSeeds[0].positionPlayers[0].id,
  };
}
