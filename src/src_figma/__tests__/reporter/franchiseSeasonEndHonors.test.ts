import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  emitFranchiseSeasonEndHonors,
  franchiseSeasonEndHonorsSeam,
} from '../../app/engines/reporter/franchiseSeasonEndHonors';
import { setFranchisePhase2L12EnabledForTests } from '../../../utils/franchisePhase2Flags';
import type { FranchiseAwardRow } from '../../../utils/franchiseAwardsStorage';
import type { FranchiseFameRecordRow } from '../../../utils/franchiseFameRecordsStorage';
import type { FranchiseValueInputReport } from '../../../utils/franchiseValueInputs';

const originalSeam = { ...franchiseSeasonEndHonorsSeam };

const scope = {
  franchiseId: 'franchise-1',
  seasonId: 'season-1',
  statsScopeId: 'season-1',
  seasonNumber: 1,
};

function awardRow(overrides: Partial<FranchiseAwardRow> = {}): FranchiseAwardRow {
  return {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    category: 'MVP',
    winnerPlayerId: 'player-mvp',
    candidates: [
      { playerId: 'player-mvp', score: 10, marginToWinner: 0 },
      { playerId: 'runner-1', score: 9.8, marginToWinner: 0.2 },
      { playerId: 'runner-2', score: 9.9, marginToWinner: 0.1 },
      { playerId: 'runner-3', score: 9.7, marginToWinner: 0.3 },
    ],
    voteWeight: null,
    finalized: true,
    computedAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

function valueReportRows(rows: Array<{ playerId: string; currentTeamId: string | null }>) {
  return rows as FranchiseValueInputReport['rows'];
}

function fameRecord(overrides: Partial<FranchiseFameRecordRow> = {}): FranchiseFameRecordRow {
  return {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    playerId: 'player-mvp',
    heat: 10,
    reachFloor: 8,
    wasNegative: false,
    channelTotal: 10,
    channelByChannel: {
      wpa_spine: 0,
      iconic_event: 0,
      status: 10,
      defensive: 0,
      role_player: 0,
    },
    defensiveFame: 0,
    rolePlayerFame: 0,
    updatedAtCheckpoint: 'pre-honor',
    ...overrides,
  };
}

function installSeamMocks(params: {
  awards?: FranchiseAwardRow[];
  valueRows?: Array<{ playerId: string; currentTeamId: string | null }>;
  emitStatus?: 'emitted' | 'deduped' | 'gated' | 'no-reporter' | 'take-failed' | 'dark-noop';
  emit?: ReturnType<typeof vi.fn>;
  getFameRecord?: ReturnType<typeof vi.fn>;
  applySnub?: ReturnType<typeof vi.fn>;
} = {}) {
  const getAwards = vi.fn(async () => params.awards ?? []);
  const getValueRows = vi.fn(async () => ({
    rows: valueReportRows(params.valueRows ?? []),
  }) as FranchiseValueInputReport);
  const emit = params.emit ?? vi.fn(async () => ({ status: params.emitStatus ?? 'emitted' }));
  const getFameRecord = params.getFameRecord ?? vi.fn(async () => null);
  const applyReachFloor = vi.fn(async () => ({ status: 'ratcheted', ratchetedCount: 1 }));
  const applySnub = params.applySnub ?? vi.fn(async () => ({ status: 'applied', appliedCount: 1 }));

  franchiseSeasonEndHonorsSeam.getAwards = getAwards;
  franchiseSeasonEndHonorsSeam.getValueRows = getValueRows;
  franchiseSeasonEndHonorsSeam.emit = emit;
  franchiseSeasonEndHonorsSeam.getFameRecord = getFameRecord;
  franchiseSeasonEndHonorsSeam.applyReachFloor = applyReachFloor;
  franchiseSeasonEndHonorsSeam.applySnub = applySnub;

  return {
    getAwards,
    getValueRows,
    emit,
    getFameRecord,
    applyReachFloor,
    applySnub,
  };
}

describe('emitFranchiseSeasonEndHonors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(franchiseSeasonEndHonorsSeam, originalSeam);
    setFranchisePhase2L12EnabledForTests(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.assign(franchiseSeasonEndHonorsSeam, originalSeam);
    setFranchisePhase2L12EnabledForTests(null);
  });

  test('flag off returns dark-noop before any seam calls', async () => {
    setFranchisePhase2L12EnabledForTests(false);
    const seam = installSeamMocks({
      awards: [awardRow()],
      valueRows: [{ playerId: 'player-mvp', currentTeamId: 'team-1' }],
    });

    const result = await emitFranchiseSeasonEndHonors(scope);

    expect(result).toEqual({ status: 'dark-noop', emitted: [] });
    expect(seam.getAwards).not.toHaveBeenCalled();
    expect(seam.getValueRows).not.toHaveBeenCalled();
    expect(seam.emit).not.toHaveBeenCalled();
    expect(seam.applyReachFloor).not.toHaveBeenCalled();
    expect(seam.applySnub).not.toHaveBeenCalled();
  });

  test('emitted MVP joins winner team and fires reach-floor plus snub payouts', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const computedAt = '2026-10-01T12:00:00.000Z';
    const seam = installSeamMocks({
      awards: [
        awardRow({
          candidates: [
            { playerId: 'player-mvp', score: 10, marginToWinner: 0 },
            { playerId: 'runner-1', score: 9.8, marginToWinner: 0.2 },
            { playerId: 'runner-no-team', score: 9.95, marginToWinner: 0.05 },
            { playerId: 'runner-2', score: 9.9, marginToWinner: 0.1 },
            { playerId: 'runner-3', score: 9.7, marginToWinner: 0.3 },
          ],
          computedAt,
        }),
      ],
      valueRows: [
        { playerId: 'player-mvp', currentTeamId: 'team-winner' },
        { playerId: 'runner-1', currentTeamId: 'team-runner-1' },
        { playerId: 'runner-no-team', currentTeamId: null },
        { playerId: 'runner-2', currentTeamId: 'team-runner-2' },
        { playerId: 'runner-3', currentTeamId: 'team-runner-3' },
      ],
    });

    const result = await emitFranchiseSeasonEndHonors(scope);

    expect(result).toEqual({ status: 'processed', emitted: ['MVP'] });
    expect(seam.emit).toHaveBeenCalledWith({
      honorInput: {
        franchiseId: 'franchise-1',
        seasonId: 'season-1',
        seasonNumber: 1,
        honorKind: 'MVP',
        triggerPhase: 'season-end',
        subjectIds: ['player-mvp'],
        facts: { winnerId: 'player-mvp' },
      },
      teamId: 'team-winner',
    });
    expect(seam.applyReachFloor).toHaveBeenCalledWith({
      honorees: [{ playerId: 'player-mvp', honorTier: 'mvp' }],
      scope: {
        franchiseId: 'franchise-1',
        seasonId: 'season-1',
        statsScopeId: 'season-1',
      },
      checkpointSentinel: 'season-end-honor',
    });
    expect(seam.applySnub).toHaveBeenCalledWith({
      victims: [
        { playerId: 'runner-2', teamId: 'team-runner-2' },
        { playerId: 'runner-1', teamId: 'team-runner-1' },
        { playerId: 'runner-3', teamId: 'team-runner-3' },
      ],
      honorKind: 'MVP',
      scope,
      timestamp: Date.parse(computedAt),
    });
  });

  test('season-end honor checkpoint skips reach-floor while deduped nod still fires snub payout', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const seam = installSeamMocks({
      awards: [awardRow()],
      valueRows: [
        { playerId: 'player-mvp', currentTeamId: 'team-winner' },
        { playerId: 'runner-1', currentTeamId: 'team-runner-1' },
        { playerId: 'runner-2', currentTeamId: 'team-runner-2' },
        { playerId: 'runner-3', currentTeamId: 'team-runner-3' },
      ],
      emitStatus: 'deduped',
      getFameRecord: vi.fn(async () => fameRecord({ updatedAtCheckpoint: 'season-end-honor' })),
    });

    const result = await emitFranchiseSeasonEndHonors(scope);

    expect(result).toEqual({ status: 'processed', emitted: [] });
    expect(seam.emit).toHaveBeenCalledTimes(1);
    expect(seam.getFameRecord).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
    }, 'player-mvp');
    expect(seam.applyReachFloor).not.toHaveBeenCalled();
    expect(seam.applySnub).toHaveBeenCalledWith({
      victims: [
        { playerId: 'runner-2', teamId: 'team-runner-2' },
        { playerId: 'runner-1', teamId: 'team-runner-1' },
        { playerId: 'runner-3', teamId: 'team-runner-3' },
      ],
      honorKind: 'MVP',
      scope,
      timestamp: Date.parse('2026-10-01T12:00:00.000Z'),
    });
  });

  test('no-reporter nod still applies reach-floor and close-loser snub payouts', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const seam = installSeamMocks({
      awards: [awardRow()],
      valueRows: [
        { playerId: 'player-mvp', currentTeamId: 'team-winner' },
        { playerId: 'runner-1', currentTeamId: 'team-runner-1' },
        { playerId: 'runner-2', currentTeamId: 'team-runner-2' },
        { playerId: 'runner-3', currentTeamId: 'team-runner-3' },
      ],
      emitStatus: 'no-reporter',
    });

    const result = await emitFranchiseSeasonEndHonors(scope);

    expect(result).toEqual({ status: 'processed', emitted: [] });
    expect(seam.applyReachFloor).toHaveBeenCalledWith({
      honorees: [{ playerId: 'player-mvp', honorTier: 'mvp' }],
      scope: {
        franchiseId: 'franchise-1',
        seasonId: 'season-1',
        statsScopeId: 'season-1',
      },
      checkpointSentinel: 'season-end-honor',
    });
    expect(seam.applySnub).toHaveBeenCalledWith({
      victims: [
        { playerId: 'runner-2', teamId: 'team-runner-2' },
        { playerId: 'runner-1', teamId: 'team-runner-1' },
        { playerId: 'runner-3', teamId: 'team-runner-3' },
      ],
      honorKind: 'MVP',
      scope,
      timestamp: Date.parse('2026-10-01T12:00:00.000Z'),
    });
  });

  test('throwing nod still applies reach-floor and close-loser snub payouts', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const seam = installSeamMocks({
      awards: [awardRow()],
      valueRows: [
        { playerId: 'player-mvp', currentTeamId: 'team-winner' },
        { playerId: 'runner-1', currentTeamId: 'team-runner-1' },
        { playerId: 'runner-2', currentTeamId: 'team-runner-2' },
        { playerId: 'runner-3', currentTeamId: 'team-runner-3' },
      ],
      emit: vi.fn(async () => {
        throw new Error('LLM down');
      }),
    });

    const result = await emitFranchiseSeasonEndHonors(scope);

    expect(result).toEqual({ status: 'processed', emitted: [] });
    expect(seam.applyReachFloor).toHaveBeenCalledWith({
      honorees: [{ playerId: 'player-mvp', honorTier: 'mvp' }],
      scope: {
        franchiseId: 'franchise-1',
        seasonId: 'season-1',
        statsScopeId: 'season-1',
      },
      checkpointSentinel: 'season-end-honor',
    });
    expect(seam.applySnub).toHaveBeenCalledWith({
      victims: [
        { playerId: 'runner-2', teamId: 'team-runner-2' },
        { playerId: 'runner-1', teamId: 'team-runner-1' },
        { playerId: 'runner-3', teamId: 'team-runner-3' },
      ],
      honorKind: 'MVP',
      scope,
      timestamp: Date.parse('2026-10-01T12:00:00.000Z'),
    });
  });

  test('skips non-finalized, no-winner, and no-team rows', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const seam = installSeamMocks({
      awards: [
        awardRow({ finalized: false }),
        awardRow({ category: 'CY_YOUNG', winnerPlayerId: null }),
        awardRow({
          category: 'CY_YOUNG',
          winnerPlayerId: 'pitcher-no-team',
          candidates: [{ playerId: 'pitcher-no-team', score: 7, marginToWinner: 0 }],
        }),
      ],
      valueRows: [{ playerId: 'player-mvp', currentTeamId: 'team-winner' }],
    });

    const result = await emitFranchiseSeasonEndHonors(scope);

    expect(result).toEqual({ status: 'processed', emitted: [] });
    expect(seam.emit).not.toHaveBeenCalled();
    expect(seam.applyReachFloor).not.toHaveBeenCalled();
    expect(seam.applySnub).not.toHaveBeenCalled();
  });

  test('processes MVP and CY Young independently', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const seam = installSeamMocks({
      awards: [
        awardRow(),
        awardRow({
          category: 'CY_YOUNG',
          winnerPlayerId: 'pitcher-cy',
          candidates: [
            { playerId: 'pitcher-cy', score: 8, marginToWinner: 0 },
            { playerId: 'pitcher-runner', score: 7.8, marginToWinner: 0.2 },
          ],
        }),
      ],
      valueRows: [
        { playerId: 'player-mvp', currentTeamId: 'team-mvp' },
        { playerId: 'runner-1', currentTeamId: 'team-runner-1' },
        { playerId: 'runner-2', currentTeamId: 'team-runner-2' },
        { playerId: 'runner-3', currentTeamId: 'team-runner-3' },
        { playerId: 'pitcher-cy', currentTeamId: 'team-cy' },
        { playerId: 'pitcher-runner', currentTeamId: 'team-pitcher-runner' },
      ],
    });

    const result = await emitFranchiseSeasonEndHonors(scope);

    expect(result).toEqual({ status: 'processed', emitted: ['MVP', 'CY_YOUNG'] });
    expect(seam.emit).toHaveBeenCalledTimes(2);
    expect(seam.applyReachFloor).toHaveBeenNthCalledWith(1, expect.objectContaining({
      honorees: [{ playerId: 'player-mvp', honorTier: 'mvp' }],
    }));
    expect(seam.applyReachFloor).toHaveBeenNthCalledWith(2, expect.objectContaining({
      honorees: [{ playerId: 'pitcher-cy', honorTier: 'cyYoung' }],
    }));
    expect(seam.applySnub).toHaveBeenNthCalledWith(2, expect.objectContaining({
      victims: [{ playerId: 'pitcher-runner', teamId: 'team-pitcher-runner' }],
      honorKind: 'CY_YOUNG',
    }));
  });

  test('applies Rookie of the Year snub payout without winner-side honor payout', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const computedAt = '2026-10-02T12:00:00.000Z';
    const seam = installSeamMocks({
      awards: [
        awardRow({
          category: 'ROOKIE_OF_YEAR',
          winnerPlayerId: 'rookie-winner',
          candidates: [
            { playerId: 'rookie-winner', score: 8.5, marginToWinner: 0 },
            { playerId: 'rookie-runner-1', score: 8.4, marginToWinner: 0.1 },
            { playerId: 'rookie-no-team', score: 8.45, marginToWinner: 0.05 },
            { playerId: 'rookie-runner-2', score: 8.2, marginToWinner: 0.3 },
          ],
          computedAt,
        }),
      ],
      valueRows: [
        { playerId: 'rookie-winner', currentTeamId: 'team-rookie-winner' },
        { playerId: 'rookie-runner-1', currentTeamId: 'team-rookie-runner-1' },
        { playerId: 'rookie-no-team', currentTeamId: null },
        { playerId: 'rookie-runner-2', currentTeamId: 'team-rookie-runner-2' },
      ],
    });

    const result = await emitFranchiseSeasonEndHonors(scope);

    expect(result).toEqual({ status: 'processed', emitted: [] });
    expect(seam.emit).not.toHaveBeenCalled();
    expect(seam.applyReachFloor).not.toHaveBeenCalled();
    expect(seam.applySnub).toHaveBeenCalledTimes(1);
    expect(seam.applySnub).toHaveBeenCalledWith({
      victims: [
        { playerId: 'rookie-runner-1', teamId: 'team-rookie-runner-1' },
        { playerId: 'rookie-runner-2', teamId: 'team-rookie-runner-2' },
      ],
      honorKind: 'ROOKIE_OF_YEAR',
      scope,
      timestamp: Date.parse(computedAt),
    });
  });

  test('snub failure does not block the next honor', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    const applySnub = vi.fn()
      .mockRejectedValueOnce(new Error('snub failed'))
      .mockResolvedValueOnce({ status: 'applied', appliedCount: 1 });
    const seam = installSeamMocks({
      awards: [
        awardRow(),
        awardRow({
          category: 'CY_YOUNG',
          winnerPlayerId: 'pitcher-cy',
          candidates: [
            { playerId: 'pitcher-cy', score: 8, marginToWinner: 0 },
            { playerId: 'pitcher-runner', score: 7.8, marginToWinner: 0.2 },
          ],
        }),
      ],
      valueRows: [
        { playerId: 'player-mvp', currentTeamId: 'team-mvp' },
        { playerId: 'runner-1', currentTeamId: 'team-runner-1' },
        { playerId: 'runner-2', currentTeamId: 'team-runner-2' },
        { playerId: 'runner-3', currentTeamId: 'team-runner-3' },
        { playerId: 'pitcher-cy', currentTeamId: 'team-cy' },
        { playerId: 'pitcher-runner', currentTeamId: 'team-pitcher-runner' },
      ],
      applySnub,
    });

    const result = await emitFranchiseSeasonEndHonors(scope);

    expect(result).toEqual({ status: 'processed', emitted: ['MVP', 'CY_YOUNG'] });
    expect(seam.emit).toHaveBeenCalledTimes(2);
    expect(seam.applyReachFloor).toHaveBeenCalledTimes(2);
    expect(seam.applySnub).toHaveBeenCalledTimes(2);
    expect(seam.applySnub).toHaveBeenNthCalledWith(2, expect.objectContaining({
      honorKind: 'CY_YOUNG',
    }));
  });
});
