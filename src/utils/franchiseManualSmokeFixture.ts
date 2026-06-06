import { getStableParkId } from '../data/parkLookup';
import { getDerivedParkFactorsIfAvailable } from '../engines/parkFactorDeriver';
import {
  confirmLeagueBuilderProspectPick,
  createLeagueBuilderStartupDraftSession,
  draftLeagueBuilderScout,
  getLeagueBuilderStartupDraftView,
  STARTUP_FARM_TARGET_SIZE,
  STARTUP_MLB_REQUIRED_SIZE,
  STARTUP_SCOUTS_PER_TEAM,
} from './leagueBuilderStartupFarmDraft';
import {
  deleteLeagueTemplate,
  deletePlayer,
  deleteScoutProfilesForLeague,
  deleteStartupDraftSession,
  deleteTeam,
  deleteTeamRoster,
  getAllPlayers,
  getAllTeams,
  getLeagueTemplate,
  getScoutProfilesForLeague,
  saveLeagueTemplate,
  savePlayer,
  saveTeam,
  saveTeamRoster,
  type DepthChart,
  type PitchType,
  type Player,
  type Position,
  type TeamRoster,
} from './leagueBuilderStorage';
import { validatePreparedLeagueBuilderFarmScoutingState } from './leagueBuilderFarmScoutingHandoff';
import { isFranchiseManualSmokeFixtureEnabled } from './franchiseManualSmokeFixtureGate';

export const FRANCHISE_MANUAL_SMOKE_FIXTURE_VERSION = 'franchise-manual-smoke-fixture-v1';
export const FRANCHISE_MANUAL_SMOKE_LEAGUE_ID = 'manual-smoke-v1-league';
export const FRANCHISE_MANUAL_SMOKE_TEAM_COUNT = 6;
export const FRANCHISE_MANUAL_SMOKE_SEASON_NUMBER = 1;
export const FRANCHISE_MANUAL_SMOKE_SOURCE = 'franchise-manual-smoke-fixture';

const TEAM_PREFIX = 'manual-smoke-v1-team';
const NOW = '2026-06-05T00:00:00.000Z';
const STADIUMS = [
  'Apple Field',
  'Sakura Hills',
  'Colonial Plaza',
  'Swagger Center',
  'Motor Yard',
  'Bingata Bowl',
];
const POSITION_STARTERS: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const BENCH_POSITIONS: Position[] = ['C', 'IF', 'OF', '1B/OF'];
const PITCHER_POSITIONS: Position[] = ['SP', 'SP', 'SP', 'SP', 'SP/RP', 'RP', 'RP', 'RP', 'CP', 'P'];
const PITCHER_POSITION_SET = new Set<Position>(['SP', 'RP', 'CP', 'SP/RP', 'P', 'TWO-WAY']);

export interface FranchiseManualSmokeFixtureTeamSummary {
  teamId: string;
  teamName: string;
  stadium: string;
  mlbPlayers: number;
  farmPlayers: number;
  hiredScouts: number;
  payroll: number;
}

export interface FranchiseManualSmokeFixtureReport {
  fixtureVersion: typeof FRANCHISE_MANUAL_SMOKE_FIXTURE_VERSION;
  enabled: boolean;
  leagueId: string;
  leagueName: string;
  seasonNumber: number;
  teamCount: number;
  mlbPlayersPerTeam: number;
  farmPlayersPerTeam: number;
  scoutsPerTeam: number;
  createdMlbPlayers: number;
  createdFarmPlayers: number;
  hiredScouts: number;
  prepared: boolean;
  blockers: string[];
  warnings: string[];
  limitations: string[];
  teamSummaries: FranchiseManualSmokeFixtureTeamSummary[];
  nextSteps: string[];
}

function teamId(index: number): string {
  return `${TEAM_PREFIX}-${String(index + 1).padStart(2, '0')}`;
}

function playerId(team: string, rosterKind: 'b' | 'p', index: number): string {
  return `${team}-mlb-${rosterKind}-${String(index).padStart(2, '0')}`;
}

function isPitcher(position: Position): boolean {
  return PITCHER_POSITION_SET.has(position);
}

function depthChart(): DepthChart {
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

function makePlayer(
  leagueId: string,
  team: string,
  index: number,
  primaryPosition: Position,
): Player {
  const pitcher = isPitcher(primaryPosition);
  const kind = pitcher ? 'p' : 'b';
  const id = playerId(team, kind, index);
  return {
    id,
    firstName: pitcher ? `SmokePitcher${index}` : `SmokeBatter${index}`,
    lastName: team.replace(`${TEAM_PREFIX}-`, 'Team'),
    gender: 'M',
    jerseyNumber: index,
    age: 24 + (index % 8),
    bats: index % 2 === 0 ? 'L' : 'R',
    throws: pitcher || index % 2 === 1 ? 'R' : 'L',
    primaryPosition,
    secondaryPosition: pitcher ? 'P' : 'IF',
    power: pitcher ? 0 : 54 + (index % 22),
    contact: pitcher ? 0 : 58 + (index % 22),
    speed: pitcher ? 0 : 44 + (index % 24),
    fielding: 56 + (index % 22),
    arm: 58 + (index % 20),
    velocity: pitcher ? 76 + index : 0,
    junk: pitcher ? 68 + index : 0,
    accuracy: pitcher ? 70 + index : 0,
    arsenal: pitcher ? (['4F', 'SL', 'CH'] as PitchType[]) : [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1_000_000 + (index * 50_000),
    contractYears: 1 + (index % 3),
    leagueAssignments: [{ leagueId, teamId: team, rosterStatus: 'MLB' }],
    createdDate: NOW,
    lastModified: NOW,
    isCustom: true,
    sourceDatabase: FRANCHISE_MANUAL_SMOKE_SOURCE,
  };
}

function makeRoster(team: string): TeamRoster {
  const starterIds = POSITION_STARTERS.map((_position, index) => playerId(team, 'b', index + 1));
  const benchIds = BENCH_POSITIONS.map((_position, index) => playerId(team, 'b', POSITION_STARTERS.length + index + 1));
  const pitcherIds = PITCHER_POSITIONS.map((_position, index) => playerId(team, 'p', index + 1));
  const lineupWithoutDH = [
    ...POSITION_STARTERS.map((fieldingPosition, index) => ({
      battingOrder: index + 1,
      playerId: starterIds[index],
      fieldingPosition,
    })),
    {
      battingOrder: 9,
      playerId: pitcherIds[0],
      fieldingPosition: 'P' as Position,
    },
  ];

  return {
    teamId: team,
    mlbRoster: [...starterIds, ...benchIds, ...pitcherIds],
    farmRoster: [],
    lineupWithDH: [
      ...POSITION_STARTERS.map((fieldingPosition, index) => ({
        battingOrder: index + 1,
        playerId: starterIds[index],
        fieldingPosition,
      })),
      {
        battingOrder: 9,
        playerId: benchIds[0],
        fieldingPosition: 'DH' as Position,
      },
    ],
    lineupWithoutDH,
    startingRotation: pitcherIds.slice(0, 4),
    longRelievers: pitcherIds.slice(4, 6),
    closingPitcher: pitcherIds[8],
    setupPitchers: pitcherIds.slice(6, 8),
    depthChart: depthChart(),
    pinchHitOrder: benchIds,
    pinchRunOrder: benchIds,
    defensiveSubOrder: benchIds,
    lastModified: NOW,
  };
}

function smokeTeamIds(): string[] {
  return Array.from({ length: FRANCHISE_MANUAL_SMOKE_TEAM_COUNT }, (_value, index) => teamId(index));
}

async function clearExistingSmokeLeague(): Promise<void> {
  const teams = await getAllTeams();
  const players = await getAllPlayers();
  const ids = smokeTeamIds();

  await deleteStartupDraftSession(FRANCHISE_MANUAL_SMOKE_LEAGUE_ID, FRANCHISE_MANUAL_SMOKE_SEASON_NUMBER);
  await deleteScoutProfilesForLeague(FRANCHISE_MANUAL_SMOKE_LEAGUE_ID);

  await Promise.all(
    players
      .filter((player) =>
        player.sourceDatabase === FRANCHISE_MANUAL_SMOKE_SOURCE ||
        player.leagueAssignments?.some((assignment) => assignment.leagueId === FRANCHISE_MANUAL_SMOKE_LEAGUE_ID) ||
        player.id.startsWith(`${TEAM_PREFIX}-`),
      )
      .map((player) => deletePlayer(player.id)),
  );

  await Promise.all(ids.map((id) => deleteTeamRoster(id)));
  await Promise.all(
    teams
      .filter((team) => ids.includes(team.id))
      .map((team) => deleteTeam(team.id)),
  );

  if (await getLeagueTemplate(FRANCHISE_MANUAL_SMOKE_LEAGUE_ID)) {
    await deleteLeagueTemplate(FRANCHISE_MANUAL_SMOKE_LEAGUE_ID);
  }
}

async function seedMlbLeague(): Promise<void> {
  const teamIds = smokeTeamIds();

  for (const [index, id] of teamIds.entries()) {
    const stadium = STADIUMS[index % STADIUMS.length];
    const parkFactors = getDerivedParkFactorsIfAvailable(stadium);
    await saveTeam({
      id,
      name: `Manual Smoke ${index + 1}`,
      abbreviation: `MS${index + 1}`,
      location: index < 3 ? 'Smoke East' : 'Smoke West',
      nickname: `Manual Smoke ${index + 1}`,
      colors: {
        primary: index % 2 === 0 ? '#345995' : '#7D4F50',
        secondary: index % 2 === 0 ? '#EAC435' : '#F9E784',
      },
      stadium,
      stadiumId: getStableParkId(stadium),
      parkFactors,
      leagueIds: [FRANCHISE_MANUAL_SMOKE_LEAGUE_ID],
      lineupWithDH: makeRoster(id).lineupWithDH,
      lineupWithoutDH: makeRoster(id).lineupWithoutDH,
      startingRotation: makeRoster(id).startingRotation,
    });

    for (const [starterIndex, position] of POSITION_STARTERS.entries()) {
      await savePlayer(makePlayer(FRANCHISE_MANUAL_SMOKE_LEAGUE_ID, id, starterIndex + 1, position));
    }
    for (const [benchIndex, position] of BENCH_POSITIONS.entries()) {
      await savePlayer(makePlayer(
        FRANCHISE_MANUAL_SMOKE_LEAGUE_ID,
        id,
        POSITION_STARTERS.length + benchIndex + 1,
        position,
      ));
    }
    for (const [pitcherIndex, position] of PITCHER_POSITIONS.entries()) {
      await savePlayer(makePlayer(FRANCHISE_MANUAL_SMOKE_LEAGUE_ID, id, pitcherIndex + 1, position));
    }

    await saveTeamRoster(makeRoster(id));
  }

  await saveLeagueTemplate({
    id: FRANCHISE_MANUAL_SMOKE_LEAGUE_ID,
    name: 'Manual Smoke Mode 1/2 League',
    description: 'Dev/test-only deterministic League Builder source for manual Franchise smoke validation.',
    teamIds,
    conferences: [
      { id: 'smoke-east', name: 'Smoke East', abbreviation: 'E', divisionIds: ['smoke-east-division'] },
      { id: 'smoke-west', name: 'Smoke West', abbreviation: 'W', divisionIds: ['smoke-west-division'] },
    ],
    divisions: [
      { id: 'smoke-east-division', name: 'Smoke East', conferenceId: 'smoke-east', teamIds: teamIds.slice(0, 3) },
      { id: 'smoke-west-division', name: 'Smoke West', conferenceId: 'smoke-west', teamIds: teamIds.slice(3) },
    ],
    defaultRulesPreset: 'default',
  });
}

async function runStartupFarmAndScoutDraft(): Promise<void> {
  let view = await createLeagueBuilderStartupDraftSession({
    leagueId: FRANCHISE_MANUAL_SMOKE_LEAGUE_ID,
    seasonNumber: FRANCHISE_MANUAL_SMOKE_SEASON_NUMBER,
    seed: FRANCHISE_MANUAL_SMOKE_FIXTURE_VERSION,
    scoutOrder: smokeTeamIds(),
  });

  if (view.blockers.length > 0) {
    throw new Error(`Manual smoke startup draft blocked: ${view.blockers.join(' ')}`);
  }

  while (!view.scoutDraftComplete) {
    const scout = view.availableScouts[0];
    if (!scout) throw new Error('Manual smoke startup draft ran out of available scouts.');
    view = await draftLeagueBuilderScout({
      leagueId: FRANCHISE_MANUAL_SMOKE_LEAGUE_ID,
      seasonNumber: FRANCHISE_MANUAL_SMOKE_SEASON_NUMBER,
      scoutId: scout.id,
    });
  }

  while (!view.prospectDraftComplete) {
    const prospect = view.prospectBoard[0];
    if (!prospect) throw new Error('Manual smoke startup draft ran out of visible prospect candidates.');
    view = await confirmLeagueBuilderProspectPick({
      leagueId: FRANCHISE_MANUAL_SMOKE_LEAGUE_ID,
      seasonNumber: FRANCHISE_MANUAL_SMOKE_SEASON_NUMBER,
      candidateId: prospect.candidateId,
    });
  }
}

function playerTeamAssignment(player: Player, leagueId: string, rosterStatus: 'MLB' | 'FARM'): string | null {
  return player.leagueAssignments?.find((assignment) =>
    assignment.leagueId === leagueId &&
    assignment.rosterStatus === rosterStatus,
  )?.teamId ?? null;
}

export async function prepareFranchiseManualSmokeFixture(options: {
  forceReset?: boolean;
  environment?: Parameters<typeof isFranchiseManualSmokeFixtureEnabled>[0];
} = {}): Promise<FranchiseManualSmokeFixtureReport> {
  const enabled = isFranchiseManualSmokeFixtureEnabled(options.environment);
  if (!enabled) {
    return {
      fixtureVersion: FRANCHISE_MANUAL_SMOKE_FIXTURE_VERSION,
      enabled: false,
      leagueId: FRANCHISE_MANUAL_SMOKE_LEAGUE_ID,
      leagueName: 'Manual Smoke Mode 1/2 League',
      seasonNumber: FRANCHISE_MANUAL_SMOKE_SEASON_NUMBER,
      teamCount: 0,
      mlbPlayersPerTeam: STARTUP_MLB_REQUIRED_SIZE,
      farmPlayersPerTeam: STARTUP_FARM_TARGET_SIZE,
      scoutsPerTeam: STARTUP_SCOUTS_PER_TEAM,
      createdMlbPlayers: 0,
      createdFarmPlayers: 0,
      hiredScouts: 0,
      prepared: false,
      blockers: ['Manual smoke fixture setup is available only in dev/test preview environments.'],
      warnings: [],
      limitations: [],
      teamSummaries: [],
      nextSteps: [],
    };
  }

  const existingView = await getLeagueBuilderStartupDraftView(
    FRANCHISE_MANUAL_SMOKE_LEAGUE_ID,
    FRANCHISE_MANUAL_SMOKE_SEASON_NUMBER,
  );
  if (options.forceReset !== false || !existingView.prepared) {
    await clearExistingSmokeLeague();
    await seedMlbLeague();
    await runStartupFarmAndScoutDraft();
  }

  const [players, teams, scouts, handoff] = await Promise.all([
    getAllPlayers(),
    getAllTeams(),
    getScoutProfilesForLeague(FRANCHISE_MANUAL_SMOKE_LEAGUE_ID),
    validatePreparedLeagueBuilderFarmScoutingState(FRANCHISE_MANUAL_SMOKE_LEAGUE_ID),
  ]);

  const fixtureTeams = teams.filter((team) => smokeTeamIds().includes(team.id));
  const teamSummaries = fixtureTeams.map((team) => {
    const mlbPlayers = players.filter((player) =>
      playerTeamAssignment(player, FRANCHISE_MANUAL_SMOKE_LEAGUE_ID, 'MLB') === team.id,
    );
    const farmPlayers = players.filter((player) =>
      playerTeamAssignment(player, FRANCHISE_MANUAL_SMOKE_LEAGUE_ID, 'FARM') === team.id,
    );
    return {
      teamId: team.id,
      teamName: team.name,
      stadium: team.stadium,
      mlbPlayers: mlbPlayers.length,
      farmPlayers: farmPlayers.length,
      hiredScouts: scouts.filter((scout) => scout.teamId === team.id).length,
      payroll: [...mlbPlayers, ...farmPlayers].reduce((sum, player) => sum + (Number(player.salary) || 0), 0),
    };
  });

  return {
    fixtureVersion: FRANCHISE_MANUAL_SMOKE_FIXTURE_VERSION,
    enabled: true,
    leagueId: FRANCHISE_MANUAL_SMOKE_LEAGUE_ID,
    leagueName: 'Manual Smoke Mode 1/2 League',
    seasonNumber: FRANCHISE_MANUAL_SMOKE_SEASON_NUMBER,
    teamCount: teamSummaries.length,
    mlbPlayersPerTeam: STARTUP_MLB_REQUIRED_SIZE,
    farmPlayersPerTeam: STARTUP_FARM_TARGET_SIZE,
    scoutsPerTeam: STARTUP_SCOUTS_PER_TEAM,
    createdMlbPlayers: teamSummaries.reduce((sum, team) => sum + team.mlbPlayers, 0),
    createdFarmPlayers: teamSummaries.reduce((sum, team) => sum + team.farmPlayers, 0),
    hiredScouts: scouts.length,
    prepared: handoff.prepared,
    blockers: handoff.blockers,
    warnings: handoff.warnings,
    limitations: [
      'Dev/test-only manual smoke fixture. This is not product auto-draft or normal Franchise gameplay automation.',
      'Fixture data is written only to the clearly named manual-smoke-v1 League Builder namespace.',
      ...handoff.limitations,
    ],
    teamSummaries,
    nextSteps: [
      'Open Franchise Setup and choose Manual Smoke Mode 1/2 League.',
      'Create a no-DH Franchise, manually add a schedule row, launch GameTracker, and verify Team Hub Stadium spray evidence after completion.',
    ],
  };
}
