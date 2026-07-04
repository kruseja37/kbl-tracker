import { describe, expect, test } from 'vitest';

import { LEAGUE_MINIMUM_SALARY, auctionMaxBid } from '../../data/rosterEngineConstants';
import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import { cheapestLegalCompletion, type CompletionCandidate } from '../auctionCompletionFloor';
import {
  advanceLot,
  claimLoneSurvivor,
  getTeamAuctionMaxBid,
  passBid,
  passLoneSurvivorOut,
  recordBid,
  resolveLot,
  surfaceNextPlayer,
  type AuctionPlayer,
  type AuctionSession,
  type AuctionTeamState,
} from '../auctionStateMachine';

// ---------------------------------------------------------------------------------------------
// Shape helpers — the same legal-22 skeleton the C2A harness uses.
// ---------------------------------------------------------------------------------------------

const TEMPLATE: readonly RosterSlotPlayer[] = [
  { isPitcher: false, position: 'C', secondaryPosition: null },
  { isPitcher: false, position: '1B', secondaryPosition: '1B/OF' },
  { isPitcher: false, position: '2B', secondaryPosition: 'IF' },
  { isPitcher: false, position: '3B', secondaryPosition: 'IF' },
  { isPitcher: false, position: 'SS', secondaryPosition: 'IF' },
  { isPitcher: false, position: 'LF', secondaryPosition: 'OF' },
  { isPitcher: false, position: 'CF', secondaryPosition: 'OF' },
  { isPitcher: false, position: 'RF', secondaryPosition: 'OF' },
  { isPitcher: false, position: 'C', secondaryPosition: '1B' },
  { isPitcher: false, position: '1B', secondaryPosition: '1B/OF' },
  { isPitcher: false, position: '2B', secondaryPosition: 'IF/OF' },
  { isPitcher: false, position: 'LF', secondaryPosition: 'OF' },
  { isPitcher: false, position: 'CF', secondaryPosition: 'OF' },
  { isPitcher: false, position: 'SS', secondaryPosition: 'IF' },
  { isPitcher: true, position: 'P', role: 'SP' },
  { isPitcher: true, position: 'P', role: 'SP' },
  { isPitcher: true, position: 'P', role: 'SP' },
  { isPitcher: true, position: 'P', role: 'SP/RP' },
  { isPitcher: true, position: 'P', role: 'RP' },
  { isPitcher: true, position: 'P', role: 'RP' },
  { isPitcher: true, position: 'P', role: 'RP' },
  { isPitcher: true, position: 'P', role: 'CP' },
];

function candidates(entries: Array<[string, number, RosterSlotPlayer]>): CompletionCandidate[] {
  return entries.map(([id, price, shape]) => ({ id, price, shape }));
}

describe('cheapestLegalCompletion', () => {
  test('a legal 22 with zero open slots costs nothing', () => {
    const quote = cheapestLegalCompletion(TEMPLATE, [], 0);
    expect(quote).toEqual({ feasible: true, cost: 0, pickIds: [] });
  });

  test('fills the last two slots with the cheapest eligible bodies', () => {
    const roster = TEMPLATE.slice(0, 20); // 14 hitters + SP,SP,SP,SP/RP,RP,RP
    const pool = candidates([
      ['rp-cheap', 5_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['cp-mid', 7_000, { isPitcher: true, position: 'P', role: 'CP' }],
      ['rp-dear', 9_000, { isPitcher: true, position: 'P', role: 'RP' }],
    ]);
    const quote = cheapestLegalCompletion(roster, pool, 2);
    expect(quote.feasible).toBe(true);
    // Hitters sit at the 14 ceiling, so both picks must be arms; cheapest two win.
    expect(quote.pickIds).toEqual(['rp-cheap', 'cp-mid']);
    expect(quote.cost).toBe(12_000);
  });

  test('joint rotation/bullpen enumeration beats naive per-class greedy', () => {
    // 14 hitters + SP,SP,SP,RP,RP,RP → rotation needs 1, bullpen needs 1.
    const roster = [
      ...TEMPLATE.slice(0, 14),
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'RP' },
      { isPitcher: true, position: 'P', role: 'RP' },
      { isPitcher: true, position: 'P', role: 'RP' },
    ];
    const pool = candidates([
      ['sp-dear', 9_000, { isPitcher: true, position: 'P', role: 'SP' }],
      ['cp-cheap', 5_000, { isPitcher: true, position: 'P', role: 'CP' }],
      ['swing-a', 6_000, { isPitcher: true, position: 'P', role: 'SP/RP' }],
      ['swing-b', 6_500, { isPitcher: true, position: 'P', role: 'SP/RP' }],
    ]);
    const quote = cheapestLegalCompletion(roster, pool, 2);
    expect(quote.feasible).toBe(true);
    // Naive per-class greedy pays SP 9000 + CP 5000 = 14000; the swing covers rotation for 6000.
    expect(quote.cost).toBe(11_000);
    expect([...quote.pickIds].sort()).toEqual(['cp-cheap', 'swing-a']);
  });

  test('catcher depth forces the dearer C-coverer over a cheaper non-coverer', () => {
    // 13 hitters with a single C-coverer + 8 legal arms → one open slot MUST cover C.
    const roster = [
      ...TEMPLATE.slice(0, 8), // the eight primaries (one C, secondary null)
      ...TEMPLATE.slice(9, 14), // five more hitters, none covering C
      ...TEMPLATE.slice(14, 22), // the full legal staff
    ];
    const pool = candidates([
      ['bat-cheap', 3_000, { isPitcher: false, position: '2B', secondaryPosition: 'IF' }],
      ['backup-c', 8_000, { isPitcher: false, position: 'C', secondaryPosition: null }],
    ]);
    const quote = cheapestLegalCompletion(roster, pool, 1);
    expect(quote.feasible).toBe(true);
    expect(quote.pickIds).toEqual(['backup-c']);
    expect(quote.cost).toBe(8_000);
  });

  test('infeasible when the pool cannot restore catcher depth', () => {
    const roster = [
      ...TEMPLATE.slice(0, 8),
      ...TEMPLATE.slice(9, 14),
      ...TEMPLATE.slice(14, 22),
    ];
    const pool = candidates([
      ['bat-cheap', 3_000, { isPitcher: false, position: '2B', secondaryPosition: 'IF' }],
    ]);
    expect(cheapestLegalCompletion(roster, pool, 1).feasible).toBe(false);
  });

  test('deterministic id tie-break at equal price', () => {
    const roster = TEMPLATE.slice(0, 20);
    const pool = candidates([
      ['cp-a', 5_000, { isPitcher: true, position: 'P', role: 'CP' }],
      ['rp-b', 5_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['rp-a', 5_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['rp-c', 5_000, { isPitcher: true, position: 'P', role: 'RP' }],
    ]);
    const quote = cheapestLegalCompletion(roster, pool, 2);
    expect(quote.pickIds).toEqual(['cp-a', 'rp-a']);
  });
});

// ---------------------------------------------------------------------------------------------
// THE REPRO PAIR (JK 2026-07-01: "the current auction floor logic is broken, which disallows
// teams to finish the draft every time"). Both failure modes of the old formula, reproduced
// against its still-exported arithmetic, then shown fixed by the live machine.
// ---------------------------------------------------------------------------------------------

const ASK = 10_000;

function player(id: string, shape: RosterSlotPlayer): AuctionPlayer {
  return { playerId: id, iv: 20_000, ivPercentile: 50, pos: shape };
}

/** Assemble a mid-draft session literally (the crash-restore shape) — no 20-lot warm-up needed. */
function midDraftSession(input: {
  teams: AuctionTeamState[];
  rostered: AuctionPlayer[];
  available: AuctionPlayer[];
}): AuctionSession {
  const all = [...input.rostered, ...input.available];
  return {
    state: 'NOMINATION',
    config: {
      format: 'auction',
      bidIncrement: 1_000,
      turnTimerSeconds: null,
      nominationOrderSeed: 'c2b-repro',
      flatReserveFloor: ASK,
      cpuShillCount: 0,
      excludeFromLeague: true,
    },
    teams: input.teams,
    nominationOrder: input.teams.map((team) => team.teamId),
    nominationIndex: 0,
    nominationRound: 0,
    players: Object.fromEntries(all.map((p) => [p.playerId, p])),
    playerOrder: all.map((p) => p.playerId),
    availablePlayerIds: input.available.map((p) => p.playerId),
    currentLot: null,
    pendingClaim: null,
    results: [],
    saleCount: 0,
  };
}

function team(
  teamId: string,
  budget: number,
  rosterIds: readonly string[],
  slotsRemaining: number,
  projectedTax: number,
): AuctionTeamState {
  return {
    teamId,
    budgetRemaining: budget,
    rosterSlotsRemaining: slotsRemaining,
    minSalary: LEAGUE_MINIMUM_SALARY,
    projectedTax,
    roster: rosterIds.map((playerId) => ({ playerId, salary: 5_000 })),
  };
}

function ok<T extends { ok: boolean; session: AuctionSession }>(result: T): AuctionSession {
  expect(result.ok).toBe(true);
  return result.session;
}

describe('the broken-floor repro pair', () => {
  test('phantom-tax over-reserve: the old cap froze every team out; the new floor finishes the draft', () => {
    // Two teams, two open slots each, needing arms; every lot asks 10k; both carry a 45k
    // projected-tax figure (the live per-lot applyAuctionLuxuryTaxForLot shape).
    const rosterShapes = TEMPLATE.slice(0, 20);
    const rosteredA = rosterShapes.map((shape, i) => player(`a-${i}`, shape));
    const rosteredB = rosterShapes.map((shape, i) => player(`b-${i}`, shape));
    const pool = [
      player('pool-rp-1', { isPitcher: true, position: 'P', role: 'RP' }),
      player('pool-rp-2', { isPitcher: true, position: 'P', role: 'RP' }),
      player('pool-cp-1', { isPitcher: true, position: 'P', role: 'CP' }),
      player('pool-cp-2', { isPitcher: true, position: 'P', role: 'CP' }),
    ];
    const budget = 50_000;
    const tax = 45_000;
    const teams = [
      team('team-a', budget, rosteredA.map((p) => p.playerId), 2, tax),
      team('team-b', budget, rosteredB.map((p) => p.playerId), 2, tax),
    ];
    let session = midDraftSession({ teams, rostered: [...rosteredA, ...rosteredB], available: pool });

    // The OLD formula (still exported, unchanged) priced every team out of every lot:
    const oldCap = auctionMaxBid(budget, 2, LEAGUE_MINIMUM_SALARY, tax);
    expect(oldCap).toBeLessThan(ASK); // < the only price any lot can clear at → guaranteed strand

    // The NEW floor reserves the real completion cost, not the phantom tax. Between lots the
    // ceiling covers BOTH open slots (two 10k bodies); once a lot is up it prices winning THAT
    // candidate (one remaining 10k body).
    expect(getTeamAuctionMaxBid(session, 'team-a')).toBe(budget - 2 * ASK);
    const surfaced = ok(surfaceNextPlayer(session));
    expect(getTeamAuctionMaxBid(surfaced, 'team-a')).toBe(budget - ASK);

    // Drive the machine to completion: 4 lots, alternating winners.
    for (let lot = 0; lot < 4; lot += 1) {
      session = ok(surfaceNextPlayer(session));
      if (session.state !== 'OPEN_BIDDING') break;
      const buyer = session.teams.find((t) => t.rosterSlotsRemaining > 0 && session.currentLot!.stillIn.includes(t.teamId))!;
      const bid = recordBid(session, buyer.teamId, session.currentLot!.openingAsk);
      expect(bid.ok).toBe(true);
      session = bid.ok ? bid.session : session;
      for (const other of session.currentLot!.stillIn.filter((id) => id !== buyer.teamId)) {
        session = ok(passBid(session, other));
      }
      session = ok(resolveLot(session));
      if (session.state === 'RESOLVE') session = ok(claimLoneSurvivor(session));
      if (session.state !== 'AUCTION_COMPLETE') session = ok(advanceLot(session));
    }

    expect(session.state).toBe('AUCTION_COMPLETE');
    for (const t of session.teams) expect(t.rosterSlotsRemaining).toBe(0);
  });

  test('generic-minimum under-reserve: the old cap allowed an unfinishable overspend; the new floor rejects it', () => {
    // One team, three open slots, all of which MUST be arms (hitters sit at the 14 ceiling).
    // Every remaining arm asks 10k, so finishing after this lot really costs 20k.
    const rosterShapes = [
      ...TEMPLATE.slice(0, 14),
      { isPitcher: true, position: 'P', role: 'SP' } as RosterSlotPlayer,
      { isPitcher: true, position: 'P', role: 'SP' } as RosterSlotPlayer,
      { isPitcher: true, position: 'P', role: 'SP' } as RosterSlotPlayer,
      { isPitcher: true, position: 'P', role: 'SP/RP' } as RosterSlotPlayer,
      { isPitcher: true, position: 'P', role: 'RP' } as RosterSlotPlayer,
    ];
    const rostered = rosterShapes.map((shape, i) => player(`r-${i}`, shape));
    const pool = [
      player('pool-rp-1', { isPitcher: true, position: 'P', role: 'RP' }),
      player('pool-rp-2', { isPitcher: true, position: 'P', role: 'RP' }),
      player('pool-cp-1', { isPitcher: true, position: 'P', role: 'CP' }),
      player('pool-cp-2', { isPitcher: true, position: 'P', role: 'CP' }),
    ];
    const budget = 30_000;
    const teams = [
      team('team-a', budget, rostered.map((p) => p.playerId), 3, 0),
      team('team-b', 200_000, [], 22, 0),
    ];
    let session = midDraftSession({ teams, rostered, available: pool });
    session = ok(surfaceNextPlayer(session));
    expect(session.state).toBe('OPEN_BIDDING');

    // The OLD formula reserved two league minimums (~3.3k) and would have blessed a 26k bid…
    const oldCap = auctionMaxBid(budget, 3, LEAGUE_MINIMUM_SALARY, 0);
    const overspend = 26_000;
    expect(oldCap).toBeGreaterThan(overspend);
    // …after which 4k could never buy the two 10k arms still legally required. The new floor
    // reserves the REAL 20k completion cost:
    expect(getTeamAuctionMaxBid(session, 'team-a')).toBe(budget - 2 * ASK);
    const rejected = recordBid(session, 'team-a', overspend);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.reason).toBe('bid-above-solvency-cap');

    // A completion-respecting bid at the same moment sails through.
    const accepted = recordBid(session, 'team-a', ASK);
    expect(accepted.ok).toBe(true);
  });

  test('F1 (C3-fix): the enriched ceiling reserves at least minSalary per open slot, even when asks are cheaper', () => {
    // Live MLB asks are reserveCurve×IV with no flat floor — a cheap completer can ask ~833,
    // BELOW the 1666.49 minimum. The ceiling must still bank minSalary per remaining slot or
    // the minSalary-priced exhaustion cleanup can't rescue the team later.
    const cheapAsk = 833;
    const rostered = TEMPLATE.slice(0, 20).map((shape, i) => player(`f1-${i}`, shape));
    const pool = [
      player('f1-rp-a', { isPitcher: true, position: 'P', role: 'RP' }),
      player('f1-rp-b', { isPitcher: true, position: 'P', role: 'CP' }),
      player('f1-rp-c', { isPitcher: true, position: 'P', role: 'RP' }),
    ];
    const budget = 50_000;
    let session = midDraftSession({
      teams: [
        team('team-a', budget, rostered.map((p) => p.playerId), 2, 0),
        team('team-b', 200_000, [], 22, 0),
      ],
      rostered,
      available: pool,
    });
    session = { ...session, config: { ...session.config, flatReserveFloor: cheapAsk } };
    session = ok(surfaceNextPlayer(session));

    // Candidate-aware: one slot remains after winning; completion cost is 833 but the reserve
    // floor is one league minimum — the ceiling takes the TIGHTER of the two.
    expect(getTeamAuctionMaxBid(session, 'team-a')).toBeCloseTo(budget - LEAGUE_MINIMUM_SALARY, 6);
  });

  test('F1/F2 (C3-fix): unaffordable asks pass out (no negative-budget force-fill) and the exhaustion cleanup completes the team at minSalary', () => {
    // The audit economy end-to-end: asks (2500) > budget (2000) > minSalary (1666.49).
    const ask = 2_500;
    const budget = 2_000;
    const rostered = TEMPLATE.slice(0, 21).map((shape, i) => player(`f2-${i}`, shape));
    const pool = [
      player('f2-cp-1', { isPitcher: true, position: 'P', role: 'CP' }),
      player('f2-cp-2', { isPitcher: true, position: 'P', role: 'CP' }),
    ];
    let session = midDraftSession({
      teams: [team('team-a', budget, rostered.map((p) => p.playerId), 1, 0)],
      rostered,
      available: pool,
    });
    session = { ...session, config: { ...session.config, flatReserveFloor: ask } };

    // Lot 1: the lone survivor cannot afford the ask → claim rejected → pass-out. The lot is not
    // yet load-bearing (a second arm remains), so it dies as genuine surplus.
    session = ok(surfaceNextPlayer(session));
    session = ok(resolveLot(session));
    const claim1 = claimLoneSurvivor(session);
    expect(claim1.ok).toBe(false);
    if (!claim1.ok) expect(claim1.reason).toBe('claim-above-solvency-cap');
    session = ok(passLoneSurvivorOut(session));
    expect(session.results.at(-1)!.disposition).toBe('PASSED');
    session = ok(advanceLot(session));

    // Lot 2: the pool is exhausted behind this lot (remaining 0 < 1 open slot), so the refusal
    // here flows through selectForcedFillerTeam's PRE-EXISTING ceiling guard — the dedicated
    // loadBearingTeam Criterion-1 (F2) guard has its own test below, on the surplus branch.
    session = ok(surfaceNextPlayer(session));
    session = ok(resolveLot(session));
    session = ok(passLoneSurvivorOut(session));
    expect(session.results.at(-1)!.disposition).toBe('PASSED');
    expect(session.teams[0].budgetRemaining).toBe(budget);

    // Exhaustion → the cleanup backfill completes the team at LEAGUE-MINIMUM salary.
    session = ok(advanceLot(session));
    expect(session.state).toBe('AUCTION_COMPLETE');
    const teamA = session.teams[0];
    expect(teamA.rosterSlotsRemaining).toBe(0);
    expect(teamA.budgetRemaining).toBeCloseTo(budget - LEAGUE_MINIMUM_SALARY, 6);
    expect(teamA.budgetRemaining).toBeGreaterThanOrEqual(0);
    const backfilled = session.results.filter((r) => r.disposition === 'SOLD');
    expect(backfilled).toHaveLength(1);
    expect(backfilled[0].salary).toBeCloseTo(LEAGUE_MINIMUM_SALARY, 6);
  });

  test('F2 (C3-fix-2 F7): loadBearingTeam Criterion 1 refuses an unaffordable completion-critical rescue on the SURPLUS branch', () => {
    // remainingPool (1 wrong-class hitter) >= totalOpenSlots (1) → resolveNoBidLot takes the
    // surplus branch and consults loadBearingTeam. The lot player is team-a's ONLY legal
    // completer (hitters sit at the 14 cap, so the leftover hitter cannot complete them), and
    // team-a cannot afford the ask — Criterion 1 fires but its F2 affordability guard must
    // refuse the force-fill rather than mint a negative budget.
    const ask = 2_500;
    const budget = 2_000;
    const rosterShapes = [
      ...TEMPLATE.slice(0, 14), // 14 hitters — the position-player ceiling
      { isPitcher: true, position: 'P', role: 'SP' } as RosterSlotPlayer,
      { isPitcher: true, position: 'P', role: 'SP' } as RosterSlotPlayer,
      { isPitcher: true, position: 'P', role: 'SP' } as RosterSlotPlayer,
      { isPitcher: true, position: 'P', role: 'SP/RP' } as RosterSlotPlayer,
      { isPitcher: true, position: 'P', role: 'RP' } as RosterSlotPlayer,
      { isPitcher: true, position: 'P', role: 'RP' } as RosterSlotPlayer,
      { isPitcher: true, position: 'P', role: 'RP' } as RosterSlotPlayer,
    ];
    const rostered = rosterShapes.map((shape, i) => player(`f7-${i}`, shape));
    const pool = [
      player('f7-only-arm', { isPitcher: true, position: 'P', role: 'CP' }),
      player('f7-extra-bat', { isPitcher: false, position: 'LF', secondaryPosition: 'OF' }),
    ];
    let session = midDraftSession({
      teams: [team('team-a', budget, rostered.map((p) => p.playerId), 1, 0)],
      rostered,
      available: pool,
    });
    session = { ...session, config: { ...session.config, flatReserveFloor: ask } };

    // Force the ARM lot up first so the surplus branch (1 remaining >= 1 open) is exercised.
    session = ok(surfaceNextPlayer(session));
    if (session.currentLot!.playerId !== 'f7-only-arm') {
      // Deterministic nominee selection may surface the bat first — pass it out and take lot 2.
      session = ok(resolveLot(session));
      session = ok(passLoneSurvivorOut(session));
      session = ok(advanceLot(session));
      session = ok(surfaceNextPlayer(session));
    }
    expect(session.currentLot!.playerId).toBe('f7-only-arm');
    const remaining = session.availablePlayerIds.length;
    const openSlots = session.teams[0].rosterSlotsRemaining;
    expect(remaining).toBeGreaterThanOrEqual(openSlots); // the surplus branch, not forced-filler

    session = ok(resolveLot(session));
    session = ok(passLoneSurvivorOut(session));
    expect(session.results.at(-1)!.disposition).toBe('PASSED'); // NOT force-sold
    expect(session.teams[0].budgetRemaining).toBe(budget); // no negative budget
  });

  test('F1 (C3-fix): farm-style sessions (flat floor, no position info) never backfill', () => {
    const bare = (id: string): AuctionPlayer => ({ playerId: id, iv: 5_000, ivPercentile: 50 });
    let session = midDraftSession({
      teams: [team('farm-a', 1_000, [], 2, 0)],
      rostered: [],
      available: [bare('fp-1')],
    });
    session = { ...session, config: { ...session.config, flatReserveFloor: 2_500 } };

    session = ok(surfaceNextPlayer(session));
    session = ok(resolveLot(session));
    session = ok(passLoneSurvivorOut(session));
    expect(session.results.at(-1)!.disposition).toBe('PASSED');
    session = ok(advanceLot(session));

    expect(session.state).toBe('AUCTION_COMPLETE');
    // Position-less → the backfill no-ops: the team stays short and the PASSED result stands.
    expect(session.teams[0].rosterSlotsRemaining).toBe(2);
    expect(session.results.filter((r) => r.disposition === 'PASSED')).toHaveLength(1);
  });

  test('fallback tier: position-less sessions keep the scalar reserve but the phantom tax is stripped', () => {
    const bare = (id: string): AuctionPlayer => ({ playerId: id, iv: 20_000, ivPercentile: 50 });
    const teams = [team('team-a', 50_000, [], 3, 45_000)];
    const session = midDraftSession({ teams, rostered: [], available: [bare('p1'), bare('p2'), bare('p3')] });

    const withTax = auctionMaxBid(50_000, 3, LEAGUE_MINIMUM_SALARY, 45_000);
    const noTax = auctionMaxBid(50_000, 3, LEAGUE_MINIMUM_SALARY, 0);
    expect(getTeamAuctionMaxBid(session, 'team-a')).toBe(noTax);
    expect(getTeamAuctionMaxBid(session, 'team-a')).not.toBe(withTax);
  });
});

// ---------------------------------------------------------------------------------------------
// C2B-FIX F1 (audit C2B_AUDIT_VERDICT_2026-07-02 F1): a coverage-carrying arm INSIDE the required
// rotation/bullpen picks. The old arm enumeration was price-only, so when the sole remaining
// catcher-depth path was a Two-Way(C) arm that was ALSO the required staff pick and slots were
// tight, both attempts returned spurious INFEASIBLE → scalar under-reserve → endgame strand.
// ---------------------------------------------------------------------------------------------

describe('C2B-FIX F1 — coverage-carrying arms inside the required picks', () => {
  const arm = (role: string, twoWay = false): RosterSlotPlayer =>
    twoWay
      ? { isPitcher: true, position: 'P', role, twoWayVariant: 'C' }
      : { isPitcher: true, position: 'P', role };

  /** 13 hitters with exactly ONE C-coverer (the mandatory primary C; TEMPLATE[8] backup-C omitted). */
  const hittersOneCoverer13 = [...TEMPLATE.slice(0, 8), ...TEMPLATE.slice(9, 14)];

  test('the audited corner: rotation deficit + last slot → the Two-Way(C) SP is FEASIBLE at its price', () => {
    // 21 = 13 hitters (1 C-coverer) + 8 arms (3 SP + 4 RP + 1 CP → rotation deficit 1).
    // The single open slot must BOTH start and restore catcher depth — only the Two-Way(C) SP
    // does both. The old code bought the cheaper pure SP, failed the law, and reported
    // INFEASIBLE though this legal 22 exists.
    const roster = [
      ...hittersOneCoverer13,
      arm('SP'), arm('SP'), arm('SP'),
      arm('RP'), arm('RP'), arm('RP'), arm('RP'), arm('CP'),
    ];
    const pool = candidates([
      ['sp-plain', 4_000, arm('SP')],
      ['sp-twoway-c', 9_000, arm('SP', true)],
    ]);
    const quote = cheapestLegalCompletion(roster, pool, 1);
    expect(quote.feasible).toBe(true);
    expect(quote.pickIds).toEqual(['sp-twoway-c']);
    expect(quote.cost).toBe(9_000);
  });

  test('the 14-hitter / closer-deficit variant: the Two-Way(C) CP carries the depth', () => {
    // 21 = 14 hitters (1 C-coverer) + 7 arms (4 SP + 3 RP → closer+relief deficit 1).
    // The hitter side sits at its 14 ceiling, so no covering BAT can ever fit — the required
    // closer must carry the coverage itself.
    const roster = [
      ...hittersOneCoverer13,
      { isPitcher: false, position: 'RF', secondaryPosition: 'OF' } as RosterSlotPlayer,
      arm('SP'), arm('SP'), arm('SP'), arm('SP'),
      arm('RP'), arm('RP'), arm('RP'),
    ];
    const pool = candidates([
      ['cp-plain', 3_500, arm('CP')],
      ['cp-twoway-c', 7_500, arm('CP', true)],
    ]);
    const quote = cheapestLegalCompletion(roster, pool, 1);
    expect(quote.feasible).toBe(true);
    expect(quote.pickIds).toEqual(['cp-twoway-c']);
    expect(quote.cost).toBe(7_500);
  });

  test('the dedicated-coverer route stays price-competitive: min() rejects the dearer covering arm', () => {
    // 20 = 12 hitters (1 C-coverer) + 8 arms (rotation deficit 1); TWO open slots. The biased
    // attempt buys the 9k Two-Way(C) SP; the forced attempt buys the 4k plain SP + the 2k
    // secondary-C bat. The two-attempt min() must keep the cheaper dedicated route.
    const roster = [
      ...TEMPLATE.slice(0, 8),
      ...TEMPLATE.slice(9, 13),
      arm('SP'), arm('SP'), arm('SP'),
      arm('RP'), arm('RP'), arm('RP'), arm('RP'), arm('CP'),
    ];
    const pool = candidates([
      ['sp-plain', 4_000, arm('SP')],
      ['sp-twoway-c', 9_000, arm('SP', true)],
      ['hit-cov', 2_000, { isPitcher: false, position: '2B', secondaryPosition: 'C' }],
      ['hit-plain', 1_000, { isPitcher: false, position: 'LF', secondaryPosition: 'OF' }],
    ]);
    const quote = cheapestLegalCompletion(roster, pool, 2);
    expect(quote.feasible).toBe(true);
    expect(quote.cost).toBe(6_000);
    expect([...quote.pickIds].sort()).toEqual(['hit-cov', 'sp-plain']);
  });

  test('defense-in-depth: a genuinely-infeasible enriched read reserves the real cheapest asks, not bare minimums', () => {
    // 20-man enriched roster needing TWO more arms, but only hitters remain — genuinely
    // infeasible. The fallback ceiling must reserve the pool's REAL asks (10k each), never the
    // far-looser (slots−1)×league-minimum scalar that under-reserved into the F1 strand.
    const rosterShapes = TEMPLATE.slice(0, 20); // 14 hitters + 6 arms (needs 2 more arms)
    const rostered = rosterShapes.map((shape, i) => player(`r-${i}`, shape));
    const pool = [
      player('bat-1', { isPitcher: false, position: '2B', secondaryPosition: 'IF' }),
      player('bat-2', { isPitcher: false, position: 'LF', secondaryPosition: 'OF' }),
    ];
    const budget = 50_000;
    const teams = [team('team-a', budget, rostered.map((p) => p.playerId), 2, 0)];
    const session = midDraftSession({ teams, rostered, available: pool });

    expect(getTeamAuctionMaxBid(session, 'team-a')).toBe(budget - 2 * ASK);
    // The bare scalar would have blessed nearly the whole budget.
    expect(auctionMaxBid(budget, 2, LEAGUE_MINIMUM_SALARY, 0)).toBeGreaterThan(budget - 2 * ASK);
  });
});
