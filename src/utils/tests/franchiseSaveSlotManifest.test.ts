import 'fake-indexeddb/auto';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
    upsertLocal: vi.fn(),
    removeLocal: vi.fn(),
  },
}));

import type { StoredFranchiseConfig } from '../../types/franchise';
import {
  deleteFranchiseSaveSlot,
  exportFranchiseSaveSlot,
  getFranchiseSaveSlotManifest,
  validateFranchiseSaveSlotImportPayload,
  validateFranchiseSaveSlot,
} from '../franchiseSaveSlotManifest';
import {
  createFranchise,
  importFranchise,
  listFranchises,
  saveFranchiseConfig,
  updateFranchiseMetadata,
} from '../franchiseManager';
import {
  saveFranchisePlayer,
  saveFranchiseTeam,
} from '../franchisePlayerStorage';
import { addGame } from '../scheduleStorage';
import { getOrCreateSeason } from '../seasonStorage';
import { getFranchiseSeasonId } from '../franchisePersistenceContract';
import { logMode2V1Transaction, logTransaction } from '../transactionStorage';
import { createPlayoff, createSeries } from '../playoffStorage';
import { startOffseason } from '../offseasonStorage';
import { saveFranchiseFarmRecord } from '../franchiseFarmStorage';
import { createGameHeader } from '../eventLog';
import { SYNC_REGISTRY } from '../syncConfig';
import { exportAllData, STATIC_DATABASE_SCHEMAS } from '../backupRestore';
import {
  commitFranchiseTransitionJournal,
  createFranchiseTransitionJournal,
  failFranchiseTransitionJournal,
  recordTransitionStaging,
} from '../franchiseTransitionJournal';
import { initFranchiseExpectedWinsBaselineDatabase } from '../franchiseExpectedWinsBaselineStorage';
import { initFranchiseMoraleDailySnapshotDatabase } from '../franchiseMoraleDailySnapshotStorage';
import { initFranchiseStadiumRecordsDatabase } from '../franchiseStadiumRecordsStorage';

let counter = 0;

function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

function makeConfig(franchiseId: string): StoredFranchiseConfig {
  return {
    franchiseId,
    createdAt: Date.now(),
    franchiseName: `Manifest ${franchiseId}`,
    league: 'manifest-league',
    leagueDetails: {
      name: 'Manifest League',
      teams: 2,
      conferences: 1,
      divisions: 1,
    },
    season: {
      gamesPerTeam: 1,
      inningsPerGame: 9,
      extraInningsRule: 'standard',
      scheduleType: 'balanced',
      useDH: true,
      allStarGame: false,
      tradeDeadline: false,
      mercyRule: false,
    },
    playoffs: {
      teamsQualifying: 2,
      format: 'conference',
      seriesLengths: {
        wildCard: 'best-of-3',
        divisionSeries: 'best-of-5',
        championship: 'best-of-7',
        worldSeries: 'best-of-7',
      },
      homeFieldAdvantage: 'higher-seed',
    },
    teams: {
      selectedTeams: ['team-a'],
      mode: 'single',
      playerAssignments: {},
    },
    roster: {
      mode: 'existing',
    },
  };
}

function makeTeam(teamId: string) {
  return {
    id: teamId,
    name: teamId === 'team-a' ? 'Alpha Club' : 'Bravo Club',
    abbreviation: teamId === 'team-a' ? 'ALP' : 'BRV',
    location: 'Manifest City',
    nickname: teamId === 'team-a' ? 'Alpha' : 'Bravo',
    colors: {
      primary: '#123456',
      secondary: '#abcdef',
    },
    stadium: `${teamId} Park`,
    leagueIds: ['manifest-league'],
    lineupWithDH: [],
    lineupWithoutDH: [],
    startingRotation: [],
  };
}

function makePlayer(playerId: string, teamId: string) {
  return {
    id: playerId,
    firstName: playerId,
    lastName: 'Player',
    gender: 'M' as const,
    jerseyNumber: 1,
    age: 27,
    bats: 'R' as const,
    throws: 'R' as const,
    primaryPosition: 'SS' as const,
    secondaryPosition: 'IF' as const,
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B' as const,
    personality: 'Competitive' as const,
    chemistry: 'Competitive' as const,
    morale: 50,
    mojo: 'Normal' as const,
    fame: 0,
    salary: 1_000_000,
    leagueAssignments: [
      {
        leagueId: 'manifest-league',
        teamId,
        rosterStatus: 'MLB' as const,
      },
    ],
    isCustom: true,
    sourceDatabase: 'manifest-test',
  };
}

async function seedHealthyFranchise(params: {
  seasonNumber?: number;
  teamPrefix?: string;
} = {}): Promise<{ franchiseId: string; seasonNumber: number; seasonId: string; teamPrefix: string }> {
  const seasonNumber = params.seasonNumber ?? 1;
  const teamPrefix = params.teamPrefix ?? nextId('team');
  const awayTeamId = `${teamPrefix}-a`;
  const homeTeamId = `${teamPrefix}-b`;
  const franchiseId = await createFranchise(nextId('manifest-franchise'));
  const seasonId = getFranchiseSeasonId(franchiseId, seasonNumber);

  await updateFranchiseMetadata(franchiseId, {
    leagueName: 'Manifest League',
    leagueId: 'manifest-league',
    controlledTeamId: awayTeamId,
    controlledTeamName: 'Alpha Club',
    currentSeason: seasonNumber,
  });
  await saveFranchiseConfig({
    ...makeConfig(franchiseId),
    teams: {
      selectedTeams: [awayTeamId],
      mode: 'single',
      playerAssignments: {},
    },
  });
  await saveFranchiseTeam(franchiseId, {
    ...makeTeam(awayTeamId),
    name: 'Alpha Club',
    abbreviation: 'ALP',
  });
  await saveFranchiseTeam(franchiseId, {
    ...makeTeam(homeTeamId),
    name: 'Bravo Club',
    abbreviation: 'BRV',
  });
  await saveFranchisePlayer(franchiseId, makePlayer(`${teamPrefix}-player-a`, awayTeamId));
  await saveFranchisePlayer(franchiseId, makePlayer(`${teamPrefix}-player-b`, homeTeamId));
  await addGame({
    franchiseId,
    seasonNumber,
    awayTeamId,
    homeTeamId,
  });
  await getOrCreateSeason(seasonId, seasonNumber, `Season ${seasonNumber}`, 1);

  return { franchiseId, seasonNumber, seasonId, teamPrefix };
}

function entry(report: Awaited<ReturnType<typeof validateFranchiseSaveSlot>>, id: string) {
  const found = report.entries.find((candidate) => candidate.manifestEntryId === id);
  expect(found).toBeDefined();
  return found!;
}

async function putTrackerRecord(storeName: string, record: Record<string, unknown>): Promise<void> {
  await putRecord('kbl-tracker', storeName, record);
}

async function putRecord(
  databaseName: string,
  storeName: string,
  record: Record<string, unknown>,
): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function getRecords(
  databaseName: string,
  storeName: string,
): Promise<Record<string, unknown>[]> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve((request.result || []) as Record<string, unknown>[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

function domain(
  payload: Awaited<ReturnType<typeof exportFranchiseSaveSlot>>,
  id: string,
) {
  const found = payload.domains.find((candidate) => candidate.manifestEntryId === id);
  expect(found).toBeDefined();
  return found!;
}

async function seedLifecycleRecords(params: {
  franchiseId: string;
  seasonNumber: number;
  seasonId: string;
  teamPrefix: string;
}): Promise<{ gameId: string; playoffId: string }> {
  const { franchiseId, seasonNumber, seasonId, teamPrefix } = params;
  const gameId = nextId(`${teamPrefix}-game`);
  const awayTeamId = `${teamPrefix}-a`;
  const homeTeamId = `${teamPrefix}-b`;
  const playerId = `${teamPrefix}-player-a`;
  const statsScopeId = seasonId;
  const scopeKey = `${franchiseId}:${seasonId}:${statsScopeId}:${seasonNumber}`;

  await putTrackerRecord('currentGame', {
    id: 'current',
    gameId: `${gameId}-current`,
    franchiseId,
    seasonNumber,
    seasonId,
    statsScopeId,
    competitionType: 'franchise',
    competitionId: franchiseId,
    scheduleGameId: `${gameId}-schedule`,
    awayTeamId,
    homeTeamId,
    awayTeamName: 'Alpha Club',
    homeTeamName: 'Bravo Club',
  });

  await putTrackerRecord('completedGames', {
    gameId,
    date: Date.now(),
    franchiseId,
    seasonNumber,
    seasonId,
    statsScopeId,
    competitionType: 'franchise',
    competitionId: franchiseId,
    scheduleGameId: `${gameId}-schedule`,
    awayTeamId,
    homeTeamId,
    awayTeamName: 'Alpha Club',
    homeTeamName: 'Bravo Club',
    finalScore: { away: 4, home: 3 },
    innings: 9,
    totalInnings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    activityLog: [],
    inningScores: [],
    aggregationStatus: 'aggregated',
  });

  await putTrackerRecord('playerSeasonBatting', {
    seasonId,
    playerId,
    teamId: awayTeamId,
    games: 1,
    atBats: 4,
    hits: 2,
  });
  await putTrackerRecord('playerCareerBatting', {
    playerId,
    teamId: awayTeamId,
    games: 1,
    hits: 2,
  });
  await putTrackerRecord('careerMilestones', {
    id: `${playerId}-milestone`,
    playerId,
    milestoneType: 'hits',
    achievedDate: Date.now(),
  });
  await putTrackerRecord('franchiseSeasonSummaries', {
    id: seasonId,
    franchiseId,
    seasonNumber,
    seasonId,
    statsScopeId: seasonId,
    schedule: { gameIds: [] },
  });

  await createGameHeader({
    gameId,
    seasonId,
    statsScopeId,
    competitionType: 'franchise',
    competitionId: franchiseId,
    franchiseId,
    scheduleGameId: `${gameId}-schedule`,
    date: Date.now(),
    awayTeamId,
    awayTeamName: 'Alpha Club',
    homeTeamId,
    homeTeamName: 'Bravo Club',
    finalScore: null,
    finalInning: 1,
    isComplete: false,
  });
  await putRecord('kbl-event-log', 'atBatEvents', {
    eventId: `${gameId}-ab-1`,
    gameId,
    eventIndex: 1,
    timestamp: Date.now(),
    batterId: playerId,
    pitcherId: `${teamPrefix}-pitcher`,
    result: '1B',
  });
  await putRecord('kbl-event-log', 'betweenPlayEvents', {
    eventId: `${gameId}-bp-1`,
    gameId,
    timestamp: Date.now(),
    type: 'substitution',
  });
  await putRecord('kbl-event-log', 'pitchingAppearances', {
    appearanceId: `${gameId}-pa-1`,
    gameId,
    pitcherId: `${teamPrefix}-pitcher`,
  });
  await putRecord('kbl-event-log', 'fieldingEvents', {
    fieldingEventId: `${gameId}-fielding-1`,
    gameId,
    playerId,
    playType: 'putout',
  });

  const playoff = await createPlayoff({
    seasonNumber,
    seasonId,
    status: 'IN_PROGRESS',
    teamsQualifying: 2,
    rounds: 1,
    gamesPerRound: [3],
    inningsPerGame: 9,
    useDH: true,
    leagues: ['Eastern'],
    conferenceChampionship: false,
    teams: [
      {
        teamId: awayTeamId,
        teamName: 'Alpha Club',
        seed: 1,
        league: 'Eastern',
        regularSeasonRecord: { wins: 1, losses: 0 },
        eliminated: false,
      },
      {
        teamId: homeTeamId,
        teamName: 'Bravo Club',
        seed: 2,
        league: 'Eastern',
        regularSeasonRecord: { wins: 0, losses: 1 },
        eliminated: false,
      },
    ],
    currentRound: 1,
    sourceType: 'franchise',
    franchiseId,
  });
  const series = await createSeries({
    playoffId: playoff.id,
    round: 1,
    roundName: 'Championship',
    higherSeed: { teamId: awayTeamId, teamName: 'Alpha Club', seed: 1 },
    lowerSeed: { teamId: homeTeamId, teamName: 'Bravo Club', seed: 2 },
    status: 'IN_PROGRESS',
    gamesRequired: 2,
    bestOf: 3,
    higherSeedWins: 0,
    lowerSeedWins: 0,
    games: [],
  });
  await putRecord('kbl-playoffs', 'playoffGames', {
    id: `${playoff.id}-game-1`,
    playoffId: playoff.id,
    seriesId: series.id,
    gameNumber: 1,
  });
  await putRecord('kbl-playoffs', 'playoffStats', {
    id: `${playoff.id}-${playerId}`,
    playoffId: playoff.id,
    playerId,
    playerName: 'Alpha Player',
    teamId: awayTeamId,
    games: 1,
  });

  await startOffseason(seasonId, seasonNumber, { franchiseId });
  await saveFranchiseFarmRecord({
    franchiseId,
    seasonId,
    seasonNumber,
    teamId: awayTeamId,
    playerId,
  });
  await logMode2V1Transaction({
    type: 'call_up',
    season: seasonNumber,
    phase: 'OFFSEASON',
    franchiseId,
    seasonId,
    statsScopeId,
    data: { playerId },
  });
  await initFranchiseExpectedWinsBaselineDatabase();
  await initFranchiseMoraleDailySnapshotDatabase();
  await initFranchiseStadiumRecordsDatabase();
  await putRecord('kbl-franchise-expected-wins-baselines', 'expectedWinsBaselineSnapshots', {
    id: `${teamPrefix}-expected-wins-baseline`,
    franchiseId,
    seasonId,
    statsScopeId,
    seasonNumber,
    teamId: awayTeamId,
    sourceKind: 'true-value-preview',
    expectedWinsPreviewContractVersion: 'test-expected-wins-v1',
    trueValuePreviewContractVersion: 'test-true-value-v1',
    expectedWinsEstimate: 1,
    status: 'preview-only',
    scopeKey,
    teamScopeKey: `${scopeKey}:${awayTeamId}`,
    identityKey: `${scopeKey}:${awayTeamId}:true-value-preview:test-true-value-v1:test-expected-wins-v1`,
  });
  await putRecord('kbl-franchise-morale-daily-snapshots', 'moraleDailySnapshots', {
    id: `${teamPrefix}-daily-morale-snapshot`,
    franchiseId,
    seasonId,
    statsScopeId,
    seasonNumber,
    targetType: 'team-fan',
    targetId: awayTeamId,
    teamId: awayTeamId,
    dateKey: '2026-06-04',
    openingValue: 50,
    closingValue: 51,
    highValue: 51,
    lowValue: 50,
    averageValue: 50.5,
    changeCount: 1,
    scopeKey,
    targetScopeKey: `${scopeKey}:team-fan:${awayTeamId}`,
    identityKey: `${scopeKey}:team-fan:${awayTeamId}:2026-06-04`,
  });
  await putRecord('kbl-franchise-stadium-records', 'stadiumRecords', {
    id: `${teamPrefix}-stadium-record`,
    franchiseId,
    seasonId,
    statsScopeId,
    seasonNumber,
    stadiumId: `${teamPrefix}-park`,
    stadiumName: 'Manifest Park',
    recordType: 'highest-team-runs-game',
    recordKey: `${gameId}-runs`,
    value: 4,
    valueLabel: '4 runs',
    leaderTeamIds: [awayTeamId],
    leaderPlayerIds: [playerId],
    leaderPlayerNames: [`${playerId} Player`],
    sourceGameIds: [gameId],
    evidenceIds: [`${gameId}:runs`],
    evidenceSummary: 'Manifest fixture stadium record.',
    scopeKey,
    stadiumScopeKey: `${scopeKey}:${teamPrefix}-park`,
    identityKey: `${scopeKey}:${teamPrefix}-park:highest-team-runs-game:${gameId}-runs`,
  });

  return { gameId, playoffId: playoff.id };
}

async function seedTransitionJournals(params: {
  franchiseId: string;
  seasonNumber: number;
}): Promise<{ pendingId: string; failedId: string; committedId: string; rolledBackId: string }> {
  const { franchiseId, seasonNumber } = params;
  const fromSeasonId = getFranchiseSeasonId(franchiseId, seasonNumber);
  const toSeasonId = getFranchiseSeasonId(franchiseId, seasonNumber + 1);

  const pending = await createFranchiseTransitionJournal({
    franchiseId,
    fromSeasonNumber: seasonNumber,
    toSeasonNumber: seasonNumber + 1,
    fromSeasonId,
    toSeasonId,
  });

  const failed = await createFranchiseTransitionJournal({
    franchiseId,
    fromSeasonNumber: seasonNumber,
    toSeasonNumber: seasonNumber + 1,
    fromSeasonId,
    toSeasonId,
  });
  await failFranchiseTransitionJournal(failed.id, 'testFailure', new Error('transition failed'));

  const committed = await createFranchiseTransitionJournal({
    franchiseId,
    fromSeasonNumber: seasonNumber,
    toSeasonNumber: seasonNumber + 1,
    fromSeasonId,
    toSeasonId,
  });
  await commitFranchiseTransitionJournal(committed.id);

  const rolledBack = await createFranchiseTransitionJournal({
    franchiseId,
    fromSeasonNumber: seasonNumber,
    toSeasonNumber: seasonNumber + 1,
    fromSeasonId,
    toSeasonId,
  });
  await recordTransitionStaging(rolledBack.id, {
    stagedScheduleIds: [],
    stagedSeasonMetadataId: toSeasonId,
  });
  await putRecord('kbl-franchise-transition-journal', 'transitionJournals', {
    ...rolledBack,
    stagedSeasonMetadataId: toSeasonId,
    status: 'rolled_back',
    rolledBackAt: Date.now(),
  });

  return {
    pendingId: pending.id,
    failedId: failed.id,
    committedId: committed.id,
    rolledBackId: rolledBack.id,
  };
}

describe('franchise save-slot manifest contract', () => {
  test('manifest includes all known required scoped-global hybrid domains', () => {
    const manifest = getFranchiseSaveSlotManifest();
    const ids = manifest.map((manifestEntry) => manifestEntry.id);

    expect(ids).toEqual(expect.arrayContaining([
      'franchise.metadata',
      'franchise.config',
      'franchise.players',
      'franchise.teams',
      'schedule.games',
      'game.completed',
      'game.headers',
      'game.current',
      'event.atBats',
      'event.betweenPlay',
      'event.pitchingAppearances',
      'event.fielding',
      'transactions',
      'season.metadata',
      'season.summary',
      'transition.journals',
      'season.stats.batting',
      'season.stats.pitching',
      'season.stats.fielding',
      'career.stats.batting',
      'career.stats.pitching',
      'career.stats.fielding',
      'playoff.configs',
      'playoff.series',
      'playoff.games',
      'playoff.stats',
      'offseason.state',
      'offseason.phaseData',
      'derived.standings',
      'narrative.context',
      'fanMorale',
      'expectedWinsBaselines',
      'dailyMoraleSnapshots',
      'stadiumRecords',
      'milestones',
      'designations',
      'derived.parkFactors',
      'leagueBuilder.templates',
      'farm',
      'localStorage.legacyMarkers',
    ]));

    expect(manifest).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'expectedWinsBaselines',
        databaseName: 'kbl-franchise-expected-wins-baselines',
        storeName: 'expectedWinsBaselineSnapshots',
        exportResponsibility: 'include',
        deleteResponsibility: 'delete-scoped',
      }),
      expect.objectContaining({
        id: 'dailyMoraleSnapshots',
        databaseName: 'kbl-franchise-morale-daily-snapshots',
        storeName: 'moraleDailySnapshots',
        exportResponsibility: 'include',
        deleteResponsibility: 'delete-scoped',
      }),
      expect.objectContaining({
        id: 'stadiumRecords',
        databaseName: 'kbl-franchise-stadium-records',
        storeName: 'stadiumRecords',
        exportResponsibility: 'include',
        deleteResponsibility: 'delete-scoped',
      }),
    ]));

    for (const manifestEntry of manifest) {
      expect(manifestEntry.databaseName).toBeTruthy();
      expect(manifestEntry.storeName).toBeTruthy();
      expect(manifestEntry.ownerKind).toBeTruthy();
      expect(manifestEntry.validationStrategy).toBeTruthy();
      expect(manifestEntry.exportResponsibility).toBeTruthy();
      expect(manifestEntry.deleteResponsibility).toBeTruthy();
      if (manifestEntry.lifecycle !== 'excluded') {
        expect(Array.isArray(manifestEntry.requiredScopeKeys)).toBe(true);
      }
    }
  });

  test('validation passes for a healthy seeded franchise with supported empty optional domains', async () => {
    const { franchiseId, seasonId } = await seedHealthyFranchise();

    const report = await validateFranchiseSaveSlot(franchiseId);

    expect(report.status).toBe('valid');
    expect(report.seasonId).toBe(seasonId);
    expect(entry(report, 'franchise.metadata')).toMatchObject({ status: 'pass', recordCount: 1 });
    expect(entry(report, 'franchise.config')).toMatchObject({ status: 'pass', recordCount: 1 });
    expect(entry(report, 'franchise.players')).toMatchObject({ status: 'pass', recordCount: 2 });
    expect(entry(report, 'franchise.teams')).toMatchObject({ status: 'pass', recordCount: 2 });
    expect(entry(report, 'schedule.games')).toMatchObject({ status: 'pass', recordCount: 1 });
    expect(entry(report, 'season.metadata')).toMatchObject({ status: 'pass', recordCount: 1 });
    expect(entry(report, 'game.completed')).toMatchObject({ status: 'pass', recordCount: 0 });
    expect(entry(report, 'event.atBats')).toMatchObject({ status: 'pass', recordCount: 0 });
    expect(entry(report, 'season.summary')).toMatchObject({ status: 'pass', recordCount: 0 });
    expect(entry(report, 'transition.journals')).toMatchObject({ status: 'pass', recordCount: 0 });
    expect(report.summary.requiredFailed).toBe(0);
    expect(report.summary.optionalEmpty).toBeGreaterThan(0);
  });

  test('validation flags missing core metadata, config, roster, schedule, and season data', async () => {
    const franchiseId = nextId('missing-franchise');

    const report = await validateFranchiseSaveSlot(franchiseId);

    expect(report.status).toBe('invalid');
    const failedIds = report.entries
      .filter((validationEntry) => validationEntry.status === 'fail')
      .map((validationEntry) => validationEntry.manifestEntryId);

    expect(failedIds).toEqual(expect.arrayContaining([
      'franchise.metadata',
      'franchise.config',
      'franchise.players',
      'franchise.teams',
      'schedule.games',
      'season.metadata',
    ]));
  });

  test('validation treats optional empty domains as supported, not failed required data', async () => {
    const { franchiseId } = await seedHealthyFranchise();

    const report = await validateFranchiseSaveSlot(franchiseId);

    expect(entry(report, 'playoff.configs')).toMatchObject({ status: 'pass', recordCount: 0 });
    expect(entry(report, 'offseason.state')).toMatchObject({ status: 'pass', recordCount: 0 });
    expect(entry(report, 'transactions')).toMatchObject({ status: 'pass', recordCount: 0 });
    expect(entry(report, 'leagueBuilder.templates')).toMatchObject({ status: 'skipped' });
    expect(entry(report, 'farm')).toMatchObject({ status: 'pass', recordCount: 0 });
    expect(entry(report, 'transition.journals')).toMatchObject({ status: 'pass', recordCount: 0 });
    expect(report.summary.requiredFailed).toBe(0);
  });

  test('validation reports pending and failed transition journals without blocking export', async () => {
    const seeded = await seedHealthyFranchise({
      seasonNumber: 14,
      teamPrefix: nextId('transition-validation'),
    });
    await seedTransitionJournals(seeded);

    const report = await validateFranchiseSaveSlot(seeded.franchiseId);

    expect(report.status).toBe('warning');
    expect(entry(report, 'transition.journals')).toMatchObject({
      status: 'warning',
      recordCount: 4,
    });
    expect(entry(report, 'transition.journals').messages.join(' ')).toContain(
      '2 pending/failed transition journal(s)',
    );
  });

  test('validation respects scoped-global hybrid boundaries for same-number franchise seasons', async () => {
    const franchiseA = await seedHealthyFranchise({ seasonNumber: 3, teamPrefix: nextId('scope-a') });
    const franchiseB = await seedHealthyFranchise({ seasonNumber: 3, teamPrefix: nextId('scope-b') });

    await logMode2V1Transaction({
      type: 'trade',
      season: 3,
      phase: 'REGULAR_SEASON',
      franchiseId: franchiseA.franchiseId,
      seasonId: franchiseA.seasonId,
      statsScopeId: franchiseA.seasonId,
      data: { note: 'A only' },
    });
    await logMode2V1Transaction({
      type: 'release',
      season: 3,
      phase: 'REGULAR_SEASON',
      franchiseId: franchiseB.franchiseId,
      seasonId: franchiseB.seasonId,
      statsScopeId: franchiseB.seasonId,
      data: { note: 'B only' },
    });

    const reportA = await validateFranchiseSaveSlot(franchiseA.franchiseId);
    const reportB = await validateFranchiseSaveSlot(franchiseB.franchiseId);

    expect(reportA.status).toBe('valid');
    expect(reportB.status).toBe('valid');
    expect(entry(reportA, 'schedule.games')).toMatchObject({ recordCount: 1 });
    expect(entry(reportB, 'schedule.games')).toMatchObject({ recordCount: 1 });
    expect(entry(reportA, 'transactions')).toMatchObject({ recordCount: 1 });
    expect(entry(reportB, 'transactions')).toMatchObject({ recordCount: 1 });
    expect(reportA.seasonId).not.toBe(reportB.seasonId);
  });

  test('same-season unscoped global records are warnings and are not counted as franchise-owned', async () => {
    const seasonNumber = 12;
    const { franchiseId } = await seedHealthyFranchise({
      seasonNumber,
      teamPrefix: nextId('ambiguous-global'),
    });

    await addGame({
      seasonNumber,
      awayTeamId: 'global-away',
      homeTeamId: 'global-home',
    });
    await putTrackerRecord('completedGames', {
      gameId: nextId('global-completed'),
      date: Date.now(),
      seasonId: `season-${seasonNumber}`,
      seasonNumber,
      awayTeamId: 'global-away',
      homeTeamId: 'global-home',
      awayTeamName: 'Global Away',
      homeTeamName: 'Global Home',
      finalScore: { away: 1, home: 2 },
      innings: 9,
      totalInnings: 9,
      fameEvents: [],
      playerStats: {},
      pitcherGameStats: [],
      activityLog: [],
      inningScores: [],
    });

    const report = await validateFranchiseSaveSlot(franchiseId);

    expect(report.status).toBe('warning');
    expect(entry(report, 'schedule.games')).toMatchObject({ status: 'warning', recordCount: 1 });
    expect(entry(report, 'game.completed')).toMatchObject({ status: 'warning', recordCount: 0 });
    expect(entry(report, 'game.completed').messages.join(' ')).toContain('legacy/ambiguous');
  });

  test('season-only transactions are warnings and are not counted as franchise-owned', async () => {
    const seasonNumber = 13;
    const { franchiseId } = await seedHealthyFranchise({
      seasonNumber,
      teamPrefix: nextId('ambiguous-transaction'),
    });

    await logTransaction({
      type: 'MANUAL_EDIT',
      season: seasonNumber,
      phase: 'REGULAR_SEASON',
      data: { note: 'legacy global transaction' },
    });

    const report = await validateFranchiseSaveSlot(franchiseId);

    expect(report.status).toBe('warning');
    expect(entry(report, 'transactions')).toMatchObject({ status: 'warning', recordCount: 0 });
    expect(entry(report, 'transactions').messages.join(' ')).toContain('legacy/ambiguous');
  });

  test('manifest-driven export includes owned per-franchise and scoped-global domains', async () => {
    const seeded = await seedHealthyFranchise({
      seasonNumber: 21,
      teamPrefix: nextId('export-owned'),
    });
    const other = await seedHealthyFranchise({
      seasonNumber: 21,
      teamPrefix: nextId('export-other'),
    });
    const owned = await seedLifecycleRecords({
      ...seeded,
      teamPrefix: seeded.teamPrefix,
    });
    const journalIds = await seedTransitionJournals(seeded);
    await seedLifecycleRecords({
      ...other,
      teamPrefix: other.teamPrefix,
    });
    await seedTransitionJournals(other);
    await putTrackerRecord('completedGames', {
      gameId: nextId('export-global-completed'),
      date: Date.now(),
      seasonNumber: seeded.seasonNumber,
      seasonId: `season-${seeded.seasonNumber}`,
      awayTeamId: 'global-away',
      homeTeamId: 'global-home',
      awayTeamName: 'Global Away',
      homeTeamName: 'Global Home',
      finalScore: { away: 1, home: 0 },
      innings: 9,
      fameEvents: [],
      playerStats: {},
      pitcherGameStats: [],
      activityLog: [],
      inningScores: [],
    });

    const payload = await exportFranchiseSaveSlot(seeded.franchiseId);

    expect(payload.kind).toBe('kbl-franchise-save-slot');
    expect(payload.manifestVersion).toBe(1);
    expect(payload.validation.franchiseId).toBe(seeded.franchiseId);
    expect(domain(payload, 'franchise.players').recordCount).toBe(2);
    expect(domain(payload, 'franchise.teams').recordCount).toBe(2);
    expect(domain(payload, 'schedule.games').recordCount).toBe(1);
    expect(domain(payload, 'season.metadata').recordCount).toBe(1);
    expect(domain(payload, 'game.completed').records.map((record) => (record as { gameId: string }).gameId)).toEqual([owned.gameId]);
    expect(domain(payload, 'game.headers').recordCount).toBe(1);
    expect(domain(payload, 'event.atBats').recordCount).toBe(1);
    expect(domain(payload, 'event.betweenPlay').recordCount).toBe(1);
    expect(domain(payload, 'event.pitchingAppearances').recordCount).toBe(1);
    expect(domain(payload, 'event.fielding').recordCount).toBe(1);
    expect(domain(payload, 'transactions').recordCount).toBe(1);
    expect(domain(payload, 'season.summary').recordCount).toBe(1);
    expect(domain(payload, 'transition.journals').recordCount).toBe(4);
    expect(
      domain(payload, 'transition.journals').records.map((record) => (record as { id: string }).id),
    ).toEqual(expect.arrayContaining(Object.values(journalIds)));
    expect(
      domain(payload, 'transition.journals').records.every(
        (record) => (record as { franchiseId: string }).franchiseId === seeded.franchiseId,
      ),
    ).toBe(true);
    expect(domain(payload, 'transition.journals').status).toBe('warning');
    expect(domain(payload, 'playoff.configs').records.map((record) => (record as { id: string }).id)).toEqual([owned.playoffId]);
    expect(domain(payload, 'playoff.series').recordCount).toBe(1);
    expect(domain(payload, 'playoff.games').recordCount).toBe(1);
    expect(domain(payload, 'playoff.stats').recordCount).toBe(1);
    expect(domain(payload, 'offseason.state').recordCount).toBe(1);
    expect(domain(payload, 'farm').recordCount).toBe(1);
    expect(domain(payload, 'expectedWinsBaselines').recordCount).toBe(1);
    expect(domain(payload, 'dailyMoraleSnapshots').recordCount).toBe(1);
    expect(domain(payload, 'stadiumRecords').recordCount).toBe(1);
    expect(domain(payload, 'leagueBuilder.templates')).toMatchObject({ recordCount: 0, status: 'skipped' });

    const exportedCompletedIds = new Set(
      domain(payload, 'game.completed').records.map((record) => (record as { gameId: string }).gameId),
    );
    expect(exportedCompletedIds.has('export-global-completed')).toBe(false);
    expect(
      domain(payload, 'game.completed').records.every(
        (record) => (record as { franchiseId: string }).franchiseId === seeded.franchiseId,
      ),
    ).toBe(true);
  });

  test('import payload validation accepts Wave A payload shape but manager import remains validate-only', async () => {
    const seeded = await seedHealthyFranchise({
      seasonNumber: 22,
      teamPrefix: nextId('import-plan'),
    });
    const payload = await exportFranchiseSaveSlot(seeded.franchiseId);

    const report = validateFranchiseSaveSlotImportPayload(payload);

    expect(report.status).toBe('valid');
    expect(report.franchiseId).toBe(seeded.franchiseId);
    expect(report.domainCounts['franchise.players']).toBe(2);

    const before = await listFranchises();
    await expect(
      importFranchise({
        text: async () => JSON.stringify(payload),
      } as Blob),
    ).rejects.toThrow('validate-only');
    const after = await listFranchises();

    expect(after.map((franchise) => franchise.id).sort()).toEqual(
      before.map((franchise) => franchise.id).sort(),
    );
  });

  test('playerId-only career stats and milestones are deferred from export/delete ownership', async () => {
    const sharedPrefix = nextId('shared-source-player');
    const franchiseA = await seedHealthyFranchise({ seasonNumber: 24, teamPrefix: sharedPrefix });
    const franchiseB = await seedHealthyFranchise({ seasonNumber: 24, teamPrefix: sharedPrefix });
    const sharedPlayerId = `${sharedPrefix}-player-a`;

    await putTrackerRecord('playerCareerBatting', {
      playerId: sharedPlayerId,
      teamId: `${sharedPrefix}-a`,
      games: 4,
      hits: 8,
    });
    await putTrackerRecord('careerMilestones', {
      id: `${sharedPlayerId}-milestone-shared`,
      playerId: sharedPlayerId,
      milestoneType: 'hits',
      achievedDate: Date.now(),
    });

    const exportA = await exportFranchiseSaveSlot(franchiseA.franchiseId);
    const exportB = await exportFranchiseSaveSlot(franchiseB.franchiseId);

    expect(domain(exportA, 'career.stats.batting')).toMatchObject({ status: 'skipped', recordCount: 0 });
    expect(domain(exportA, 'milestones')).toMatchObject({ status: 'skipped', recordCount: 0 });
    expect(domain(exportB, 'career.stats.batting')).toMatchObject({ status: 'skipped', recordCount: 0 });
    expect(domain(exportB, 'milestones')).toMatchObject({ status: 'skipped', recordCount: 0 });

    await deleteFranchiseSaveSlot(franchiseA.franchiseId);

    const careerRows = await getRecords('kbl-tracker', 'playerCareerBatting');
    const milestoneRows = await getRecords('kbl-tracker', 'careerMilestones');

    expect(careerRows.some((record) => record.playerId === sharedPlayerId)).toBe(true);
    expect(milestoneRows.some((record) => record.playerId === sharedPlayerId)).toBe(true);
    expect((await exportFranchiseSaveSlot(franchiseB.franchiseId)).franchiseId).toBe(franchiseB.franchiseId);
  });

  test('manifest-driven delete removes owned records and preserves unrelated modes/franchises', async () => {
    const seeded = await seedHealthyFranchise({
      seasonNumber: 23,
      teamPrefix: nextId('delete-owned'),
    });
    const other = await seedHealthyFranchise({
      seasonNumber: 23,
      teamPrefix: nextId('delete-other'),
    });
    const owned = await seedLifecycleRecords({
      ...seeded,
      teamPrefix: seeded.teamPrefix,
    });
    const unrelated = await seedLifecycleRecords({
      ...other,
      teamPrefix: other.teamPrefix,
    });
    await seedTransitionJournals(seeded);
    await seedTransitionJournals(other);
    await putTrackerRecord('completedGames', {
      gameId: nextId('delete-global-completed'),
      date: Date.now(),
      seasonNumber: seeded.seasonNumber,
      seasonId: `season-${seeded.seasonNumber}`,
      awayTeamId: 'global-away',
      homeTeamId: 'global-home',
      awayTeamName: 'Global Away',
      homeTeamName: 'Global Home',
      finalScore: { away: 1, home: 0 },
      innings: 9,
      fameEvents: [],
      playerStats: {},
      pitcherGameStats: [],
      activityLog: [],
      inningScores: [],
    });

    const report = await deleteFranchiseSaveSlot(seeded.franchiseId);

    expect(report.domains.find((candidate) => candidate.manifestEntryId === 'game.completed')).toMatchObject({
      recordCount: 1,
    });
    expect(report.domains.find((candidate) => candidate.manifestEntryId === 'event.atBats')).toMatchObject({
      recordCount: 1,
    });
    expect(report.domains.find((candidate) => candidate.manifestEntryId === 'playoff.configs')).toMatchObject({
      recordCount: 1,
    });
    expect(report.domains.find((candidate) => candidate.manifestEntryId === 'transition.journals')).toMatchObject({
      recordCount: 4,
      status: 'warning',
    });
    expect(report.domains.find((candidate) => candidate.manifestEntryId === 'expectedWinsBaselines')).toMatchObject({
      recordCount: 1,
    });
    expect(report.domains.find((candidate) => candidate.manifestEntryId === 'dailyMoraleSnapshots')).toMatchObject({
      recordCount: 1,
    });
    expect(report.domains.find((candidate) => candidate.manifestEntryId === 'stadiumRecords')).toMatchObject({
      recordCount: 1,
    });

    const completedGames = await getRecords('kbl-tracker', 'completedGames');
    expect(completedGames.some((record) => record.gameId === owned.gameId)).toBe(false);
    expect(completedGames.some((record) => record.gameId === unrelated.gameId)).toBe(true);
    expect(completedGames.some((record) => String(record.gameId).startsWith('delete-global-completed'))).toBe(true);

    const atBatEvents = await getRecords('kbl-event-log', 'atBatEvents');
    expect(atBatEvents.some((record) => record.gameId === owned.gameId)).toBe(false);
    expect(atBatEvents.some((record) => record.gameId === unrelated.gameId)).toBe(true);

    const playoffs = await getRecords('kbl-playoffs', 'playoffs');
    expect(playoffs.some((record) => record.id === owned.playoffId)).toBe(false);
    expect(playoffs.some((record) => record.id === unrelated.playoffId)).toBe(true);

    const transactions = await getRecords('kbl-transactions', 'transactions');
    expect(transactions.some((record) => record.franchiseId === seeded.franchiseId)).toBe(false);
    expect(transactions.some((record) => record.franchiseId === other.franchiseId)).toBe(true);

    const farmRecords = await getRecords('kbl-franchise-farm', 'franchiseFarmRecords');
    expect(farmRecords.some((record) => record.franchiseId === seeded.franchiseId)).toBe(false);
    expect(farmRecords.some((record) => record.franchiseId === other.franchiseId)).toBe(true);

    const transitionJournals = await getRecords('kbl-franchise-transition-journal', 'transitionJournals');
    expect(transitionJournals.some((record) => record.franchiseId === seeded.franchiseId)).toBe(false);
    expect(transitionJournals.some((record) => record.franchiseId === other.franchiseId)).toBe(true);

    const expectedWinsBaselines = await getRecords('kbl-franchise-expected-wins-baselines', 'expectedWinsBaselineSnapshots');
    expect(expectedWinsBaselines.some((record) => record.franchiseId === seeded.franchiseId)).toBe(false);
    expect(expectedWinsBaselines.some((record) => record.franchiseId === other.franchiseId)).toBe(true);

    const dailyMoraleSnapshots = await getRecords('kbl-franchise-morale-daily-snapshots', 'moraleDailySnapshots');
    expect(dailyMoraleSnapshots.some((record) => record.franchiseId === seeded.franchiseId)).toBe(false);
    expect(dailyMoraleSnapshots.some((record) => record.franchiseId === other.franchiseId)).toBe(true);

    const stadiumRecords = await getRecords('kbl-franchise-stadium-records', 'stadiumRecords');
    expect(stadiumRecords.some((record) => record.franchiseId === seeded.franchiseId)).toBe(false);
    expect(stadiumRecords.some((record) => record.franchiseId === other.franchiseId)).toBe(true);
  });

  test('backup and sync schemas cover manifest-owned shared stores and franchise roots', async () => {
    const seeded = await seedHealthyFranchise({
      seasonNumber: 25,
      teamPrefix: nextId('backup-franchise-root'),
    });

    expect(SYNC_REGISTRY['kbl-tracker']).toHaveProperty('franchiseSeasonSummaries', 'seasonId');
    expect(SYNC_REGISTRY['kbl-playoffs']).toHaveProperty('playoffGames', 'id');
    expect(SYNC_REGISTRY['kbl-franchise-farm']).toHaveProperty('franchiseFarmRecords', 'id');
    expect(SYNC_REGISTRY['kbl-franchise-random-events']).toHaveProperty('randomEventEntries', 'id');
    expect(SYNC_REGISTRY['kbl-franchise-morale']).toHaveProperty('moraleSnapshots', 'id');
    expect(SYNC_REGISTRY['kbl-franchise-expected-wins-baselines']).toHaveProperty(
      'expectedWinsBaselineSnapshots',
      'id',
    );
    expect(SYNC_REGISTRY['kbl-franchise-morale-daily-snapshots']).toHaveProperty('moraleDailySnapshots', 'id');
    expect(SYNC_REGISTRY['kbl-franchise-stadium-records']).toHaveProperty('stadiumRecords', 'id');
    expect(SYNC_REGISTRY['kbl-transactions']).toHaveProperty('transactions', 'id');
    expect(SYNC_REGISTRY['kbl-franchise-transition-journal']).toHaveProperty('transitionJournals', 'id');

    expect(STATIC_DATABASE_SCHEMAS['kbl-app-meta'].includedStores).toEqual(
      expect.arrayContaining(['franchiseList', 'franchiseConfigs', 'eliminationList']),
    );
    expect(STATIC_DATABASE_SCHEMAS['kbl-tracker'].stores).toHaveProperty('franchiseSeasonSummaries');
    expect(STATIC_DATABASE_SCHEMAS['kbl-playoffs'].stores).toHaveProperty('playoffGames');
    expect(STATIC_DATABASE_SCHEMAS['kbl-franchise-farm'].stores).toHaveProperty('franchiseFarmRecords');
    expect(STATIC_DATABASE_SCHEMAS['kbl-franchise-random-events'].stores).toHaveProperty('randomEventEntries');
    expect(STATIC_DATABASE_SCHEMAS['kbl-franchise-morale'].stores).toHaveProperty('moraleSnapshots');
    expect(STATIC_DATABASE_SCHEMAS['kbl-franchise-expected-wins-baselines'].stores).toHaveProperty(
      'expectedWinsBaselineSnapshots',
    );
    expect(STATIC_DATABASE_SCHEMAS['kbl-franchise-morale-daily-snapshots'].stores).toHaveProperty(
      'moraleDailySnapshots',
    );
    expect(STATIC_DATABASE_SCHEMAS['kbl-franchise-stadium-records'].stores).toHaveProperty('stadiumRecords');
    expect(STATIC_DATABASE_SCHEMAS['kbl-franchise-transition-journal'].stores).toHaveProperty('transitionJournals');
    expect(STATIC_DATABASE_SCHEMAS['kbl-transactions'].version).toBe(2);
    expect(STATIC_DATABASE_SCHEMAS['kbl-transactions'].stores.transactions.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'by_franchise' }),
        expect.objectContaining({ name: 'by_season_id' }),
        expect.objectContaining({ name: 'by_franchise_season' }),
      ]),
    );

    const backup = await exportAllData();
    expect(backup.databases['kbl-app-meta'].franchiseList).toEqual(
      expect.arrayContaining([expect.objectContaining({ franchiseId: seeded.franchiseId })]),
    );
    expect(backup.databases['kbl-app-meta'].franchiseConfigs).toEqual(
      expect.arrayContaining([expect.objectContaining({ franchiseId: seeded.franchiseId })]),
    );
    expect(backup.databases[`kbl-franchise-${seeded.franchiseId}`].players).toHaveLength(2);
    expect(backup.databases[`kbl-franchise-${seeded.franchiseId}`].teams).toHaveLength(2);
  });
});
