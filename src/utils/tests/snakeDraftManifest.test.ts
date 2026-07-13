import { describe, expect, test } from 'vitest';

import type { LeagueBuilderMlbDraftSession } from '../leagueBuilderStorage';
import {
  buildSnakeDraftManifest,
  freezeSnakeDraftSession,
  readSnakeDraftTruth,
  validateSnakeDraftManifest,
} from '../snakeDraftManifest';

function completedSession(phase: 'MLB' | 'FARM' = 'MLB'): LeagueBuilderMlbDraftSession {
  return {
    id: `manifest-${phase.toLowerCase()}`,
    leagueId: 'league-a',
    seasonNumber: phase === 'FARM' ? 2 : 1,
    seed: 'fixed-seed',
    workflowVersion: 'snake-v1',
    engineMethodVersion: 'snake-s7',
    tier: 'standard',
    balanceMode: 'taxed',
    rounds: 1,
    draftPhase: phase,
    farmSlotSalaries: phase === 'FARM' ? [30_000, 20_000] : undefined,
    pickOrder: [
      { round: 1, pick: 1, teamId: 'team-a' },
      { round: 1, pick: 2, teamId: 'team-b' },
    ],
    completedPicks: [
      { round: 1, pick: 1, teamId: 'team-a', playerId: 'p1', settledSalary: phase === 'FARM' ? 30_000 : 100_000, marginalTax: phase === 'FARM' ? 0 : 5_000 },
      { round: 1, pick: 2, teamId: 'team-b', playerId: 'p2', settledSalary: phase === 'FARM' ? 20_000 : 120_000, marginalTax: phase === 'FARM' ? 0 : -2_000 },
    ],
    snakeSetup: {
      poolPlayerIds: ['p1', 'p2'],
      versionSelections: { legends: 'p1' },
      clubs: [
        { teamId: 'team-a', gmName: 'A', hotseat: true, archetypeId: 'speed' },
        { teamId: 'team-b', gmName: 'B', hotseat: true, archetypeId: 'power' },
      ],
      orderSeed: 'order-seed',
    },
    versionState: {
      draftedPlayerIdByGroupId: { legends: 'p1' },
      retiredPlayerIdsByGroupId: { legends: ['p0'] },
    },
    revision: 8,
    currentPickIndex: 2,
    createdDate: '2026-07-12T00:00:00.000Z',
    lastModified: '2026-07-12T00:00:00.000Z',
  };
}

function build(session = completedSession()) {
  return buildSnakeDraftManifest({
    session,
    expectedPhase: session.draftPhase ?? 'MLB',
    poolPlayerIds: ['p2', 'p1', 'reserve'],
    salaryByPlayerId: new Map([['p1', 100_000], ['p2', 120_000], ['reserve', 90_000]]),
    frozenAt: '2026-07-12T12:00:00.000Z',
  });
}

describe('immutable snake draft manifest', () => {
  test('freezes complete provenance and preserves explicit legacy unknown display money', () => {
    const session = completedSession();
    delete session.completedPicks[0].settledSalary;
    delete session.completedPicks[0].marginalTax;
    const manifest = build(session);

    expect(manifest).toMatchObject({
      phase: 'MLB',
      leagueId: 'league-a',
      source: { sessionId: 'manifest-mlb', revision: 8 },
      versions: { workflow: 'snake-v1', engine: 'snake-s7' },
      seed: 'fixed-seed',
      lockedClubs: [
        { teamId: 'team-a', archetypeId: 'speed' },
        { teamId: 'team-b', archetypeId: 'power' },
      ],
      versionState: session.versionState,
    });
    expect(manifest.pool.playerIds).toEqual(['p1', 'p2', 'reserve']);
    expect(manifest.pool.identity).toContain('snake-pool-v1:');
    expect(manifest.pool.mlbIvByPlayerId).toEqual({ p1: 100_000, p2: 120_000, reserve: 90_000 });
    expect(manifest.completedPicks[0]).toMatchObject({
      playerId: 'p1',
      settledSalary: null,
      marginalTax: null,
      launchSalary: 100_000,
      salarySource: 'pool-legacy',
    });
    expect(validateSnakeDraftManifest(manifest, { expectedPhase: 'MLB' })).toBe(manifest);
  });

  test('rejects incomplete, duplicate, wrong-slot, missing-pool, non-finite, and phase-mismatched truth', () => {
    const incomplete = completedSession();
    incomplete.currentPickIndex = 1;
    expect(() => build(incomplete)).toThrow(/complete/i);

    const duplicate = completedSession();
    duplicate.completedPicks[1].playerId = 'p1';
    expect(() => build(duplicate)).toThrow(/more than one/i);

    const wrongSlot = completedSession();
    wrongSlot.completedPicks[0].teamId = 'team-b';
    expect(() => build(wrongSlot)).toThrow(/team/i);

    expect(() => buildSnakeDraftManifest({
      session: completedSession(), expectedPhase: 'MLB', poolPlayerIds: ['p1'],
      salaryByPlayerId: new Map([['p1', 100_000], ['p2', 120_000]]), frozenAt: '2026-07-12T12:00:00.000Z',
    })).toThrow(/pool/i);

    expect(() => buildSnakeDraftManifest({
      session: completedSession(), expectedPhase: 'MLB', poolPlayerIds: ['p1', 'p2', 'unpriced-active'],
      salaryByPlayerId: new Map([['p1', 100_000], ['p2', 120_000]]), frozenAt: '2026-07-12T12:00:00.000Z',
    })).toThrow(/unpriced-active.*finite/i);

    const nonFinite = completedSession();
    nonFinite.completedPicks[0].settledSalary = Number.NaN;
    expect(() => build(nonFinite)).toThrow(/finite/i);

    expect(() => buildSnakeDraftManifest({
      session: completedSession(), expectedPhase: 'FARM', poolPlayerIds: ['p1', 'p2'],
      frozenAt: '2026-07-12T12:00:00.000Z',
    })).toThrow(/phase/i);
  });

  test('farm truth validates every frozen absolute slot salary', () => {
    const session = completedSession('FARM');
    session.completedPicks[0].settledSalary = 29_999;
    expect(() => buildSnakeDraftManifest({
      session, expectedPhase: 'FARM', poolPlayerIds: ['p1', 'p2'],
      frozenAt: '2026-07-12T12:00:00.000Z',
    })).toThrow(/slot salary/i);
  });

  test('runtime validation rejects missing pick coverage, invalid clubs, and forged salary-source relationships', () => {
    const duplicatePick = structuredClone(build());
    duplicatePick.completedPicks[1].pick = 1;
    duplicatePick.completedPicks[1].round = 1;
    duplicatePick.completedPicks[1].teamId = 'team-a';
    expect(() => validateSnakeDraftManifest(duplicatePick)).toThrow(/pick/i);

    const duplicateClub = structuredClone(build());
    duplicateClub.lockedClubs[1] = { ...duplicateClub.lockedClubs[0] };
    expect(() => validateSnakeDraftManifest(duplicateClub)).toThrow(/club/i);

    const forgedKnown = structuredClone(build());
    forgedKnown.completedPicks[0].salarySource = 'pool-legacy';
    expect(() => validateSnakeDraftManifest(forgedKnown)).toThrow(/salary source/i);

    const forgedSettlement = structuredClone(build());
    forgedSettlement.completedPicks[0].settledSalary = 1;
    forgedSettlement.completedPicks[0].launchSalary = 1;
    expect(() => validateSnakeDraftManifest(forgedSettlement)).toThrow(/frozen pool IV/i);

    const forgedLegacy = structuredClone(build());
    forgedLegacy.completedPicks[0].settledSalary = null;
    forgedLegacy.completedPicks[0].salarySource = 'pick';
    expect(() => validateSnakeDraftManifest(forgedLegacy)).toThrow(/salary source/i);

    const shiftedOrder = structuredClone(build());
    shiftedOrder.pickOrder = shiftedOrder.pickOrder.map((slot) => ({ ...slot, pick: slot.pick + 1 }));
    shiftedOrder.completedPicks = shiftedOrder.completedPicks.map((pick) => ({ ...pick, pick: pick.pick + 1 }));
    expect(() => validateSnakeDraftManifest(shiftedOrder)).toThrow(/contiguous/i);

    const badProvenance = structuredClone(build());
    badProvenance.seasonNumber = 0;
    expect(() => validateSnakeDraftManifest(badProvenance)).toThrow(/positive integers/i);

    const badPhase = structuredClone(build());
    badPhase.phase = 'POSTSEASON' as never;
    expect(() => validateSnakeDraftManifest(badPhase)).toThrow(/phase/i);
  });

  test('retry is byte-stable and later session mutation cannot change frozen truth', () => {
    const session = completedSession();
    const first = freezeSnakeDraftSession({
      session, expectedPhase: 'MLB', poolPlayerIds: ['p1', 'p2'],
      salaryByPlayerId: new Map([['p1', 100_000], ['p2', 120_000]]),
      frozenAt: '2026-07-12T12:00:00.000Z',
    });
    const retry = freezeSnakeDraftSession({
      session: first, expectedPhase: 'MLB', poolPlayerIds: ['mutated'],
      salaryByPlayerId: new Map([['p1', 999], ['p2', 999]]),
      frozenAt: '2099-01-01T00:00:00.000Z',
    });
    expect(JSON.stringify(retry.draftManifest)).toBe(JSON.stringify(first.draftManifest));

    const foreign = { ...completedSession(), id: 'foreign-session', draftManifest: first.draftManifest };
    expect(() => freezeSnakeDraftSession({
      session: foreign, expectedPhase: 'MLB', poolPlayerIds: ['p1', 'p2'],
      salaryByPlayerId: new Map([['p1', 100_000], ['p2', 120_000]]),
      frozenAt: '2026-07-12T12:00:00.000Z',
    })).toThrow(/session/i);

    const mutated = {
      ...retry,
      pickOrder: retry.pickOrder.map((pick) => ({ ...pick, teamId: 'attacker' })),
      completedPicks: retry.completedPicks.map((pick) => ({ ...pick, teamId: 'attacker', settledSalary: 1 })),
    };
    const truth = readSnakeDraftTruth(mutated, 'MLB');
    expect(truth.completedPicks.map((pick) => [pick.teamId, pick.launchSalary])).toEqual([
      ['team-a', 100_000],
      ['team-b', 120_000],
    ]);
  });
});
