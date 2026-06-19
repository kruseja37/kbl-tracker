import { describe, expect, test } from 'vitest';

import {
  mapValueRowsToAllStarCandidates,
  type FranchiseWarAwardQualifierFacts,
} from '../franchiseAwardsEngine';
import type { FranchiseFameRecordRow } from '../franchiseFameRecordsStorage';
import type { FranchiseTrustedValueArtifact } from '../franchiseTrustedValueStorage';
import type { FranchiseValueInputRow } from '../franchiseValueInputs';

const scope = {
  franchiseId: 'franchise-all-star',
  seasonId: 'season-all-star',
  statsScopeId: 'season-all-star',
};

type ValueRowOverrides = Omit<
  Partial<FranchiseValueInputRow>,
  'warPreviewValues' | 'warInputAvailability'
> & {
  warPreviewValues?: Partial<FranchiseValueInputRow['warPreviewValues']>;
  warInputAvailability?: Partial<FranchiseValueInputRow['warInputAvailability']>;
};

function valueRow(
  playerId: string,
  overrides: ValueRowOverrides = {},
): FranchiseValueInputRow {
  const {
    warPreviewValues: _ignoredWarPreviewValues,
    warInputAvailability: _ignoredWarInputAvailability,
    ...rowOverrides
  } = overrides;
  const warPreviewValues: FranchiseValueInputRow['warPreviewValues'] = {
    battingWar: 0,
    pitchingWar: null,
    pitchingWpa: null,
    fieldingWar: 0,
    baserunningWar: 0,
    totalWar: 0,
    totalWarSource: 'stat-row',
    trustedForFinalValue: true,
    ...overrides.warPreviewValues,
  };
  const warInputAvailability: FranchiseValueInputRow['warInputAvailability'] = {
    battingWar: warPreviewValues.battingWar !== null,
    pitchingWar: warPreviewValues.pitchingWar !== null,
    fieldingWar: warPreviewValues.fieldingWar !== null,
    baserunningWar: warPreviewValues.baserunningWar !== null,
    any: true,
    trustedForFinalValue: true,
    ...overrides.warInputAvailability,
  };

  return {
    contractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    ...scope,
    seasonNumber: 1,
    playerId,
    playerName: playerId,
    valuePosition: 'SS',
    currentTeamId: 'team-a',
    rosterStatus: 'MLB',
    salary: 1,
    contractYears: 1,
    salaryBaselineCalculationVersion: 'salary-v1',
    teamSalaryBaseline: 50,
    salaryBaselineAvailable: true,
    seasonStatsAvailability: {
      batting: true,
      pitching: warPreviewValues.pitchingWar !== null,
      fielding: true,
      any: true,
    },
    warConsumerTrust: {
      teamMvpDesignations: true,
      aceDesignations: warPreviewValues.pitchingWar !== null,
      fanFavoriteAlbatrossDesignations: true,
      awards: true,
      salaryMovement: false,
      trueValue: true,
      morale: false,
      mode3Handoff: false,
      blockers: [],
      limitations: [],
    },
    wpaInputAvailability: {
      playerWpa: false,
      managerWpa: false,
      archiveBacked: false,
      trustedForFinalValue: false,
    },
    seasonContext: {
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      seasonNumber: 1,
      gamesPerTeam: 32,
      inningsPerGame: 6,
      seasonLengthSource: 'stored-franchise-config',
      scheduleRowCount: 0,
      scheduleRowsUsedAsSeasonLength: false,
      seasonMetadataTotalGames: null,
    },
    stadiumId: 'stadium-a',
    parkFactorAvailability: {
      stadiumIdAvailable: true,
      seedParkFactorsAvailable: true,
      customParkFactorsAvailable: false,
      status: 'seed-only',
      parkAdjustedValueInputsAvailable: false,
    },
    limitations: [],
    ...rowOverrides,
    warPreviewValues,
    warInputAvailability,
  };
}

function artifact(playerIds: string[]): FranchiseTrustedValueArtifact {
  return {
    ...scope,
    seasonNumber: 1,
    contractVersion: 'd6-v1',
    peerPoolMinThreshold: 2,
    trustedPlayerIds: [...playerIds].sort(),
    blockedRows: [],
    rosterStateSnapshot: playerIds.map((playerId) => ({
      playerId,
      teamId: 'team-a',
      rosterStatus: 'MLB',
    })),
    frozen: false,
    frozenAt: null,
    computedAt: 1781654300000,
  };
}

function factsByPlayerId(
  rows: FranchiseWarAwardQualifierFacts[],
): Map<string, FranchiseWarAwardQualifierFacts> {
  return new Map(rows.map((row) => [row.playerId, row]));
}

function fameRow(
  playerId: string,
  overrides: Partial<FranchiseFameRecordRow> = {},
): FranchiseFameRecordRow {
  return {
    ...scope,
    playerId,
    heat: 0,
    reachFloor: 0,
    wasNegative: false,
    channelTotal: 0,
    channelByChannel: {
      wpa_spine: 0,
      iconic_event: 0,
      status: 0,
      defensive: 0,
      role_player: 0,
    },
    defensiveFame: 0,
    rolePlayerFame: 0,
    updatedAtCheckpoint: 'checkpoint-1',
    ...overrides,
  };
}

function fameByPlayerId(
  rows: FranchiseFameRecordRow[],
): Map<string, FranchiseFameRecordRow> {
  return new Map(rows.map((row) => [row.playerId, row]));
}

describe('mapValueRowsToAllStarCandidates', () => {
  test('maps team, position, WAR merits, games started, and fame fields', () => {
    const candidates = mapValueRowsToAllStarCandidates({
      valueRows: [
        valueRow('mapped-player', {
          currentTeamId: 'team-b',
          valuePosition: 'CF',
          warPreviewValues: {
            totalWar: 5.25,
            battingWar: 3.75,
            pitchingWar: 1.5,
            pitchingWpa: 0.85,
          },
        }),
      ],
      trustedValueArtifact: artifact(['mapped-player']),
      qualifierByPlayerId: factsByPlayerId([
        { playerId: 'mapped-player', plateAppearances: 25, inningsPitched: 6, gamesStarted: 3 },
      ]),
      fameByPlayerId: fameByPlayerId([
        fameRow('mapped-player', { heat: 7.5, reachFloor: 3 }),
      ]),
      minPlateAppearances: 100,
      minInningsPitched: 40,
    });

    expect(candidates).toEqual([
      {
        playerId: 'mapped-player',
        teamId: 'team-b',
        rawPosition: 'CF',
        hittingMerit: 5.25,
        battingWar: 3.75,
        startingMerit: 1.5,
        reliefMerit: 0.85,
        gamesStarted: 3,
        qualifiedAsHitter: true,
        qualifiedAsPitcher: true,
        fameHeat: 7.5,
        fameReachFloor: 3,
      },
    ]);
  });

  test('uses relaxed 60%-lock qualifier fractions instead of full award floors', () => {
    const rows = [
      valueRow('hitter-at-relaxed-floor'),
      valueRow('hitter-below-relaxed-floor'),
      valueRow('pitcher-at-relaxed-floor', {
        warPreviewValues: { pitchingWar: 1.4, pitchingWpa: 0.25, totalWar: 1.4 },
      }),
    ];

    const candidates = mapValueRowsToAllStarCandidates({
      valueRows: rows,
      trustedValueArtifact: artifact(rows.map((row) => row.playerId)),
      qualifierByPlayerId: factsByPlayerId([
        { playerId: 'hitter-at-relaxed-floor', plateAppearances: 25, inningsPitched: null, gamesStarted: 0 },
        { playerId: 'hitter-below-relaxed-floor', plateAppearances: 24, inningsPitched: null, gamesStarted: 0 },
        { playerId: 'pitcher-at-relaxed-floor', plateAppearances: null, inningsPitched: 6, gamesStarted: 0 },
      ]),
      fameByPlayerId: fameByPlayerId([]),
      minPlateAppearances: 100,
      minInningsPitched: 40,
    });

    expect(candidates.map((candidate) => candidate.playerId)).toEqual([
      'hitter-at-relaxed-floor',
      'pitcher-at-relaxed-floor',
    ]);
    expect(candidates.find((candidate) => candidate.playerId === 'hitter-at-relaxed-floor')).toMatchObject({
      qualifiedAsHitter: true,
      qualifiedAsPitcher: false,
    });
    expect(candidates.find((candidate) => candidate.playerId === 'pitcher-at-relaxed-floor')).toMatchObject({
      qualifiedAsHitter: false,
      qualifiedAsPitcher: true,
    });
  });

  test('excludes untrusted players even when their qualifier facts clear a floor', () => {
    const candidates = mapValueRowsToAllStarCandidates({
      valueRows: [
        valueRow('trusted-player'),
        valueRow('untrusted-player', {
          warPreviewValues: { totalWar: 99, battingWar: 99 },
        }),
      ],
      trustedValueArtifact: artifact(['trusted-player']),
      qualifierByPlayerId: factsByPlayerId([
        { playerId: 'trusted-player', plateAppearances: 25 },
        { playerId: 'untrusted-player', plateAppearances: 100 },
      ]),
      fameByPlayerId: fameByPlayerId([]),
      minPlateAppearances: 100,
      minInningsPitched: 40,
    });

    expect(candidates.map((candidate) => candidate.playerId)).toEqual(['trusted-player']);
  });

  test('filters trusted players who clear neither the hitter nor pitcher floor', () => {
    const candidates = mapValueRowsToAllStarCandidates({
      valueRows: [
        valueRow('no-floor-cleared', {
          warPreviewValues: { totalWar: 8, battingWar: 6, pitchingWar: 6, pitchingWpa: 3 },
        }),
      ],
      trustedValueArtifact: artifact(['no-floor-cleared']),
      qualifierByPlayerId: factsByPlayerId([
        { playerId: 'no-floor-cleared', plateAppearances: 24, inningsPitched: 5.9 },
      ]),
      fameByPlayerId: fameByPlayerId([
        fameRow('no-floor-cleared', { heat: 99, reachFloor: 5 }),
      ]),
      minPlateAppearances: 100,
      minInningsPitched: 40,
    });

    expect(candidates).toEqual([]);
  });

  test('defaults missing fame plus null team and position fields', () => {
    const candidates = mapValueRowsToAllStarCandidates({
      valueRows: [
        valueRow('null-fields', {
          currentTeamId: null,
          valuePosition: null,
        }),
      ],
      trustedValueArtifact: artifact(['null-fields']),
      qualifierByPlayerId: factsByPlayerId([
        { playerId: 'null-fields', plateAppearances: 25, gamesStarted: null },
      ]),
      fameByPlayerId: fameByPlayerId([]),
      minPlateAppearances: 100,
      minInningsPitched: 40,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      playerId: 'null-fields',
      teamId: '',
      rawPosition: '',
      gamesStarted: 0,
      fameHeat: 0,
      fameReachFloor: 0,
    });
  });

  test('sorts output by playerId for deterministic downstream selection', () => {
    const rows = [
      valueRow('player-c'),
      valueRow('player-a'),
      valueRow('player-b'),
    ];

    const candidates = mapValueRowsToAllStarCandidates({
      valueRows: rows,
      trustedValueArtifact: artifact(rows.map((row) => row.playerId)),
      qualifierByPlayerId: factsByPlayerId([
        { playerId: 'player-c', plateAppearances: 25 },
        { playerId: 'player-a', plateAppearances: 25 },
        { playerId: 'player-b', plateAppearances: 25 },
      ]),
      fameByPlayerId: fameByPlayerId([]),
      minPlateAppearances: 100,
      minInningsPitched: 40,
    });

    expect(candidates.map((candidate) => candidate.playerId)).toEqual([
      'player-a',
      'player-b',
      'player-c',
    ]);
  });
});
