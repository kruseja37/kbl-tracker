import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { CareerStats } from '../careerStorage';
import type { CompletedGameRecord } from '../gameStorage';
import type { Player, Team } from '../leagueBuilderStorage';
import type { FranchiseMoraleSnapshot } from '../franchiseMoraleState';
import type { RecomputeL12Result } from '../franchiseRaceStandingsCompute';
import type { RelationshipEdgeRow } from '../franchiseRelationshipEdgesStorage';
import type { ScheduledGame } from '../scheduleStorage';
import type { FranchiseStadiumRecord } from '../franchiseStadiumRecordsStorage';
import type { PlayerSeasonBatting, PlayerSeasonPitching } from '../seasonStorage';
import type { FranchiseTrueValueRow } from '../franchiseTrueValueStorage';
import {
  STAKES_FAMILIES,
  computePregameStakes,
  franchiseStakesComputeSeam,
  selectTonightStakes,
  type FranchiseStakesScope,
  type StakesFamily,
} from '../franchiseStakesCompute';
import { dumpLsimStores } from '../../../test-utils/lsim/storeDump';

const scope: FranchiseStakesScope = {
  franchiseId: 'stakes-franchise',
  seasonId: 'stakes-season',
  statsScopeId: 'stakes-season',
  seasonNumber: 1,
  leagueId: 'stakes-league',
};

const scheduleGame: ScheduledGame = {
  id: 'stakes-game-4',
  franchiseId: scope.franchiseId,
  seasonId: scope.seasonId,
  statsScopeId: scope.statsScopeId,
  seasonNumber: scope.seasonNumber,
  gameNumber: 4,
  dayNumber: 4,
  awayTeamId: 'away',
  homeTeamId: 'home',
  status: 'SCHEDULED',
  createdAt: 1,
};

const emptyCareerStats: CareerStats = { batting: null, pitching: null, fielding: null };
const originalSeam = { ...franchiseStakesComputeSeam };

function player(id: string, teamId: string, firstName: string): Player {
  return {
    id,
    firstName,
    lastName: 'Fixture',
    leagueAssignments: [{ leagueId: scope.leagueId!, teamId, rosterStatus: 'MLB' }],
  } as Player;
}

function team(id: string, name: string): Team {
  return {
    id,
    name,
    leagueIds: [scope.leagueId!],
    stadiumId: id === 'home' ? 'stakes-park' : 'away-park',
  } as Team;
}

const fixturePlayers = [player('away-player', 'away', 'Avery'), player('home-player', 'home', 'Harper')];
const fixtureTeams = [team('away', 'Away Club'), team('home', 'Home Club')];

function batting(playerId: string, teamId: string, homeRuns = 0): PlayerSeasonBatting {
  return {
    seasonId: scope.statsScopeId,
    playerId,
    playerName: playerId,
    teamId,
    games: 10,
    pa: 40,
    ab: 35,
    hits: 10,
    singles: 7,
    doubles: 1,
    triples: 0,
    homeRuns,
    rbi: 12,
    runs: 10,
    walks: 4,
    strikeouts: 8,
    hitByPitch: 0,
    sacFlies: 0,
    sacBunts: 0,
    stolenBases: 0,
    caughtStealing: 0,
    gidp: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    lastUpdated: 1,
  };
}

function record(): FranchiseStadiumRecord {
  return {
    id: 'park-record-runs',
    storageVersion: 'franchise-stadium-records-storage-v1',
    ...scope,
    stadiumId: 'stakes-park',
    stadiumName: 'Stakes Park',
    recordType: 'highest-team-runs-game',
    recordKey: 'overall',
    value: 12,
    valueLabel: '12 runs',
    leaderTeamIds: ['home'],
    leaderPlayerIds: [],
    leaderPlayerNames: [],
    sourceGameIds: ['old-game'],
    evidenceIds: ['old-game'],
    evidenceSummary: 'fixture',
    blockers: [],
    limitations: [],
    policies: {
      adaptiveParkFactorPersistenceAllowed: false,
      parkAdjustedWarAllowed: false,
      moraleMutationAllowed: false,
      randomEventPromptAllowed: false,
      designationMutationAllowed: false,
      salaryMovementAllowed: false,
      relationshipMutationAllowed: false,
      mode3HandoffAllowed: false,
    },
    scopeKey: 'fixture',
    stadiumScopeKey: 'fixture',
    identityKey: 'fixture',
    createdAt: 'fixture',
    updatedAt: 'fixture',
  };
}

function relationship(): RelationshipEdgeRow {
  return {
    id: 'stakes-edge',
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    player1Id: 'away-player',
    player2Id: 'home-player',
    type: 'RIVALRY',
    intensity: 0.9,
    potential: false,
    accuracy: 1,
    formedAtGameNumber: 1,
    dissolvedAtGameNumber: null,
    formationSource: 'overtake',
    createdAt: 1,
  };
}

function completedGame(gameId: string, date: number): CompletedGameRecord {
  return {
    gameId,
    date,
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    awayTeamId: 'away',
    homeTeamId: 'home',
    awayTeamName: 'Away Club',
    homeTeamName: 'Home Club',
    finalScore: { away: 4, home: 2 },
    innings: 9,
    fameEvents: [],
    playerStats: {
      'away-player': {
        playerName: 'Avery Fixture',
        teamId: 'away',
        pa: 4,
        ab: 4,
        h: 1,
        singles: 1,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        r: 0,
        bb: 0,
        hbp: 0,
        k: 0,
        sb: 0,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 0,
        assists: 0,
        fieldingErrors: 0,
      },
    },
    pitcherGameStats: [],
  };
}

function morale(teamId: string, currentValue: number): FranchiseMoraleSnapshot {
  return {
    id: `morale:${teamId}`,
    contractVersion: 'franchise-morale-state-v1',
    ...scope,
    targetType: 'team-fan',
    teamId,
    baselineValue: 50,
    currentValue,
    lastModified: 'fixture',
    history: [],
  };
}

const raceResult: RecomputeL12Result = {
  status: 'computed',
  standings: {
    meritRaces: {
      MVP: [
        { playerId: 'home-player', meritScore: 5, fameRank: 0, fameActive: false, composite: 1, marginToWinner: 0, band: 1, rank: 1 },
        { playerId: 'away-player', meritScore: 4.8, fameRank: 0, fameActive: false, composite: 0.9, marginToWinner: -0.2, band: 1, rank: 2 },
      ],
    },
    tvFamily: { kk: [], bust: [], comeback: [] },
  },
};

function restoreSeam(): void {
  Object.assign(franchiseStakesComputeSeam, originalSeam);
}

function setFixture(flags: Partial<Record<StakesFamily, boolean>> = {}): void {
  restoreSeam();
  Object.assign(franchiseStakesComputeSeam, {
    getScheduleGame: async () => scheduleGame,
    getFranchisePlayers: async () => fixturePlayers,
    getFranchiseTeams: async () => fixtureTeams,
    getSeasonBattingStats: async () => [batting('away-player', 'away', 38)],
    getSeasonPitchingStats: async () => [] as PlayerSeasonPitching[],
    getCareerStats: async () => emptyCareerStats,
    listStadiumRecords: async () => [record()],
    getRelationshipEdges: async () => [relationship()],
    getTrueValueRows: async () => [] as FranchiseTrueValueRow[],
    recomputeL12Standings: async () => raceResult,
    getTeamFanMorale: async (_scope: FranchiseStakesScope, teamId: string) =>
      morale(teamId, teamId === 'away' ? 27 : 50),
    getCompletedGames: async () => [
      completedGame('stakes-completed-1', 1),
      completedGame('stakes-completed-2', 2),
      completedGame('stakes-completed-3', 3),
    ],
    isFameEnabled: () => flags.milestoneProximity === true,
    isStadiumRecordsEnabled: () => flags.recordProximity === true,
    isL13Enabled: () => flags.grudgeLines === true,
    isL12Enabled: () => flags.racePressure === true,
    isL11Enabled: () => flags.hotSeat === true,
    isMoraleEnabled: () => flags.liveStreaks === true,
  });
}

beforeEach(() => restoreSeam());
afterEach(() => restoreSeam());

describe('STAKES-1-CORE pre-game vector', () => {
  test.each([
    ['milestoneProximity'],
    ['recordProximity'],
    ['grudgeLines'],
    ['racePressure'],
    ['hotSeat'],
    ['liveStreaks'],
  ] as Array<[StakesFamily]>)('%s has a proving fixture and is dark-safe', async (family) => {
    setFixture({ [family]: true });
    const lit = await computePregameStakes(scope, scheduleGame.id);

    expect(lit).not.toBeNull();
    expect(lit!.families[family].value).toBeGreaterThan(0);
    expect(lit!.families[family].candidates[0]?.oneLineFacts).toEqual(expect.any(Object));
    for (const otherFamily of STAKES_FAMILIES.filter((candidate) => candidate !== family)) {
      expect(lit!.families[otherFamily].value).toBe(0);
    }

    setFixture({ [family]: false });
    const dark = await computePregameStakes(scope, scheduleGame.id);
    expect(dark?.families[family]).toEqual({ family, value: 0, candidates: [] });
  });

  test('legacy all-dark franchises return an empty vector and a missing schedule is typed null', async () => {
    setFixture();
    const legacy = await computePregameStakes(scope, scheduleGame.id);
    expect(legacy).not.toBeNull();
    expect(STAKES_FAMILIES.every((family) => legacy!.families[family].value === 0)).toBe(true);

    franchiseStakesComputeSeam.getScheduleGame = async () => null;
    await expect(computePregameStakes(scope, 'missing-game')).resolves.toBeNull();
  });

  test('selection obeys K and vector plus selection are byte-identical for the same state', async () => {
    setFixture({
      milestoneProximity: true,
      recordProximity: true,
      grudgeLines: true,
      racePressure: true,
      hotSeat: true,
      liveStreaks: true,
    });
    const first = await computePregameStakes(scope, scheduleGame.id);
    const second = await computePregameStakes(scope, scheduleGame.id);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(selectTonightStakes(first!, 2))).toBe(JSON.stringify(selectTonightStakes(second!, 2)));
    expect(selectTonightStakes(first!, 1)).toHaveLength(1);
    expect(selectTonightStakes(first!, 2).length).toBeLessThanOrEqual(2);
    expect(selectTonightStakes(first!, 0)).toEqual([]);
  });

  test('read-only compute leaves the L-SIM store dump digest unchanged', async () => {
    setFixture({
      milestoneProximity: true,
      recordProximity: true,
      grudgeLines: true,
      racePressure: true,
      hotSeat: true,
      liveStreaks: true,
    });
    const before = await dumpLsimStores();
    await computePregameStakes(scope, scheduleGame.id);
    const after = await dumpLsimStores();

    expect(after.digest).toBe(before.digest);
    expect(after.databases).toEqual(before.databases);
  });
});
