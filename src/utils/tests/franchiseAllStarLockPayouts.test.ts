import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { AllStarCandidate } from '../../engines/franchiseAllStarSelector';
import {
  emitTeamId,
  franchiseAllStarLockPayoutSeam,
  honoreesFromSelections,
  pickAllStarSnubVictims,
  runFranchiseAllStarLockPayouts,
} from '../franchiseAllStarLockPayouts';
import type { FranchiseAllStarSelection } from '../franchiseAllStarRostersStorage';

const scope = {
  franchiseId: 'franchise-lock',
  seasonId: 'season-lock',
  statsScopeId: 'stats-lock',
  seasonNumber: 2,
};

function selection(
  overrides: Partial<FranchiseAllStarSelection> & Pick<FranchiseAllStarSelection, 'playerId'>,
): FranchiseAllStarSelection {
  return {
    playerId: overrides.playerId,
    teamId: 'team-a',
    position: 'C',
    role: 'reserve',
    selectionScore: 1,
    ...overrides,
  };
}

function candidate(
  overrides: Partial<AllStarCandidate> & Pick<AllStarCandidate, 'playerId'>,
): AllStarCandidate {
  return {
    playerId: overrides.playerId,
    teamId: `team-${overrides.playerId}`,
    rawPosition: 'C',
    hittingMerit: 1,
    battingWar: 1,
    startingMerit: null,
    reliefMerit: null,
    gamesStarted: 0,
    qualifiedAsHitter: true,
    qualifiedAsPitcher: false,
    fameHeat: 0,
    fameReachFloor: 0,
    ...overrides,
  };
}

describe('franchiseAllStarLockPayouts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('honoreesFromSelections maps starters and wildcard starters to allStarStarter, reserves to allStarReserve', () => {
    expect(honoreesFromSelections([
      selection({ playerId: 'starter-c', position: 'C', role: 'starter' }),
      selection({ playerId: 'wildcard', position: 'WILDCARD', role: 'starter' }),
      selection({ playerId: 'reserve-of', position: 'LF', role: 'reserve' }),
    ])).toEqual([
      { playerId: 'starter-c', honorTier: 'allStarStarter' },
      { playerId: 'wildcard', honorTier: 'allStarStarter' },
      { playerId: 'reserve-of', honorTier: 'allStarReserve' },
    ]);
  });

  test('pickAllStarSnubVictims excludes selected players and sorts by merit desc with playerId tiebreak', () => {
    const victims = pickAllStarSnubVictims([
      candidate({ playerId: 'selected-high', teamId: 'team-selected', hittingMerit: 99 }),
      candidate({ playerId: 'arm-ace', teamId: 'team-arm', hittingMerit: null, startingMerit: 9 }),
      candidate({ playerId: 'bat-c', teamId: 'team-c', hittingMerit: 8 }),
      candidate({ playerId: 'bat-b', teamId: 'team-b', hittingMerit: 8 }),
      candidate({ playerId: 'reliever', teamId: 'team-rp', hittingMerit: null, reliefMerit: 7 }),
      candidate({ playerId: 'fallback', teamId: 'team-fallback', hittingMerit: null, startingMerit: null, reliefMerit: null }),
    ], new Set(['selected-high']), 3);

    expect(victims).toEqual([
      { playerId: 'arm-ace', teamId: 'team-arm' },
      { playerId: 'bat-b', teamId: 'team-b' },
      { playerId: 'bat-c', teamId: 'team-c' },
    ]);
  });

  test('emitTeamId picks the team with the most selections and breaks ties by teamId', () => {
    expect(emitTeamId([])).toBeNull();
    expect(emitTeamId([
      selection({ playerId: 'a1', teamId: 'team-b' }),
      selection({ playerId: 'a2', teamId: 'team-a' }),
      selection({ playerId: 'a3', teamId: 'team-b' }),
      selection({ playerId: 'a4', teamId: 'team-a' }),
      selection({ playerId: 'a5', teamId: 'team-c' }),
    ])).toBe('team-a');
  });

  test('runFranchiseAllStarLockPayouts calls all three seams with honorees, victims, and All-Star emit input', async () => {
    const selections = [
      selection({ playerId: 'starter-c', teamId: 'team-b', position: 'C', role: 'starter' }),
      selection({ playerId: 'starter-sp', teamId: 'team-a', position: 'SP', role: 'starter' }),
      selection({ playerId: 'reserve-of', teamId: 'team-a', position: 'LF', role: 'reserve' }),
    ];
    const allStarCandidates = [
      candidate({ playerId: 'starter-c', teamId: 'team-b', hittingMerit: 10 }),
      candidate({ playerId: 'starter-sp', teamId: 'team-a', hittingMerit: null, startingMerit: 9 }),
      candidate({ playerId: 'reserve-of', teamId: 'team-a', hittingMerit: 8 }),
      candidate({ playerId: 'snub-1', teamId: 'team-x', hittingMerit: 7 }),
      candidate({ playerId: 'snub-2', teamId: 'team-y', hittingMerit: null, startingMerit: 6 }),
      candidate({ playerId: 'snub-3', teamId: 'team-z', hittingMerit: null, reliefMerit: 5 }),
      candidate({ playerId: 'snub-4', teamId: 'team-w', hittingMerit: 4 }),
    ];
    const applyReachFloor = vi.spyOn(franchiseAllStarLockPayoutSeam, 'applyReachFloor')
      .mockResolvedValue({ status: 'ratcheted', ratchetedCount: 3 });
    const applySnub = vi.spyOn(franchiseAllStarLockPayoutSeam, 'applySnub')
      .mockResolvedValue({ status: 'applied', appliedCount: 3 });
    const emit = vi.spyOn(franchiseAllStarLockPayoutSeam, 'emit')
      .mockResolvedValue({ status: 'emitted' });

    const result = await runFranchiseAllStarLockPayouts({
      selections,
      candidates: allStarCandidates,
      scope,
      timestamp: 1720000000000,
    });

    expect(result).toEqual({ emit: 'emitted', reachFloor: 'ratcheted', snub: 'applied' });
    expect(applyReachFloor).toHaveBeenCalledWith({
      honorees: [
        { playerId: 'starter-c', honorTier: 'allStarStarter' },
        { playerId: 'starter-sp', honorTier: 'allStarStarter' },
        { playerId: 'reserve-of', honorTier: 'allStarReserve' },
      ],
      scope: {
        franchiseId: scope.franchiseId,
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId,
      },
      checkpointSentinel: 'all-star-lock',
    });
    expect(applySnub).toHaveBeenCalledWith({
      victims: [
        { playerId: 'snub-1', teamId: 'team-x' },
        { playerId: 'snub-2', teamId: 'team-y' },
        { playerId: 'snub-3', teamId: 'team-z' },
      ],
      honorKind: 'ALL_STAR',
      scope,
      timestamp: 1720000000000,
    });
    expect(emit).toHaveBeenCalledWith({
      honorInput: {
        franchiseId: scope.franchiseId,
        seasonId: scope.seasonId,
        seasonNumber: scope.seasonNumber,
        honorKind: 'ALL_STAR',
        triggerPhase: 'all-star-lock',
        subjectIds: ['starter-c', 'starter-sp', 'reserve-of'],
        facts: { selectedCount: 3 },
      },
      teamId: 'team-a',
    });
  });

  test('runFranchiseAllStarLockPayouts isolates payout failures so a snub throw does not block emit or reach-floor', async () => {
    const applyReachFloor = vi.spyOn(franchiseAllStarLockPayoutSeam, 'applyReachFloor')
      .mockResolvedValue({ status: 'ratcheted', ratchetedCount: 1 });
    const applySnub = vi.spyOn(franchiseAllStarLockPayoutSeam, 'applySnub')
      .mockRejectedValue(new Error('snub failed'));
    const emit = vi.spyOn(franchiseAllStarLockPayoutSeam, 'emit')
      .mockResolvedValue({ status: 'emitted' });

    const result = await runFranchiseAllStarLockPayouts({
      selections: [selection({ playerId: 'starter-c', teamId: 'team-a', role: 'starter' })],
      candidates: [candidate({ playerId: 'snub-1', teamId: 'team-x', hittingMerit: 7 })],
      scope,
      timestamp: 1720000000000,
    });

    expect(result).toEqual({ emit: 'emitted', reachFloor: 'ratcheted', snub: 'error' });
    expect(applyReachFloor).toHaveBeenCalledTimes(1);
    expect(applySnub).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
  });
});
