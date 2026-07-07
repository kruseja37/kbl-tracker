import { describe, expect, it } from 'vitest';

import { DEFAULT_AUCTION_SETUP_CONFIG } from '../../data/auctionEngineConstants';
import { LEGAL_ROSTER, isLegalRoster, type RosterSlotPlayer } from '../../data/rosterConstruction';
import { buildAuctionExitReport } from '../auctionExitGate';
import { settleFromShills, type SettleFromShillsResult } from '../auctionSettleFromShills';
import type { AuctionResult, AuctionSession, AuctionTeamState } from '../auctionStateMachine';
import type { RosterPositionMap } from '../rosterNeed';

const MIN = 3_000;

const H = (position: string, secondaryPosition?: string | null): RosterSlotPlayer => ({
  isPitcher: false,
  position,
  secondaryPosition: secondaryPosition ?? null,
});
const P = (role: 'SP' | 'RP' | 'CP' | 'SP/RP', twoWayVariant?: 'C' | null): RosterSlotPlayer => ({
  isPitcher: true,
  position: role,
  role,
  twoWayVariant: twoWayVariant ?? null,
});

const LEGAL: readonly RosterSlotPlayer[] = [
  H('C'),
  H('1B'),
  H('2B'),
  H('3B'),
  H('SS'),
  H('LF'),
  H('CF'),
  H('RF'),
  H('1B', 'C'),
  H('2B'),
  H('SS'),
  H('LF'),
  H('RF'),
  H('CF'),
  P('SP'),
  P('SP'),
  P('SP'),
  P('SP'),
  P('RP'),
  P('RP'),
  P('RP'),
  P('CP'),
];

function ids(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`);
}

function positionsFrom(entries: readonly [string, RosterSlotPlayer][]): RosterPositionMap {
  return Object.fromEntries(entries);
}

function playersFrom(positions: RosterPositionMap, asks: Record<string, number> = {}) {
  return Object.fromEntries(Object.keys(positions).map((playerId) => [
    playerId,
    {
      playerId,
      iv: asks[playerId] ?? 10_000,
      ivPercentile: 50,
      archetypeWeights: { Power: 1 },
    },
  ]));
}

function team(teamId: string, rosterIds: readonly string[], budget = 500_000): AuctionTeamState {
  return {
    teamId,
    budgetRemaining: budget,
    rosterSlotsRemaining: Math.max(0, LEGAL_ROSTER.size - rosterIds.length),
    minSalary: MIN,
    projectedTax: 0,
    roster: rosterIds.map((playerId) => ({ playerId, salary: 10_000 })),
  };
}

function result(playerId: string, disposition: AuctionResult['disposition'], winnerTeamId: string | null = null): AuctionResult {
  return {
    playerId,
    disposition,
    nominatorTeamId: 'team-a',
    winnerTeamId,
    salary: winnerTeamId ? 10_000 : null,
  };
}

function session(input: {
  teams: AuctionTeamState[];
  positions: RosterPositionMap;
  results: AuctionResult[];
  order?: readonly string[];
  asks?: Record<string, number>;
  state?: AuctionSession['state'];
  flatReserveFloor?: number;
}): AuctionSession {
  return {
    state: input.state ?? 'AUCTION_COMPLETE',
    config: {
      ...DEFAULT_AUCTION_SETUP_CONFIG,
      nominationOrderSeed: 'settle-test',
      flatReserveFloor: input.flatReserveFloor,
    },
    teams: input.teams,
    nominationOrder: input.order ?? input.teams.map((t) => t.teamId),
    nominationIndex: 0,
    nominationRound: 1,
    players: playersFrom(input.positions, input.asks),
    playerOrder: Object.keys(input.positions),
    availablePlayerIds: [],
    currentLot: null,
    pendingClaim: null,
    results: input.results,
    saleCount: input.results.filter((r) => r.disposition === 'SOLD').length,
  };
}

function exitLegal(out: SettleFromShillsResult, positions: RosterPositionMap, teamId: string) {
  const teamState = out.session.teams.find((t) => t.teamId === teamId)!;
  const report = buildAuctionExitReport([{ teamId, rosterIds: teamState.roster.map((a) => a.playerId) }], positions);
  expect(report.clubs[0]).toMatchObject({ legal: true, blockers: [] });
}

describe('settleFromShills', () => {
  it('S1: fills a short club from shill-held leftovers with double-entry and settled provenance', () => {
    const rosterIds = ids('a', 22);
    const missing = new Set(['a-5', 'a-11', 'a-21']);
    const clubIds = rosterIds.filter((id) => !missing.has(id));
    const pickIds = ['ss-fit', 'bench-fit', 'rp-fit'];
    const positions = positionsFrom([
      ...rosterIds.map((id, index) => [id, LEGAL[index]] as [string, RosterSlotPlayer]),
      ['ss-fit', H('SS')],
      ['bench-fit', H('2B')],
      ['rp-fit', P('RP')],
    ]);
    const s = session({
      teams: [
        team('team-a', clubIds),
        team('shill', pickIds),
      ],
      positions,
      results: pickIds.map((id) => result(id, 'SOLD', 'shill')),
      order: ['team-a', 'shill'],
      flatReserveFloor: 20_000,
    });

    const out = settleFromShills({ session: s, positions, shillTeamIds: ['shill'] });

    expect(out.ok).toBe(true);
    expect(out.outcomes[0]).toEqual({
      teamId: 'team-a',
      status: 'settled',
      seatsFilled: 3,
      pickIds: ['ss-fit', 'rp-fit', 'bench-fit'],
      cost: 3 * MIN,
    });
    const buyer = out.session.teams.find((t) => t.teamId === 'team-a')!;
    const shill = out.session.teams.find((t) => t.teamId === 'shill')!;
    expect(buyer.budgetRemaining).toBe(500_000 - 3 * MIN);
    expect(shill.budgetRemaining).toBe(500_000 + 3 * 10_000);
    expect(shill.roster).toHaveLength(0);
    expect(out.session.results.every((row) => row.settled && row.winnerTeamId === 'team-a' && row.salary === MIN)).toBe(true);
    exitLegal(out, positions, 'team-a');
  });

  it('S2: rank-encoded price makes higher fit beat cheaper ask, then ask, then id', () => {
    const baseIds = ids('base', 21);
    const baseShapes = LEGAL.filter((_, index) => index !== 3);
    const run = (fitScores: Record<string, number>, candidates: string[], asks: Record<string, number>, flat?: number) => {
      const positions = positionsFrom([
        ...baseIds.map((id, index) => [id, baseShapes[index]] as [string, RosterSlotPlayer]),
        ...candidates.map((id) => [id, H('3B')] as [string, RosterSlotPlayer]),
      ]);
      const s = session({
        teams: [team('team-a', baseIds), team('shill', candidates)],
        positions,
        results: candidates.map((id) => result(id, 'SOLD', 'shill')),
        order: ['team-a', 'shill'],
        asks,
        flatReserveFloor: flat,
      });
      return settleFromShills({
        session: s,
        positions,
        shillTeamIds: ['shill'],
        fitScores: { 'team-a': fitScores },
      }).outcomes[0].pickIds[0];
    };

    expect(run({ cheap: 1, fit: 10 }, ['cheap', 'fit'], { cheap: 5_000, fit: 50_000 })).toBe('fit');
    expect(run({ cheap: 5, pricey: 5 }, ['cheap', 'pricey'], { cheap: 5_000, pricey: 50_000 })).toBe('cheap');
    expect(run({ 'b-ss': 5, 'a-ss': 5 }, ['b-ss', 'a-ss'], {}, 10_000)).toBe('a-ss');
  });

  it('S3: fit never overrides the legality filter', () => {
    const baseIds = ids('base', 21);
    const baseShapes = LEGAL.filter((_, index) => index !== 3);
    const positions = positionsFrom([
      ...baseIds.map((id, index) => [id, baseShapes[index]] as [string, RosterSlotPlayer]),
      ['best-fit-1b', H('1B')],
      ['legal-3b', H('3B')],
    ]);
    const s = session({
      teams: [team('team-a', baseIds), team('shill', ['best-fit-1b', 'legal-3b'])],
      positions,
      results: [result('best-fit-1b', 'SOLD', 'shill'), result('legal-3b', 'SOLD', 'shill')],
      flatReserveFloor: 10_000,
    });

    const out = settleFromShills({
      session: s,
      positions,
      shillTeamIds: ['shill'],
      fitScores: { 'team-a': { 'best-fit-1b': 100, 'legal-3b': 1 } },
    });

    expect(out.outcomes[0].pickIds).toEqual(['legal-3b']);
  });

  it('S4: mixes passed and shill-held bodies and increments saleCount only for passed lots', () => {
    const baseIds = ids('base', 20);
    const baseShapes = LEGAL.filter((_, index) => index !== 20 && index !== 21);
    const positions = positionsFrom([
      ...baseIds.map((id, index) => [id, baseShapes[index]] as [string, RosterSlotPlayer]),
      ['passed-rp', P('RP')],
      ['shill-cp', P('CP')],
    ]);
    const s = session({
      teams: [team('team-a', baseIds), team('shill', ['shill-cp'])],
      positions,
      results: [result('passed-rp', 'PASSED'), result('shill-cp', 'SOLD', 'shill')],
      flatReserveFloor: 10_000,
    });

    const out = settleFromShills({ session: s, positions, shillTeamIds: ['shill'] });

    expect(out.outcomes[0].pickIds).toEqual(['passed-rp', 'shill-cp']);
    expect(out.session.saleCount).toBe(s.saleCount + 1);
    exitLegal(out, positions, 'team-a');
  });

  it('S5: shared pool is deterministic by nomination order and ignores candidate input order', () => {
    const baseIds = ids('base', 21);
    const baseShapes = LEGAL.slice(0, 21);
    const positions = positionsFrom([
      ...baseIds.map((id, index) => [id, baseShapes[index]] as [string, RosterSlotPlayer]),
      ['catcher', P('CP')],
      ['offshape', H('1B')],
    ]);
    const make = (candidateOrder: string[]) => {
      const allPositions = {
        ...positions,
        ...positionsFrom(baseIds.map((id, index) => [`b-${id}`, baseShapes[index]] as [string, RosterSlotPlayer])),
      };
      return {
        positions: allPositions,
        session: session({
          teams: [
            team('team-a', baseIds),
            team('team-b', baseIds.map((id) => `b-${id}`)),
            team('shill', candidateOrder),
          ],
          positions: allPositions,
          results: ['catcher', 'offshape'].map((id) => result(id, 'SOLD', 'shill')),
          order: ['team-a', 'team-b', 'shill'],
          flatReserveFloor: 10_000,
        }),
      };
    };

    const fixtureA = make(['catcher', 'offshape']);
    const fixtureB = make(['offshape', 'catcher']);
    const outA = settleFromShills({ session: fixtureA.session, positions: fixtureA.positions, shillTeamIds: ['shill'] });
    const outB = settleFromShills({ session: fixtureB.session, positions: fixtureB.positions, shillTeamIds: ['shill'] });

    expect(outA.outcomes.map((o) => [o.teamId, o.status])).toEqual([
      ['team-a', 'settled'],
      ['team-b', 'no-legal-completion'],
    ]);
    expect(outB.session).toEqual(outA.session);
  });

  it('S6: one no-legal-completion club stays untouched while a later club still settles', () => {
    const impossibleIds = ids('imp', 21);
    const fixableIds = ids('fix', 21);
    const no3b = LEGAL.filter((_, index) => index !== 3);
    const noCp = LEGAL.filter((_, index) => index !== 21);
    const positions = positionsFrom([
      ...impossibleIds.map((id, index) => [id, no3b[index]] as [string, RosterSlotPlayer]),
      ...fixableIds.map((id, index) => [id, noCp[index]] as [string, RosterSlotPlayer]),
      ['cp-left', P('CP')],
    ]);
    const s = session({
      teams: [team('team-a', impossibleIds), team('team-b', fixableIds), team('shill', ['cp-left'])],
      positions,
      results: [result('cp-left', 'SOLD', 'shill')],
      order: ['team-a', 'team-b', 'shill'],
      flatReserveFloor: 10_000,
    });

    const out = settleFromShills({ session: s, positions, shillTeamIds: ['shill'] });

    expect(out.ok).toBe(true);
    expect(out.outcomes.map((o) => [o.teamId, o.status])).toEqual([
      ['team-a', 'no-legal-completion'],
      ['team-b', 'settled'],
    ]);
  });

  it('S7: unreadable club rosters block that club, unreadable candidates are dropped', () => {
    const baseIds = ids('base', 21);
    const baseShapes = LEGAL.filter((_, index) => index !== 21);
    const positions = positionsFrom([
      ...baseIds.map((id, index) => [id, baseShapes[index]] as [string, RosterSlotPlayer]),
      ['cp-readable', P('CP')],
    ]);
    const s = session({
      teams: [
        team('team-a', [...baseIds.slice(0, 20), 'missing-own']),
        team('team-b', baseIds),
        team('shill', ['missing-candidate', 'cp-readable']),
      ],
      positions,
      results: [result('missing-candidate', 'SOLD', 'shill'), result('cp-readable', 'SOLD', 'shill')],
      order: ['team-a', 'team-b', 'shill'],
      flatReserveFloor: 10_000,
    });

    const out = settleFromShills({ session: s, positions, shillTeamIds: ['shill'] });

    expect(out.outcomes.map((o) => [o.teamId, o.status, o.pickIds])).toEqual([
      ['team-a', 'unreadable', []],
      ['team-b', 'settled', ['cp-readable']],
    ]);
  });

  it('S8: guards non-complete state, full rosters, illegal-at-22, and fixpoint reruns', () => {
    const fullIds = ids('full', 22);
    const positions = positionsFrom(fullIds.map((id, index) => [id, LEGAL[index]] as [string, RosterSlotPlayer]));
    const nonComplete = session({ state: 'NOMINATION', teams: [team('team-a', fullIds)], positions, results: [] });
    expect(settleFromShills({ session: nonComplete, positions, shillTeamIds: [] })).toMatchObject({
      ok: false,
      rejected: 'expected-auction-complete',
      outcomes: [],
      session: nonComplete,
    });

    const illegalPositions = { ...positions, 'full-5': H('1B') };
    const full = session({ teams: [team('team-a', fullIds)], positions: illegalPositions, results: [] });
    const out = settleFromShills({ session: full, positions: illegalPositions, shillTeamIds: [] });
    expect(out.ok).toBe(false);
    expect(out.outcomes[0].status).toBe('already-complete');
    expect(out.session).toBe(full);
  });

  it('S9: insufficient budget leaves the club untouched', () => {
    const baseIds = ids('base', 21);
    const baseShapes = LEGAL.filter((_, index) => index !== 21);
    const positions = positionsFrom([
      ...baseIds.map((id, index) => [id, baseShapes[index]] as [string, RosterSlotPlayer]),
      ['cp-left', P('CP')],
    ]);
    const s = session({
      teams: [team('team-a', baseIds, MIN - 1), team('shill', ['cp-left'])],
      positions,
      results: [result('cp-left', 'SOLD', 'shill')],
      flatReserveFloor: 10_000,
    });

    const out = settleFromShills({ session: s, positions, shillTeamIds: ['shill'] });
    expect(out.ok).toBe(false);
    expect(out.outcomes[0]).toMatchObject({ status: 'insufficient-budget', seatsFilled: 0 });
    expect(out.session).toBe(s);
  });

  it('S10: every settled outcome satisfies the same auction exit gate', () => {
    const baseIds = ids('base', 21);
    const baseShapes = LEGAL.filter((_, index) => index !== 21);
    const positions = positionsFrom([
      ...baseIds.map((id, index) => [id, baseShapes[index]] as [string, RosterSlotPlayer]),
      ['cp-left', P('CP')],
    ]);
    const s = session({
      teams: [team('team-a', baseIds), team('shill', ['cp-left'])],
      positions,
      results: [result('cp-left', 'SOLD', 'shill')],
      flatReserveFloor: 10_000,
    });

    const out = settleFromShills({ session: s, positions, shillTeamIds: ['shill'] });
    expect(out.outcomes[0].status).toBe('settled');
    const finalShapes = out.session.teams[0].roster.map((assignment) => positions[assignment.playerId]);
    expect(isLegalRoster(finalShapes)).toBe(true);
    exitLegal(out, positions, 'team-a');
    const rerun = settleFromShills({ session: out.session, positions, shillTeamIds: ['shill'] });
    expect(rerun.ok).toBe(false);
    expect(rerun.session).toBe(out.session);
  });
});
