import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { GameHeader } from '../eventLog';
import type { Player, Team } from '../franchisePlayerStorage';
import { buildFranchiseValueInputRows } from '../franchiseValueInputs';

const mocks = vi.hoisted(() => ({
  getFranchiseConfig: vi.fn(),
  getAllFranchisePlayers: vi.fn(),
  getAllFranchiseTeams: vi.fn(),
  getAllBattingStats: vi.fn(),
  getAllPitchingStats: vi.fn(),
  getAllFieldingStats: vi.fn(),
  getSeasonMetadata: vi.fn(),
  getAllGamesByFranchise: vi.fn(),
  getRecentGames: vi.fn(),
  getGameHeadersForScope: vi.fn(),
  getTrustedValueArtifact: vi.fn(),
}));

vi.mock('../franchiseManager', () => ({
  getFranchiseConfig: mocks.getFranchiseConfig,
}));

vi.mock('../franchisePlayerStorage', () => ({
  getAllFranchisePlayers: mocks.getAllFranchisePlayers,
  getAllFranchiseTeams: mocks.getAllFranchiseTeams,
}));

vi.mock('../seasonStorage', () => ({
  getAllBattingStats: mocks.getAllBattingStats,
  getAllPitchingStats: mocks.getAllPitchingStats,
  getAllFieldingStats: mocks.getAllFieldingStats,
  getSeasonMetadata: mocks.getSeasonMetadata,
}));

vi.mock('../scheduleStorage', () => ({
  getAllGamesByFranchise: mocks.getAllGamesByFranchise,
}));

vi.mock('../gameStorage', () => ({
  getRecentGames: mocks.getRecentGames,
}));

vi.mock('../eventLog', () => ({
  getGameHeadersForScope: mocks.getGameHeadersForScope,
}));

vi.mock('../franchiseTrustedValueStorage', () => ({
  getTrustedValueArtifact: mocks.getTrustedValueArtifact,
  isPlayerTrustedForValue: (artifact: { trustedPlayerIds?: string[] } | null | undefined, playerId: string | null | undefined) =>
    Boolean(artifact && playerId && artifact.trustedPlayerIds?.includes(playerId)),
}));

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    firstName: 'Canon',
    lastName: 'Input',
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    power: 70,
    contact: 72,
    speed: 65,
    fielding: 80,
    arm: 78,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 8.5,
    contractYears: 2,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
    ...overrides,
  };
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Input Club',
    abbreviation: 'IC',
    location: 'Canon',
    nickname: 'Inputs',
    colors: { primary: '#111111', secondary: '#eeeeee' },
    stadium: 'Apple Field',
    stadiumId: 'stadium-apple-field',
    parkFactors: {
      battingAverage: 1.01,
      homeRuns: 0.98,
      doubles: 1,
      triples: 1,
      walks: 1,
      strikeouts: 1,
      runScoring: 1,
      foulTerritory: 1,
      source: 'seed',
    } as Team['parkFactors'],
    leagueIds: ['league-1'],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function header(
  gameId: string,
  date: number,
  homeLineup: NonNullable<GameHeader['startingLineups']>['home'] = [],
): GameHeader {
  return {
    gameId,
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    franchiseId: 'franchise-1',
    date,
    awayTeamId: `away-${gameId}`,
    awayTeamName: `Away ${gameId}`,
    homeTeamId: 'team-1',
    homeTeamName: 'Input Club',
    startingLineups: {
      away: [],
      home: homeLineup,
    },
    finalScore: { away: 0, home: 1 },
    finalInning: 9,
    isComplete: true,
    aggregated: true,
    aggregatedAt: date + 1,
    aggregationError: null,
    eventCount: 1,
    checksum: gameId,
  };
}

function starter(playerId: string, position: string, battingOrder = 1): NonNullable<GameHeader['startingLineups']>['home'][number] {
  return {
    playerId,
    playerName: playerId,
    position,
    battingOrder,
  };
}

function seedBaseMocks() {
  mocks.getFranchiseConfig.mockResolvedValue({
    franchiseId: 'franchise-1',
    league: 'league-1',
    season: { gamesPerTeam: 60, inningsPerGame: 9 },
    seasonLength: { gamesPerTeam: 24, inningsPerGame: 6, metadataVersion: 'v1' },
    rulesSnapshot: { useDH: false, inningsPerGame: 6 },
    stadiums: [{ teamId: 'team-1', stadiumId: 'stadium-apple-field', hasSeedParkFactors: true }],
    salaryBaseline: {
      calculationVersion: 'salary-baseline-v1',
      playerCount: 1,
      salariedPlayerCount: 1,
      totalSalary: 8.5,
      teamPayrolls: { 'team-1': 8.5 },
    },
  });
  mocks.getAllFranchisePlayers.mockResolvedValue([makePlayer()]);
  mocks.getAllFranchiseTeams.mockResolvedValue([makeTeam()]);
  mocks.getAllBattingStats.mockResolvedValue([{
    seasonId: 'season-1',
    playerId: 'player-1',
    playerName: 'Canon Input',
    teamId: 'team-1',
    games: 1,
    pa: 4,
    ab: 4,
    hits: 2,
    singles: 1,
    doubles: 1,
    triples: 0,
    homeRuns: 0,
    rbi: 1,
    runs: 1,
    walks: 0,
    strikeouts: 1,
    hitByPitch: 0,
    sacFlies: 0,
    sacBunts: 0,
    stolenBases: 1,
    caughtStealing: 0,
    gidp: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    bwar: 0.2,
    rwar: 0.1,
    fwar: 0.1,
    totalWar: 0.4,
    lastUpdated: 1,
  }]);
  mocks.getAllPitchingStats.mockResolvedValue([]);
  mocks.getAllFieldingStats.mockResolvedValue([{
    seasonId: 'season-1',
    playerId: 'player-1',
    playerName: 'Canon Input',
    teamId: 'team-1',
    games: 1,
    putouts: 2,
    assists: 1,
    errors: 0,
    doublePlays: 1,
    gamesByPosition: { SS: 1 },
    putoutsByPosition: { SS: 2 },
    assistsByPosition: { SS: 1 },
    errorsByPosition: { SS: 0 },
    lastUpdated: 1,
  }]);
  mocks.getSeasonMetadata.mockResolvedValue({
    seasonId: 'season-1',
    seasonNumber: 1,
    seasonName: 'Season 1',
    status: 'active',
    startDate: 1,
    gamesPlayed: 0,
    totalGames: 0,
  });
  mocks.getAllGamesByFranchise.mockResolvedValue([]);
  mocks.getRecentGames.mockResolvedValue([]);
  mocks.getGameHeadersForScope.mockResolvedValue([]);
  mocks.getTrustedValueArtifact.mockResolvedValue(null);
}

describe('franchise value input contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedBaseMocks();
  });

  test('uses stored games-per-team and innings metadata even when manual schedule rows are empty', async () => {
    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(report.seasonContext.gamesPerTeam).toBe(24);
    expect(report.seasonContext.inningsPerGame).toBe(6);
    expect(report.seasonContext.scheduleRowCount).toBe(0);
    expect(report.seasonContext.scheduleRowsUsedAsSeasonLength).toBe(false);
    expect(mocks.getAllGamesByFranchise).toHaveBeenCalledWith('franchise-1', 1);
  });

  test('tracks nonzero manual schedule rows separately from stored season length', async () => {
    mocks.getAllGamesByFranchise.mockResolvedValue([
      { id: 'g1' },
      { id: 'g2' },
      { id: 'g3' },
    ]);
    mocks.getSeasonMetadata.mockResolvedValue({
      seasonId: 'season-1',
      seasonNumber: 1,
      seasonName: 'Season 1',
      status: 'active',
      startDate: 1,
      gamesPlayed: 0,
      totalGames: 3,
    });

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    expect(report.seasonContext.gamesPerTeam).toBe(24);
    expect(report.seasonContext.inningsPerGame).toBe(6);
    expect(report.seasonContext.scheduleRowCount).toBe(3);
    expect(report.seasonContext.seasonMetadataTotalGames).toBe(3);
    expect(report.seasonContext.scheduleRowsUsedAsSeasonLength).toBe(false);
  });

  test('returns salary, stadium, WAR/WPA flags, and explicit limitations', async () => {
    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    const row = report.rows[0];
    expect(row.salary).toBe(8.5);
    expect(row.contractYears).toBe(2);
    expect(row.salaryBaselineCalculationVersion).toBe('salary-baseline-v1');
    expect(row.teamSalaryBaseline).toBe(8.5);
    expect(row.salaryBaselineAvailable).toBe(true);
    expect(row.stadiumId).toBe('stadium-apple-field');
    expect(row.parkFactorAvailability).toEqual(expect.objectContaining({
      stadiumIdAvailable: true,
      seedParkFactorsAvailable: true,
      customParkFactorsAvailable: false,
      status: 'seed-only',
      parkAdjustedValueInputsAvailable: false,
    }));
    expect(row.seasonStatsAvailability).toEqual({ batting: true, pitching: false, fielding: true, any: true });
    expect(row.warInputAvailability).toEqual(expect.objectContaining({
      battingWar: true,
      baserunningWar: true,
      fieldingWar: true,
      trustedForFinalValue: false,
    }));
    expect(row.warPreviewValues).toEqual({
      battingWar: 0.2,
      pitchingWar: null,
      fieldingWar: 0.1,
      baserunningWar: 0.1,
      totalWar: 0.4,
      totalWarSource: 'stat-row',
      trustedForFinalValue: false,
    });
    expect(row.wpaInputAvailability).toEqual({
      playerWpa: false,
      managerWpa: false,
      archiveBacked: false,
      trustedForFinalValue: false,
    });
    expect(row.limitations.join(' ')).toContain('Final True Value and dynamic designations are not calculated');
    expect(row.limitations.join(' ')).toContain('WAR preview values are read-only scoped season-stat inputs');
    expect(row.warInputAvailability.trustedForFinalValue).toBe(false);
    expect(row.warPreviewValues.trustedForFinalValue).toBe(false);
    expect(row.warConsumerTrust).toMatchObject({
      teamMvpDesignations: false,
      aceDesignations: false,
      trueValue: false,
      awards: false,
      salaryMovement: false,
      morale: false,
      mode3Handoff: false,
    });
    expect(row.warConsumerTrust?.blockers.join(' ')).toMatch(/completed GameTracker archive evidence/i);
  });

  test('derives valuePosition from completed-game starting-lineup replay instead of profile primary', async () => {
    mocks.getAllFranchisePlayers.mockResolvedValue([makePlayer({
      id: 'effective-ss',
      primaryPosition: '2B',
    })]);
    mocks.getGameHeadersForScope.mockResolvedValue([
      header('ep1-1', 1, [starter('effective-ss', 'SS')]),
      header('ep1-2', 2, [starter('effective-ss', 'SS')]),
    ]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(mocks.getGameHeadersForScope).toHaveBeenCalledWith({
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      isComplete: true,
    });
    expect(report.rows[0]).toMatchObject({
      playerId: 'effective-ss',
      valuePosition: 'SS',
      trueValuePositioning: {
        effectivePosition: 'SS',
        poolPosition: 'SS',
        starts: 2,
        currentTeamStarts: 2,
        startsSource: 'game-header-starting-lineups',
      },
    });
  });

  test('excludes sub-only fielding and bench data from effective-position plurality', async () => {
    mocks.getAllFranchisePlayers.mockResolvedValue([makePlayer({
      id: 'sub-only',
      primaryPosition: '2B',
    })]);
    mocks.getAllFieldingStats.mockResolvedValue([{
      seasonId: 'season-1',
      playerId: 'sub-only',
      playerName: 'Sub Only',
      teamId: 'team-1',
      games: 8,
      putouts: 12,
      assists: 10,
      errors: 1,
      doublePlays: 3,
      gamesByPosition: { SS: 8 },
      putoutsByPosition: { SS: 12 },
      assistsByPosition: { SS: 10 },
      errorsByPosition: { SS: 1 },
      lastUpdated: 1,
    }]);
    mocks.getGameHeadersForScope.mockResolvedValue([
      {
        ...header('bench-only', 1, [starter('other-player', 'SS')]),
        benchRosters: {
          away: [],
          home: [{ playerId: 'sub-only', playerName: 'Sub Only', positions: ['SS'] }],
        },
      },
    ]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(report.rows[0]).toMatchObject({
      playerId: 'sub-only',
      valuePosition: '2B',
      trueValuePositioning: {
        starts: 0,
        teamCompletedGames: 1,
        valuationMode: 'reserve',
        poolPosition: 'RESERVE',
      },
    });
  });

  test('anchors zero-start Two Way (IF) holders to 2B for True Value inputs', async () => {
    mocks.getAllFranchisePlayers.mockResolvedValue([makePlayer({
      id: 'two-way-if',
      primaryPosition: 'SP/RP',
      trait1: 'Two Way (IF)',
    })]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(report.rows[0]).toMatchObject({
      playerId: 'two-way-if',
      valuePosition: '2B',
      trueValuePositioning: {
        valuationMode: 'two-way-composite',
        twoWayTrait: 'Two Way (IF)',
        twoWayBatPosition: '2B',
        twoWayArmPosition: 'SP/RP',
      },
    });
  });

  test('trusts scoped WAR only for TEAM_MVP or ACE designation input gates when completed archive evidence exists', async () => {
    mocks.getRecentGames.mockResolvedValue([{
      gameId: 'completed-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      franchiseId: 'franchise-1',
      aggregationStatus: 'aggregated',
    }]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    const row = report.rows[0];
    expect(row.warConsumerTrust).toMatchObject({
      teamMvpDesignations: true,
      aceDesignations: false,
      fanFavoriteAlbatrossDesignations: false,
      awards: false,
      salaryMovement: false,
      trueValue: false,
      morale: false,
      mode3Handoff: false,
    });
    expect(row.warInputAvailability.trustedForFinalValue).toBe(false);
    expect(row.warPreviewValues.trustedForFinalValue).toBe(false);
    expect(row.limitations.join(' ')).toMatch(/Scoped WAR is trusted only for TEAM_MVP\/ACE/i);
  });

  test('combines persisted batting total WAR with persisted pitching WAR for True Value input rows', async () => {
    mocks.getAllPitchingStats.mockResolvedValue([{
      seasonId: 'season-1',
      playerId: 'player-1',
      playerName: 'Canon Input',
      teamId: 'team-1',
      games: 1,
      gamesStarted: 1,
      outsRecorded: 18,
      hitsAllowed: 4,
      runsAllowed: 1,
      earnedRuns: 1,
      walksAllowed: 1,
      strikeouts: 5,
      homeRunsAllowed: 0,
      hitBatters: 0,
      wildPitches: 0,
      wins: 1,
      losses: 0,
      saves: 0,
      holds: 0,
      blownSaves: 0,
      qualityStarts: 1,
      completeGames: 0,
      shutouts: 0,
      noHitters: 0,
      perfectGames: 0,
      fameBonuses: 0,
      fameBoners: 0,
      fameNet: 0,
      pwar: 0.7,
      lastUpdated: 1,
    }]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    expect(report.rows[0].warPreviewValues).toEqual({
      battingWar: 0.2,
      pitchingWar: 0.7,
      fieldingWar: 0.1,
      baserunningWar: 0.1,
      totalWar: 1.1,
      totalWarSource: 'stat-row',
      trustedForFinalValue: false,
    });
    expect(report.rows[0].warConsumerTrust?.trueValue).toBe(false);
  });

  test('derives total WAR preview only from existing finite component values when no stat-row total is present', async () => {
    mocks.getAllBattingStats.mockResolvedValue([{
      seasonId: 'season-1',
      playerId: 'player-1',
      playerName: 'Canon Input',
      teamId: 'team-1',
      games: 1,
      pa: 4,
      ab: 4,
      hits: 2,
      singles: 1,
      doubles: 1,
      triples: 0,
      homeRuns: 0,
      rbi: 1,
      runs: 1,
      walks: 0,
      strikeouts: 1,
      hitByPitch: 0,
      sacFlies: 0,
      sacBunts: 0,
      stolenBases: 1,
      caughtStealing: 0,
      gidp: 0,
      fameBonuses: 0,
      fameBoners: 0,
      fameNet: 0,
      bwar: 0.2,
      rwar: 0.1,
      fwar: 0.1,
      lastUpdated: 1,
    }]);
    mocks.getAllPitchingStats.mockResolvedValue([{
      seasonId: 'season-1',
      playerId: 'player-1',
      playerName: 'Canon Input',
      teamId: 'team-1',
      games: 1,
      gamesStarted: 1,
      outsRecorded: 18,
      hitsAllowed: 4,
      runsAllowed: 1,
      earnedRuns: 1,
      walksAllowed: 1,
      strikeouts: 5,
      homeRunsAllowed: 0,
      hitBatters: 0,
      wildPitches: 0,
      wins: 1,
      losses: 0,
      saves: 0,
      holds: 0,
      blownSaves: 0,
      qualityStarts: 1,
      completeGames: 0,
      shutouts: 0,
      noHitters: 0,
      perfectGames: 0,
      fameBonuses: 0,
      fameBoners: 0,
      fameNet: 0,
      pwar: 0.7,
      lastUpdated: 1,
    }]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    expect(report.rows[0].warPreviewValues).toEqual({
      battingWar: 0.2,
      pitchingWar: 0.7,
      fieldingWar: 0.1,
      baserunningWar: 0.1,
      totalWar: 1.1,
      totalWarSource: 'derived-from-components',
      trustedForFinalValue: false,
    });
    expect(report.rows[0].warInputAvailability.trustedForFinalValue).toBe(false);
  });

  test('leaves missing or invalid WAR preview numbers unavailable without changing final trust', async () => {
    mocks.getAllBattingStats.mockResolvedValue([{
      seasonId: 'season-1',
      playerId: 'player-1',
      playerName: 'Canon Input',
      teamId: 'team-1',
      games: 1,
      pa: 4,
      ab: 4,
      hits: 2,
      singles: 1,
      doubles: 1,
      triples: 0,
      homeRuns: 0,
      rbi: 1,
      runs: 1,
      walks: 0,
      strikeouts: 1,
      hitByPitch: 0,
      sacFlies: 0,
      sacBunts: 0,
      stolenBases: 0,
      caughtStealing: 0,
      gidp: 0,
      fameBonuses: 0,
      fameBoners: 0,
      fameNet: 0,
      bwar: Number.NaN,
      rwar: Number.POSITIVE_INFINITY,
      fwar: Number.NEGATIVE_INFINITY,
      totalWar: Number.NaN,
      lastUpdated: 1,
    }]);
    mocks.getAllPitchingStats.mockResolvedValue([{
      seasonId: 'season-1',
      playerId: 'player-1',
      playerName: 'Canon Input',
      teamId: 'team-1',
      games: 1,
      gamesStarted: 1,
      outsRecorded: 18,
      hitsAllowed: 4,
      runsAllowed: 1,
      earnedRuns: 1,
      walksAllowed: 1,
      strikeouts: 5,
      homeRunsAllowed: 0,
      hitBatters: 0,
      wildPitches: 0,
      wins: 1,
      losses: 0,
      saves: 0,
      holds: 0,
      blownSaves: 0,
      qualityStarts: 1,
      completeGames: 0,
      shutouts: 0,
      noHitters: 0,
      perfectGames: 0,
      fameBonuses: 0,
      fameBoners: 0,
      fameNet: 0,
      pwar: Number.NaN,
      lastUpdated: 1,
    }]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    expect(report.rows[0].warPreviewValues).toEqual({
      battingWar: null,
      pitchingWar: null,
      fieldingWar: null,
      baserunningWar: null,
      totalWar: null,
      totalWarSource: 'unavailable',
      trustedForFinalValue: false,
    });
    expect(report.rows[0].warInputAvailability.any).toBe(true);
    expect(report.rows[0].warInputAvailability.trustedForFinalValue).toBe(false);
    expect(report.rows[0].warConsumerTrust?.teamMvpDesignations).toBe(false);
    expect(report.rows[0].warConsumerTrust?.aceDesignations).toBe(false);
  });

  test('detects archive-backed WPA availability without trusting it for final value', async () => {
    mocks.getRecentGames.mockResolvedValue([{
      gameId: 'completed-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      franchiseId: 'franchise-1',
      aggregationStatus: 'aggregated',
      playerWpaTotals: [{
        playerId: 'player-1',
        playerName: 'Canon Input',
        teamId: 'team-1',
        totalWpa: 0.42,
        battingWpa: 0.42,
        pitchingWpa: 0,
        catchingWpa: 0,
        fieldingWpa: 0,
        baserunningWpa: 0,
        managingWpa: 0,
      }],
      managerWpaTotals: [{
        managerId: 'manager-1',
        managerName: 'Manager Input',
        teamId: 'team-1',
        tacticalManagerWpa: 0.2,
        deploymentWpa: 0.1,
        lineupDeltaWpa: 0.05,
        managerValue: 0.35,
      }],
    }]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    expect(mocks.getRecentGames).toHaveBeenCalledWith(500, {
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
    });
    expect(report.rows[0].wpaInputAvailability).toEqual({
      playerWpa: true,
      managerWpa: true,
      archiveBacked: true,
      trustedForFinalValue: false,
    });
    expect(report.rows[0].limitations.join(' ')).toContain('WPA and Manager WPA are not promoted');
  });

  test('does not calculate or persist True Value or dynamic designations', async () => {
    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    expect(report.trueValuePolicy).toEqual({
      finalTrueValueCalculated: false,
      persistedTrueValueCreated: false,
    });
    expect(report.designationPolicy).toEqual({
      finalDesignationsCalculated: false,
      persistedDesignationRecordsCreated: false,
      inventedDesignationTypes: [],
    });
    expect(JSON.stringify(report)).not.toContain('Captain');
    expect(JSON.stringify(report)).not.toContain('Fan Hopeful');
  });

  test('reports missing season metadata and team payroll baselines without treating schedule rows as season length', async () => {
    mocks.getFranchiseConfig.mockResolvedValue({
      franchiseId: 'franchise-1',
      league: 'league-1',
      season: {},
      salaryBaseline: {
        calculationVersion: 'salary-baseline-v1',
        playerCount: 1,
        salariedPlayerCount: 1,
        totalSalary: 8.5,
        teamPayrolls: {},
      },
    });
    mocks.getAllGamesByFranchise.mockResolvedValue([{ id: 'manual-1' }]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    expect(report.seasonContext.gamesPerTeam).toBeNull();
    expect(report.seasonContext.inningsPerGame).toBeNull();
    expect(report.seasonContext.seasonLengthSource).toBe('missing');
    expect(report.seasonContext.scheduleRowCount).toBe(1);
    expect(report.seasonContext.scheduleRowsUsedAsSeasonLength).toBe(false);
    expect(report.rows[0].teamSalaryBaseline).toBeNull();
    expect(report.rows[0].limitations).toEqual(expect.arrayContaining([
      'Stored season length or innings metadata is missing.',
      'Team payroll baseline is missing for this player/team.',
    ]));
  });

  test('reports FARM players as assigned and free agents or unassigned players as unavailable for team context', async () => {
    mocks.getAllFranchisePlayers.mockResolvedValue([
      makePlayer({ id: 'farm-player', leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }] }),
      makePlayer({ id: 'free-agent', leagueAssignments: [{ leagueId: 'league-1', rosterStatus: 'FREE_AGENT' }] }),
      makePlayer({ id: 'unassigned', leagueAssignments: [] }),
    ]);
    mocks.getAllBattingStats.mockResolvedValue([]);
    mocks.getAllFieldingStats.mockResolvedValue([]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    const farm = report.rows.find((row) => row.playerId === 'farm-player');
    const freeAgent = report.rows.find((row) => row.playerId === 'free-agent');
    const unassigned = report.rows.find((row) => row.playerId === 'unassigned');

    expect(farm).toEqual(expect.objectContaining({ currentTeamId: 'team-1', rosterStatus: 'FARM' }));
    expect(freeAgent).toEqual(expect.objectContaining({ currentTeamId: null, rosterStatus: null }));
    expect(unassigned).toEqual(expect.objectContaining({ currentTeamId: null, rosterStatus: null }));
    expect(farm?.warInputAvailability.trustedForFinalValue).toBe(false);
    expect(farm?.warPreviewValues.trustedForFinalValue).toBe(false);
    expect(farm?.warConsumerTrust?.teamMvpDesignations).toBe(false);
    expect(farm?.warConsumerTrust?.aceDesignations).toBe(false);
    expect(freeAgent?.warInputAvailability.trustedForFinalValue).toBe(false);
    expect(unassigned?.warInputAvailability.trustedForFinalValue).toBe(false);
    expect(freeAgent?.limitations).toContain('Current franchise team assignment is unavailable.');
    expect(unassigned?.limitations).toContain('Current franchise team assignment is unavailable.');
  });

  test('hidden FARM prospect salary rows use public draft/scouting context instead of true rating salary', async () => {
    mocks.getFranchiseConfig.mockResolvedValue({
      franchiseId: 'franchise-1',
      league: 'league-1',
      seasonLength: { gamesPerTeam: 24, inningsPerGame: 6 },
      salaryBaseline: {
        calculationVersion: 'salary-baseline-v1',
        teamPayrolls: { 'team-1': 3999.57 },
      },
    });
    mocks.getAllFranchisePlayers.mockResolvedValue([
      makePlayer({
        id: 'hidden-high',
        firstName: 'Hidden',
        lastName: 'High',
        salary: 42,
        power: 99,
        contact: 99,
        speed: 99,
        fielding: 99,
        arm: 99,
        overallGrade: 'A',
        ratingRevealState: 'hidden',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
        prospectProfile: {
          draftRound: 2,
          draftPick: 7,
          scoutedGrade: 'B',
          potentialGrade: 'A-',
          trueGrade: 'A',
        },
      } as Partial<Player> & Record<string, unknown>),
    ]);
    mocks.getAllBattingStats.mockResolvedValue([]);
    mocks.getAllPitchingStats.mockResolvedValue([]);
    mocks.getAllFieldingStats.mockResolvedValue([]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });
    const row = report.rows.find((candidate) => candidate.playerId === 'hidden-high');

    expect(row?.salary).toBe(3999.57);
    expect(row?.salaryBaselineAvailable).toBe(true);
    expect(row?.limitations).toContain(
      'Hidden FARM prospect salary uses draft/scouting-safe public context; true ratings and true grade are not salary inputs.',
    );
    expect(JSON.stringify(row)).not.toContain('42');
    expect(row?.warInputAvailability.trustedForFinalValue).toBe(false);
    expect(row?.warConsumerTrust?.teamMvpDesignations).toBe(false);
    expect(row?.warConsumerTrust?.aceDesignations).toBe(false);
  });

  test('classifies custom and missing stadium park-factor states as unavailable and unadjusted', async () => {
    mocks.getFranchiseConfig.mockResolvedValue({
      franchiseId: 'franchise-1',
      league: 'league-1',
      seasonLength: { gamesPerTeam: 24, inningsPerGame: 6 },
      salaryBaseline: {
        calculationVersion: 'salary-baseline-v1',
        teamPayrolls: { 'custom-team': 8.5, 'no-stadium-team': 8.5 },
      },
      stadiums: [
        { teamId: 'custom-team', stadiumId: 'custom-yard', hasSeedParkFactors: false },
      ],
    });
    mocks.getAllFranchiseTeams.mockResolvedValue([
      makeTeam({ id: 'custom-team', stadiumId: 'custom-yard', parkFactors: undefined }),
      makeTeam({ id: 'no-stadium-team', stadium: undefined, stadiumId: undefined, parkFactors: undefined }),
    ]);
    mocks.getAllFranchisePlayers.mockResolvedValue([
      makePlayer({ id: 'custom-player', leagueAssignments: [{ leagueId: 'league-1', teamId: 'custom-team', rosterStatus: 'MLB' }] }),
      makePlayer({ id: 'no-stadium-player', leagueAssignments: [{ leagueId: 'league-1', teamId: 'no-stadium-team', rosterStatus: 'MLB' }] }),
    ]);
    mocks.getAllBattingStats.mockResolvedValue([]);
    mocks.getAllFieldingStats.mockResolvedValue([]);

    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    const custom = report.rows.find((row) => row.playerId === 'custom-player');
    const missing = report.rows.find((row) => row.playerId === 'no-stadium-player');

    expect(custom?.parkFactorAvailability).toEqual(expect.objectContaining({
      stadiumIdAvailable: true,
      seedParkFactorsAvailable: false,
      status: 'custom-unavailable',
      parkAdjustedValueInputsAvailable: false,
    }));
    expect(missing?.parkFactorAvailability).toEqual(expect.objectContaining({
      stadiumIdAvailable: false,
      seedParkFactorsAvailable: false,
      status: 'unadjusted',
      parkAdjustedValueInputsAvailable: false,
    }));
  });

  test('computes True Value trust from the D6 artifact without promoting salary or morale', async () => {
    mocks.getTrustedValueArtifact.mockResolvedValue({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      contractVersion: 'd6-v1',
      peerPoolMinThreshold: 2,
      trustedPlayerIds: ['player-1'],
      blockedRows: [],
      rosterStateSnapshot: [],
      frozen: false,
      frozenAt: null,
      computedAt: 1,
    });

    const trusted = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(trusted.trueValuePolicy).toEqual({
      finalTrueValueCalculated: true,
      persistedTrueValueCreated: true,
    });
    expect(trusted.rows[0].warInputAvailability.trustedForFinalValue).toBe(true);
    expect(trusted.rows[0].warPreviewValues.trustedForFinalValue).toBe(true);
    expect(trusted.rows[0].warConsumerTrust).toEqual(expect.objectContaining({
      trueValue: true,
      salaryMovement: false,
      morale: false,
    }));

    mocks.getTrustedValueArtifact.mockResolvedValue({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      contractVersion: 'd6-v1',
      peerPoolMinThreshold: 2,
      trustedPlayerIds: [],
      blockedRows: [{ playerId: 'player-1', reasons: ['Position SS peer pool size 1 (< 2 required)'] }],
      rosterStateSnapshot: [],
      frozen: false,
      frozenAt: null,
      computedAt: 2,
    });

    const blocked = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(blocked.trueValuePolicy).toEqual({
      finalTrueValueCalculated: false,
      persistedTrueValueCreated: false,
    });
    expect(blocked.rows[0].warInputAvailability.trustedForFinalValue).toBe(false);
    expect(blocked.rows[0].warConsumerTrust).toEqual(expect.objectContaining({
      trueValue: false,
      salaryMovement: false,
      morale: false,
    }));
  });

  test('utility imports no storage write salary movement designation morale or expected-wins APIs', async () => {
    const source = readFileSync('src/utils/franchiseValueInputs.ts', 'utf8');
    const report = await buildFranchiseValueInputRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    });

    expect(source).not.toMatch(/save[A-Z]|set[A-Z]|persist[A-Z]|\bput\(|\bdelete\(|withInitialFranchiseSalary|recalculate|expectedWins|persistFranchiseDesignations|applyFranchiseMoraleEffect|confirmFranchiseRandomEvent/);
    expect(report.trueValuePolicy.finalTrueValueCalculated).toBe(false);
    expect(report.rows[0].warInputAvailability.trustedForFinalValue).toBe(false);
    expect(report.rows[0].warPreviewValues.trustedForFinalValue).toBe(false);
    expect(report.rows[0].warConsumerTrust?.trueValue).toBe(false);
  });
});
