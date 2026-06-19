import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { composeMoraleConsequence } from '../../engines/masterMoraleMatrix';
import type { HiddenModifiers } from '../../types/game';
import { setFranchisePhase2L12EnabledForTests } from '../franchisePhase2Flags';
import {
  applyFranchiseRaceSnubMorale,
  buildRaceSnubMoraleEvent,
  franchiseRaceSnubSeam,
  pickRaceSnubVictims,
} from '../franchiseRaceSnubMorale';

const neutralModifiers: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

const scope = {
  franchiseId: 'franchise-snub',
  seasonId: 'season-snub',
  statsScopeId: 'stats-snub',
  seasonNumber: 1,
};

function player(overrides: Record<string, unknown> = {}) {
  return {
    id: 'player-snub',
    personality: 'RELAXED',
    morale: 50,
    hiddenPersonalityModifiers: neutralModifiers,
    ...overrides,
  } as Awaited<ReturnType<typeof franchiseRaceSnubSeam.getPlayer>>;
}

describe('franchise race snub morale', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2L12EnabledForTests(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2L12EnabledForTests(null);
  });

  test('race snub event uses kind race and fires the tap with personality scaling', () => {
    const event = buildRaceSnubMoraleEvent('MVP');
    const egotistical = composeMoraleConsequence(event, 'EGOTISTICAL', neutralModifiers, 50, 50);
    const relaxed = composeMoraleConsequence(event, 'RELAXED', neutralModifiers, 50, 50);
    const timid = composeMoraleConsequence(event, 'TIMID', neutralModifiers, 50, 50);
    const tough = composeMoraleConsequence(event, 'TOUGH', neutralModifiers, 50, 50);

    expect(egotistical.isNeutral).toBe(false);
    expect(egotistical.base.reason).toBe('race.snub.mvp');
    expect(egotistical.selfPlayerMoraleDelta).toBeLessThan(0);
    expect(egotistical.selfPlayerMoraleDelta).toBeLessThan(relaxed.selfPlayerMoraleDelta);
    expect(timid.selfPlayerMoraleDelta).toBeLessThan(tough.selfPlayerMoraleDelta);
  });

  test.each([
    ['MVP', 'race.snub.mvp'],
    ['CY_YOUNG', 'race.snub.cy_young'],
    ['ALL_STAR', 'race.snub.all_star'],
  ] as const)('buildRaceSnubMoraleEvent(%s) creates the race tap event', (honorKind, expectedType) => {
    expect(buildRaceSnubMoraleEvent(honorKind)).toEqual({
      kind: 'race',
      type: expectedType,
    });
  });

  test('pickRaceSnubVictims excludes winners and takes the closest losers with playerId tiebreak', () => {
    const victims = pickRaceSnubVictims(
      [
        { playerId: 'winner', teamId: 'team-winner', marginToWinner: 0 },
        { playerId: 'beta', teamId: 'team-beta', marginToWinner: -0.1 },
        { playerId: 'alpha', teamId: 'team-alpha', marginToWinner: 0.1 },
        { playerId: 'closest', teamId: 'team-closest', marginToWinner: 0.05 },
        { playerId: 'farther', teamId: 'team-farther', marginToWinner: -0.2 },
      ],
      new Set(['winner']),
      2,
    );

    expect(victims).toEqual([
      { playerId: 'closest', teamId: 'team-closest' },
      { playerId: 'alpha', teamId: 'team-alpha' },
    ]);
  });

  test('flag off returns dark-noop before any seam calls', async () => {
    setFranchisePhase2L12EnabledForTests(false);
    const getPlayer = vi.spyOn(franchiseRaceSnubSeam, 'getPlayer');
    const getSnapshot = vi.spyOn(franchiseRaceSnubSeam, 'getSnapshot');
    const applyConsequence = vi.spyOn(franchiseRaceSnubSeam, 'applyConsequence');

    const result = await applyFranchiseRaceSnubMorale({
      victims: [{ playerId: 'snubbed', teamId: 'team-snubbed' }],
      honorKind: 'MVP',
      scope,
      timestamp: 1720000000000,
    });

    expect(result).toEqual({
      status: 'dark-noop',
      appliedCount: 0,
      reason: 'L12 disabled',
    });
    expect(getPlayer).not.toHaveBeenCalled();
    expect(getSnapshot).not.toHaveBeenCalled();
    expect(applyConsequence).not.toHaveBeenCalled();
  });

  test('flag on composes and applies one deterministic race-snub consequence per victim', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    vi.spyOn(franchiseRaceSnubSeam, 'getPlayer').mockImplementation(async (_franchiseId, playerId) =>
      player({
        id: playerId,
        personality: playerId === 'victim-2' ? 'TIMID' : 'EGOTISTICAL',
        hiddenPersonalityModifiers: playerId === 'victim-2'
          ? { resilience: 20 }
          : { resilience: 50 },
      }));
    vi.spyOn(franchiseRaceSnubSeam, 'getSnapshot').mockImplementation(async (_snubScope, targetType, targetId) => {
      if (targetType === 'player' && targetId === 'victim-1') {
        return { currentValue: 47 } as Awaited<ReturnType<typeof franchiseRaceSnubSeam.getSnapshot>>;
      }
      return null;
    });
    const applyConsequence = vi.spyOn(franchiseRaceSnubSeam, 'applyConsequence')
      .mockImplementation(async (input) => ({
        status: input.playerId === 'victim-2' ? 'dark-noop' : 'applied',
        applied: [],
        skipped: [],
        failed: [],
        reason: 'stubbed matrix write',
        blockers: [],
      }));

    const result = await applyFranchiseRaceSnubMorale({
      victims: [
        { playerId: 'victim-1', teamId: 'team-1' },
        { playerId: 'victim-2', teamId: 'team-2' },
      ],
      honorKind: 'MVP',
      scope,
      timestamp: 1720000000000,
    });

    expect(result).toEqual({
      status: 'applied',
      appliedCount: 2,
    });
    expect(applyConsequence).toHaveBeenCalledTimes(2);
    expect(applyConsequence.mock.calls[0][0]).toMatchObject({
      ...scope,
      playerId: 'victim-1',
      teamId: 'team-1',
      sourceEventId: 'race-snub:franchise-snub:season-snub:stats-snub:MVP:victim-1',
      timestamp: new Date(1720000000000).toISOString(),
    });
    expect(applyConsequence.mock.calls[1][0]).toMatchObject({
      ...scope,
      playerId: 'victim-2',
      teamId: 'team-2',
      sourceEventId: 'race-snub:franchise-snub:season-snub:stats-snub:MVP:victim-2',
      timestamp: new Date(1720000000000).toISOString(),
    });
    expect(applyConsequence.mock.calls[0][0].consequence).toMatchObject({
      eventType: 'race.snub.mvp',
      isNeutral: false,
      reason: 'race.snub.mvp',
      base: {
        selfPlayerMoraleDelta: -4,
        teamFanMoraleDelta: 0,
        otherTouched: [],
        reason: 'race.snub.mvp',
      },
    });
    expect(applyConsequence.mock.calls[0][0].consequence.selfPlayerMoraleDelta).toBeLessThan(0);
    expect(applyConsequence.mock.calls[1][0].consequence.selfPlayerMoraleDelta)
      .toBeLessThan(applyConsequence.mock.calls[0][0].consequence.selfPlayerMoraleDelta);
  });
});
