import 'fake-indexeddb/auto';

import { act, renderHook, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  __resetLeagueBuilderDatabaseForTests,
  createAuctionSessionId,
  createEmptyTeamRoster,
  createFarmAuctionSessionId,
  createMlbDraftSessionId,
  createStartupDraftSessionId,
  getAllPlayers,
  getAuctionSession,
  getAuctionSessionById,
  getLeagueTemplate,
  getMlbDraftSession,
  getPlayer,
  getRegisteredPool,
  getScoutProfilesForLeague,
  getStartupDraftSession,
  getTeam,
  getTeamRoster,
  getPlayersByTeam,
  initializeDefaultPresets,
  saveAuctionSession,
  saveAuctionSessionById,
  saveLeagueTemplate,
  saveMlbDraftSession,
  savePlayer,
  saveRegisteredPool,
  saveScoutProfile,
  saveStartupDraftSession,
  saveTeam,
  saveTeamRoster,
} from '../../../utils/leagueBuilderStorage';
import { DEFAULT_AUCTION_SETUP_CONFIG } from '../../../data/auctionEngineConstants';
import type { CpuShillAuctionSession } from '../../../engines/cpuShillBidding';
import type { RegisteredPool } from '../../../engines/leagueConstruction';
import { importRosteredPlayersToLeaguePool, isPlayerInLeaguePool } from '../../../utils/leagueBuilderPoolBuilder';
import { MLB_AUCTION_SEASON } from '../../../utils/leagueBuilderAuctionPipeline';
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Player,
  type Team,
} from '../useLeagueBuilderData';

const syncEngineMock = vi.hoisted(() => ({
  isSuppressed: vi.fn(() => true),
  upsert: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: syncEngineMock,
}));

const DB_NAME = 'kbl-league-builder';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

type TeamInput = Omit<Team, 'createdDate' | 'lastModified'> & { id: string };
type LeagueInput = Omit<LeagueTemplate, 'createdDate' | 'lastModified'> & { id: string };
type PlayerInput = Omit<Player, 'createdDate' | 'lastModified'> & { id: string };

function makeTeam(id: string, overrides: Partial<TeamInput> = {}): TeamInput {
  return {
    id,
    name: 'Scroll Safe Club',
    abbreviation: 'SSC',
    location: 'Test',
    nickname: 'Club',
    colors: { primary: '#111111', secondary: '#eeeeee' },
    stadium: 'Scroll Park',
    leagueIds: ['test-league'],
    ...overrides,
  };
}

function makeLeague(overrides: Partial<LeagueInput> = {}): LeagueInput {
  return {
    id: 'test-league',
    name: 'Test League',
    teamIds: ['team-a', 'team-b'],
    conferences: [
      { id: 'conf-a', name: 'Circuit', abbreviation: 'CIR', divisionIds: ['div-a'] },
    ],
    divisions: [
      { id: 'div-a', name: 'North', conferenceId: 'conf-a', teamIds: ['team-a', 'team-b'] },
    ],
    defaultRulesPreset: 'standard',
    tier: 'standard',
    salaryCap: 900_000,
    draftPoolMode: 'design-first',
    draftFormat: 'auction',
    poolSizeMultiplier: 1.5,
    draftSeats: [{ id: 'seat-you', name: 'You' }],
    balanceMode: 'taxed',
    checkpointCadence: 'standard',
    color: '#123456',
    logoUrl: 'https://example.test/logo.png',
    ...overrides,
  };
}

function makePlayer(id: string, overrides: Partial<PlayerInput> = {}): PlayerInput {
  return {
    id,
    firstName: 'Pool',
    lastName: id,
    gender: 'M',
    age: 26,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    secondaryPosition: 'LF',
    power: 70,
    contact: 70,
    speed: 70,
    fielding: 70,
    arm: 70,
    velocity: 20,
    junk: 20,
    accuracy: 20,
    arsenal: ['4F'],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Crafty',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 10_000,
    leagueAssignments: [],
    isCustom: true,
    ...overrides,
  };
}

function makeAuctionSession(seed: string): CpuShillAuctionSession {
  return {
    state: 'AUCTION_COMPLETE',
    config: { ...DEFAULT_AUCTION_SETUP_CONFIG, nominationOrderSeed: seed },
    teams: [],
    nominationOrder: [],
    nominationIndex: 0,
    nominationRound: 0,
    players: {},
    playerOrder: [],
    availablePlayerIds: [],
    currentLot: null,
    pendingClaim: null,
    results: [],
    saleCount: 0,
  };
}

function assignmentRows(player: Player | null) {
  return (player?.leagueAssignments ?? []).map(({ leagueId, teamId, rosterStatus }) => ({
    leagueId,
    teamId,
    rosterStatus,
  }));
}

async function seedPostDraftPoolFirstLeague() {
  const leagueId = 'postdraft-league';
  const teamAId = 'team-a';
  const teamBId = 'team-b';
  const wonAId = 'won-a';
  const wonBId = 'won-b';
  const unwonId = 'unwon-free-agent';
  const mintedFarmId = 'minted-farm';
  const candidateIds = [wonAId, wonBId, unwonId];

  await saveLeagueTemplate(makeLeague({
    id: leagueId,
    draftPoolMode: 'pool-first',
  }));
  await saveTeam(makeTeam(teamAId, { leagueIds: [leagueId] }));
  await saveTeam(makeTeam(teamBId, { leagueIds: [leagueId] }));
  await savePlayer(makePlayer(wonAId, {
    leagueAssignments: [{ leagueId, teamId: teamAId, rosterStatus: 'MLB' }],
  }));
  await savePlayer(makePlayer(wonBId, {
    leagueAssignments: [{ leagueId, teamId: teamBId, rosterStatus: 'MLB' }],
  }));
  await savePlayer(makePlayer(unwonId, {
    leagueAssignments: [{ leagueId, teamId: '', rosterStatus: 'FREE_AGENT' }],
  }));
  await savePlayer(makePlayer(mintedFarmId, {
    draftedAsFarmProspect: true,
    leagueAssignments: [{ leagueId, teamId: teamAId, rosterStatus: 'FARM' }],
  }));
  await saveTeamRoster({
    ...createEmptyTeamRoster(teamAId),
    mlbRoster: [wonAId],
    farmRoster: [mintedFarmId],
  });
  await saveTeamRoster({
    ...createEmptyTeamRoster(teamBId),
    mlbRoster: [wonBId],
  });
  await saveRegisteredPool({
    leagueId,
    tier: 'standard',
    balanceMode: 'taxed',
    players: candidateIds.map((id, index) => ({ id, iv: 100_000 + index, salary: 10_000 + index })),
    tierCap: 900_000,
    luxuryCaps: [],
    pickValueChart: [],
    totalSlots: candidateIds.length,
    poolSurplusWarning: false,
    locked: true,
    lockedAt: 1,
  });
  await saveAuctionSession({
    id: createAuctionSessionId(leagueId, MLB_AUCTION_SEASON),
    leagueId,
    seasonNumber: MLB_AUCTION_SEASON,
    seed: 'auction-postdraft',
    session: makeAuctionSession('auction-postdraft'),
  });

  return {
    leagueId,
    candidateIds,
    mintedFarmId,
  };
}

async function renderLoadedLeagueBuilderHook() {
  const hook = renderHook(() => useLeagueBuilderData());
  await waitFor(() => {
    expect(hook.result.current.isLoading).toBe(false);
  });
  return hook;
}

describe('useLeagueBuilderData', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    syncEngineMock.isSuppressed.mockReturnValue(true);
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  test('refresh reloads data without re-entering full-page loading state', async () => {
    const refreshLoadingStates: boolean[] = [];
    let trackRefreshRenders = false;

    const { result } = renderHook(() => {
      const data = useLeagueBuilderData();

      useEffect(() => {
        if (trackRefreshRenders) {
          refreshLoadingStates.push(data.isLoading);
        }
      }, [data.isLoading, data.teams]);

      return data;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.rulesPresets.length).toBeGreaterThan(0);
    });

    expect(result.current.teams.some((team) => team.id === 'scroll-safe-team')).toBe(false);

    await saveTeam(makeTeam('scroll-safe-team'));
    trackRefreshRenders = true;

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.teams.some((team) => team.id === 'scroll-safe-team')).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(refreshLoadingStates).not.toContain(true);
    expect(refreshLoadingStates.length).toBeGreaterThan(0);
  });

  test('C1-C3 duplicateLeague deep-copies teams, unlocks copied designs, and remaps league memberships', async () => {
    const lockedAt = '2026-07-03T12:00:00.000Z';
    await saveLeagueTemplate(makeLeague({
      poolExtractedAt: '2026-07-03T13:00:00.000Z',
      poolExtractedBasis: {
        cap: 900_000,
        poolSizeMultiplier: 1.5,
        identityByTeamId: { 'team-a': 'murderers-row', 'team-b': 'whiteyball' },
      },
      modeAExtractedIds: ['player-pinned'],
      modeAHandAdds: ['player-added'],
      modeAHandRemoves: ['player-removed'],
    }));
    await saveTeam(makeTeam('team-a', {
      name: 'Original A',
      abbreviation: 'OGA',
      leagueIds: ['test-league'],
      mlbArchetypeKey: 'murderers-row',
      farmArchetypeKey: 'whiteyball',
      gmSeatId: 'seat-you',
      gmSeatName: 'You',
      rosterDesign: {
        slots: [{ slotId: 'CF', kind: 'pos', position: 'CF' }],
        lockedAt,
        pins: { CF: 'player-pinned' },
        rankOverrides: { CF: ['player-pinned', 'player-backup'] },
      },
      lineupWithDH: [{ battingOrder: 1, playerId: 'drafted-player', fieldingPosition: 'CF' }],
      lineupWithoutDH: [{ battingOrder: 1, playerId: 'drafted-player', fieldingPosition: 'CF' }],
      startingRotation: ['drafted-pitcher'],
      optimalLineupVsRHPWithDH: {
        generatedAt: '2026-07-03T13:30:00.000Z',
        stale: false,
        lineup: [{ battingOrder: 1, playerId: 'drafted-player', fieldingPosition: 'CF' }],
        optimizationScore: 1,
        factors: { handedness: 'RHP', dhEnabled: true },
      },
    }));
    await saveTeam(makeTeam('team-b', {
      name: 'Original B',
      abbreviation: 'OGB',
      leagueIds: ['test-league'],
      gmSeatId: 'seat-you',
      gmSeatName: 'You',
      rosterDesign: {
        slots: [{ slotId: 'SS', kind: 'pos', position: 'SS' }],
        lockedAt,
        pins: { SS: 'player-shortstop' },
      },
    }));

    const originalTeamBefore = await getTeam('team-a');
    expect(originalTeamBefore).not.toBeNull();

    const { result } = await renderLoadedLeagueBuilderHook();
    let duplicate: LeagueTemplate | null = null;
    await act(async () => {
      duplicate = await result.current.duplicateLeague('test-league');
    });
    expect(duplicate).not.toBeNull();
    const copiedLeague = duplicate!;
    expect(copiedLeague.id).not.toBe('test-league');
    expect(copiedLeague.teamIds).toHaveLength(2);
    expect(copiedLeague.teamIds).not.toEqual(expect.arrayContaining(['team-a', 'team-b']));
    expect(copiedLeague.divisions[0]?.teamIds).toEqual(copiedLeague.teamIds);
    expect(copiedLeague.divisions[0]?.teamIds).not.toEqual(expect.arrayContaining(['team-a', 'team-b']));
    expect(copiedLeague.conferences[0]?.divisionIds).toEqual(['div-a']);

    expect(copiedLeague.poolExtractedAt).toBeUndefined();
    expect(copiedLeague.poolExtractedBasis).toBeUndefined();
    expect(copiedLeague.modeAExtractedIds).toBeUndefined();
    expect(copiedLeague.modeAHandAdds).toBeUndefined();
    expect(copiedLeague.modeAHandRemoves).toBeUndefined();
    expect(copiedLeague.draftPoolMode).toBe('design-first');
    expect(copiedLeague.draftFormat).toBe('auction');
    expect(copiedLeague.salaryCap).toBe(900_000);

    const copiedTeams = await Promise.all(copiedLeague.teamIds.map((teamId) => getTeam(teamId)));
    expect(copiedTeams.every(Boolean)).toBe(true);
    const copiedTeamA = copiedTeams.find((team) => team?.name === 'Original A');
    expect(copiedTeamA).toBeTruthy();
    expect(copiedTeamA?.leagueIds).toEqual([copiedLeague.id]);
    expect(copiedTeamA?.rosterDesign?.lockedAt).toBeUndefined();
    expect(copiedTeamA?.rosterDesign?.slots).toEqual([{ slotId: 'CF', kind: 'pos', position: 'CF' }]);
    expect(copiedTeamA?.rosterDesign?.pins).toEqual({ CF: 'player-pinned' });
    expect(copiedTeamA?.rosterDesign?.rankOverrides).toEqual({ CF: ['player-pinned', 'player-backup'] });
    expect(copiedTeamA?.lineupWithDH).toEqual([]);
    expect(copiedTeamA?.lineupWithoutDH).toEqual([]);
    expect(copiedTeamA?.startingRotation).toEqual([]);
    expect(copiedTeamA?.optimalLineupVsRHPWithDH).toBeUndefined();
    expect(copiedTeams.some((team) => team?.rosterDesign?.slots.length && !team.rosterDesign.lockedAt)).toBe(true);

    await act(async () => {
      await result.current.updateTeam({
        ...copiedTeamA!,
        rosterDesign: {
          slots: [{ slotId: '1B', kind: 'pos', position: '1B' }],
          pins: { '1B': 'copy-only-player' },
        },
      });
    });

    expect(await getTeam('team-a')).toEqual(originalTeamBefore);
    expect((await getTeam(copiedTeamA!.id))?.rosterDesign?.pins).toEqual({ '1B': 'copy-only-player' });
  });

  test('duplicateLeague remaps copied team rivalries and drops stale opponents', async () => {
    await saveLeagueTemplate(makeLeague());
    await saveTeam(makeTeam('team-a', {
      name: 'Rival A',
      rivalries: [
        { opponentTeamId: 'team-b', intensity: 8, origin: 'founding' },
        { opponentTeamId: 'foreign-team', intensity: 2, origin: 'stale-import' },
      ],
    }));
    await saveTeam(makeTeam('team-b', {
      name: 'Rival B',
      rivalries: [
        { opponentTeamId: 'team-a', intensity: 5, origin: 'division' },
      ],
    }));

    const originalTeamABefore = await getTeam('team-a');
    const originalTeamBBefore = await getTeam('team-b');
    expect(originalTeamABefore).not.toBeNull();
    expect(originalTeamBBefore).not.toBeNull();

    const { result } = await renderLoadedLeagueBuilderHook();
    let copiedLeague: LeagueTemplate | null = null;
    await act(async () => {
      copiedLeague = await result.current.duplicateLeague('test-league');
    });

    const originalToCopiedTeamId = new Map([
      ['team-a', copiedLeague!.teamIds[0]],
      ['team-b', copiedLeague!.teamIds[1]],
    ]);
    const copiedTeamA = await getTeam(originalToCopiedTeamId.get('team-a')!);
    const copiedTeamB = await getTeam(originalToCopiedTeamId.get('team-b')!);
    expect(copiedTeamA).not.toBeNull();
    expect(copiedTeamB).not.toBeNull();

    expect(copiedTeamA!.rivalries).toEqual([
      {
        opponentTeamId: originalToCopiedTeamId.get('team-b'),
        intensity: 8,
        origin: 'founding',
      },
    ]);
    expect(copiedTeamB!.rivalries).toEqual([
      {
        opponentTeamId: originalToCopiedTeamId.get('team-a'),
        intensity: 5,
        origin: 'division',
      },
    ]);
    expect(copiedTeamA!.rivalries?.map((rivalry) => rivalry.opponentTeamId)).not.toEqual(
      expect.arrayContaining(['team-a', 'team-b', 'foreign-team']),
    );
    expect(copiedTeamB!.rivalries?.map((rivalry) => rivalry.opponentTeamId)).not.toEqual(
      expect.arrayContaining(['team-a', 'team-b']),
    );
    expect(await getTeam('team-a')).toEqual(originalTeamABefore);
    expect(await getTeam('team-b')).toEqual(originalTeamBBefore);
  });

  test('C4 duplicateLeague does not copy league-id-keyed pools, sessions, or scouts', async () => {
    await saveLeagueTemplate(makeLeague());
    await saveTeam(makeTeam('team-a'));
    await saveTeam(makeTeam('team-b'));
    const originalPool: RegisteredPool = {
      leagueId: 'test-league',
      tier: 'standard',
      balanceMode: 'taxed',
      players: [{ id: 'pool-player', iv: 100_000, salary: 10_000 }],
      tierCap: 900_000,
      luxuryCaps: [],
      pickValueChart: [],
      totalSlots: 1,
      poolSurplusWarning: false,
      locked: true,
      lockedAt: 1,
    };
    await saveRegisteredPool(originalPool);
    await saveScoutProfile({
      id: 'scout-original',
      leagueId: 'test-league',
      teamId: 'team-a',
      name: 'Scout Original',
      specialties: ['CF'],
      weaknesses: ['CP'],
      accuracyByPosition: { CF: 80 },
      seed: 'scout-original',
    });
    await saveStartupDraftSession({
      id: createStartupDraftSessionId('test-league', 1),
      leagueId: 'test-league',
      seasonNumber: 1,
      seed: 'startup-original',
      workflowVersion: 'test',
      engineMethodVersion: 'test',
      scoutOrder: [],
      scoutPool: [],
      hiredScoutIdsByTeamId: {},
      prospectPickOrder: [],
      prospectPool: [],
      completedPicks: [],
      currentPickIndex: 0,
    });
    await saveMlbDraftSession({
      id: createMlbDraftSessionId('test-league', 1),
      leagueId: 'test-league',
      seasonNumber: 1,
      seed: 'mlb-draft-original',
      workflowVersion: 'test',
      engineMethodVersion: 'test',
      tier: 'standard',
      balanceMode: 'taxed',
      rounds: 1,
      pickOrder: [],
      completedPicks: [],
      currentPickIndex: 0,
    });
    await saveAuctionSession({
      id: createAuctionSessionId('test-league', 1),
      leagueId: 'test-league',
      seasonNumber: 1,
      seed: 'auction-original',
      session: makeAuctionSession('auction-original'),
    });
    await saveAuctionSessionById({
      id: createFarmAuctionSessionId('test-league', 1),
      leagueId: 'test-league',
      seasonNumber: 1,
      seed: 'farm-auction-original',
      session: makeAuctionSession('farm-auction-original'),
    });

    const { result } = await renderLoadedLeagueBuilderHook();
    let copiedLeague: LeagueTemplate | null = null;
    await act(async () => {
      copiedLeague = await result.current.duplicateLeague('test-league');
    });
    const copyId = copiedLeague!.id;

    await expect(getRegisteredPool(copyId)).resolves.toBeNull();
    await expect(getScoutProfilesForLeague(copyId)).resolves.toEqual([]);
    await expect(getStartupDraftSession(copyId, 1)).resolves.toBeNull();
    await expect(getMlbDraftSession(copyId, 1)).resolves.toBeNull();
    await expect(getAuctionSession(copyId, 1)).resolves.toBeNull();
    await expect(getAuctionSessionById(createFarmAuctionSessionId(copyId, 1))).resolves.toBeNull();

    await expect(getRegisteredPool('test-league')).resolves.toEqual(originalPool);
    await expect(getScoutProfilesForLeague('test-league')).resolves.toHaveLength(1);
    await expect(getStartupDraftSession('test-league', 1)).resolves.not.toBeNull();
    await expect(getMlbDraftSession('test-league', 1)).resolves.not.toBeNull();
    await expect(getAuctionSession('test-league', 1)).resolves.not.toBeNull();
    await expect(getAuctionSessionById(createFarmAuctionSessionId('test-league', 1))).resolves.not.toBeNull();
  });

  test('C5 pool-first duplicate can auto-import roster membership against the copied league id', async () => {
    await saveLeagueTemplate(makeLeague({
      draftPoolMode: 'pool-first',
      poolExtractedAt: undefined,
      modeAExtractedIds: undefined,
    }));
    await saveTeam(makeTeam('team-a'));
    await saveTeam(makeTeam('team-b'));
    await savePlayer(makePlayer('copy-pool-player', {
      leagueAssignments: [{ leagueId: 'test-league', teamId: 'team-a', rosterStatus: 'MLB' }],
    }));
    await saveTeamRoster({
      ...createEmptyTeamRoster('team-a'),
      mlbRoster: ['copy-pool-player'],
    });

    const { result } = await renderLoadedLeagueBuilderHook();
    let copiedLeague: LeagueTemplate | null = null;
    await act(async () => {
      copiedLeague = await result.current.duplicateLeague('test-league');
    });
    const copyId = copiedLeague!.id;
    const copiedRoster = await getTeamRoster(copiedLeague!.teamIds[0]);
    expect(copiedRoster?.mlbRoster).toEqual(['copy-pool-player']);

    const playerBeforeImport = await getPlayer('copy-pool-player');
    expect(playerBeforeImport && isPlayerInLeaguePool(playerBeforeImport, copyId)).toBe(false);

    await expect(importRosteredPlayersToLeaguePool(copyId)).resolves.toBe(1);
    const playerAfterImport = await getPlayer('copy-pool-player');
    expect(playerAfterImport?.leagueAssignments).toEqual(
      expect.arrayContaining([
        { leagueId: 'test-league', teamId: 'team-a', rosterStatus: 'MLB' },
        { leagueId: copyId, teamId: '', rosterStatus: 'FREE_AGENT' },
      ]),
    );
    await expect(getPlayersByTeam('team-a', 'test-league')).resolves.toHaveLength(1);
    await expect(getPlayersByTeam(copiedLeague!.teamIds[0], copyId)).resolves.toHaveLength(0);
  });

  test('COPYFIX-1 removeTeam prunes deleted ids from league membership and divisions', async () => {
    await saveLeagueTemplate(makeLeague());
    await saveTeam(makeTeam('team-a'));
    await saveTeam(makeTeam('team-b'));

    const { result } = await renderLoadedLeagueBuilderHook();
    await act(async () => {
      await result.current.removeTeam('team-a');
    });

    const league = await getLeagueTemplate('test-league');
    expect(league?.teamIds).toEqual(['team-b']);
    expect(league?.divisions[0]?.teamIds).toEqual(['team-b']);
  });

  test('COPYFIX-1R empty teams table load never persists a membership heal', async () => {
    const ghostedLeague = makeLeague({
      teamIds: ['team-a', 'team-b'],
      divisions: [
        { id: 'div-a', name: 'North', conferenceId: 'conf-a', teamIds: ['team-a', 'team-b'] },
      ],
    });
    await saveLeagueTemplate(ghostedLeague);
    await initializeDefaultPresets();
    syncEngineMock.upsert.mockClear();
    syncEngineMock.isSuppressed.mockReturnValue(false);

    const { result } = await renderLoadedLeagueBuilderHook();

    expect(result.current.leagues.find((league) => league.id === 'test-league')?.teamIds).toEqual(['team-a', 'team-b']);
    expect(await getLeagueTemplate('test-league')).toEqual(expect.objectContaining({
      teamIds: ghostedLeague.teamIds,
      divisions: ghostedLeague.divisions,
    }));
    expect(syncEngineMock.upsert).not.toHaveBeenCalled();
  });

  test('COPYFIX-1R partial teams table load never persists a membership heal', async () => {
    const partialLeague = makeLeague({
      teamIds: ['team-a', 'team-b'],
      divisions: [
        { id: 'div-a', name: 'North', conferenceId: 'conf-a', teamIds: ['team-a', 'team-b'] },
      ],
    });
    await saveLeagueTemplate(partialLeague);
    await saveTeam(makeTeam('team-a'));
    await initializeDefaultPresets();
    syncEngineMock.upsert.mockClear();
    syncEngineMock.isSuppressed.mockReturnValue(false);

    const { result } = await renderLoadedLeagueBuilderHook();

    expect(result.current.leagues.find((league) => league.id === 'test-league')?.teamIds).toEqual(['team-a', 'team-b']);
    expect(await getLeagueTemplate('test-league')).toEqual(expect.objectContaining({
      teamIds: partialLeague.teamIds,
      divisions: partialLeague.divisions,
    }));
    expect(syncEngineMock.upsert).not.toHaveBeenCalled();
  });

  test('COPYFIX-1R duplicate skips ghost teams without mutating the source league', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await saveLeagueTemplate(makeLeague({
      teamIds: ['team-a', 'ghost-team', 'team-b'],
      divisions: [
        { id: 'div-a', name: 'North', conferenceId: 'conf-a', teamIds: ['team-a', 'ghost-team', 'team-b'] },
      ],
    }));
    await saveTeam(makeTeam('team-a'));
    await saveTeam(makeTeam('team-b'));
    const sourceBefore = await getLeagueTemplate('test-league');

    const { result } = await renderLoadedLeagueBuilderHook();
    let copiedLeague: LeagueTemplate | null = null;
    await act(async () => {
      copiedLeague = await result.current.duplicateLeague('test-league');
    });

    expect(copiedLeague?.teamIds).toHaveLength(2);
    expect(copiedLeague?.divisions[0]?.teamIds).toEqual(copiedLeague?.teamIds);
    const copiedTeams = await Promise.all(copiedLeague!.teamIds.map((teamId) => getTeam(teamId)));
    expect(copiedTeams.map((team) => team?.name).sort()).toEqual(['Scroll Safe Club', 'Scroll Safe Club']);
    expect(await getLeagueTemplate('test-league')).toEqual(sourceBefore);
    expect(warnSpy).toHaveBeenCalledWith(
      '[useLeagueBuilderData] duplicateLeague skipped missing teams',
      expect.objectContaining({ leagueId: 'test-league', missingTeamIds: ['ghost-team'] }),
    );
    warnSpy.mockRestore();
  });

  test('COPYFIX-2 drafted pool-first duplicate starts with source pool members, empty rosters, and no minted farm leak', async () => {
    const fixture = await seedPostDraftPoolFirstLeague();
    const playerCountBefore = (await getAllPlayers()).length;

    const { result } = await renderLoadedLeagueBuilderHook();
    let copiedLeague: LeagueTemplate | null = null;
    await act(async () => {
      copiedLeague = await result.current.duplicateLeague(fixture.leagueId);
    });
    const copyId = copiedLeague!.id;

    const copiedRosters = await Promise.all(copiedLeague!.teamIds.map((teamId) => getTeamRoster(teamId)));
    expect(copiedRosters.every(Boolean)).toBe(true);
    for (const roster of copiedRosters) {
      expect(roster?.mlbRoster).toEqual([]);
      expect(roster?.farmRoster).toEqual([]);
    }

    for (const playerId of fixture.candidateIds) {
      const player = await getPlayer(playerId);
      expect(isPlayerInLeaguePool(player!, copyId)).toBe(true);
      expect(assignmentRows(player)).toEqual(
        expect.arrayContaining([{ leagueId: copyId, teamId: '', rosterStatus: 'FREE_AGENT' }]),
      );
    }
    const mintedFarm = await getPlayer(fixture.mintedFarmId);
    expect(mintedFarm?.leagueAssignments?.some((assignment) => assignment.leagueId === copyId)).toBe(false);
    expect(await getAllPlayers()).toHaveLength(playerCountBefore);

    await expect(importRosteredPlayersToLeaguePool(copyId)).resolves.toBe(0);
  });
});
