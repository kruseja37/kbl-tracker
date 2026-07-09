import { describe, expect, test } from 'vitest';

import { LEAGUE_MINIMUM_SALARY, auctionMaxBid } from '../../data/rosterEngineConstants';
import { LEGAL_ROSTER, isLegalRoster, type RosterSlotPlayer } from '../../data/rosterConstruction';
import { cheapestLegalCompletion, type CompletionCandidate } from '../auctionCompletionFloor';
import { settleFromShills } from '../auctionSettleFromShills';
import {
  advanceLot,
  claimLoneSurvivor,
  getTeamAuctionMaxBid,
  MAX_RESERVE_RENOMINATION_PASSES,
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
      ['rp-second', 6_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['cp-pricier', 8_000, { isPitcher: true, position: 'P', role: 'CP' }],
    ]);
    const quote = cheapestLegalCompletion(roster, pool, 2);
    expect(quote.feasible).toBe(true);
    // Hitters sit at the 14 ceiling, so both picks must be arms; the CP is dearer than the
    // second RP, but the require-a-closer law reserves it.
    expect([...quote.pickIds].sort()).toEqual(['cp-pricier', 'rp-cheap']);
    expect(quote.cost).toBe(13_000);
  });

  test('closer reservation substitutes a pricier CP for the all-RP cheapest bullpen prefix', () => {
    const roster: RosterSlotPlayer[] = [
      ...TEMPLATE.slice(0, 14),
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'RP' },
      { isPitcher: true, position: 'P', role: 'RP' },
    ];
    const pool = candidates([
      ['rp-5000', 5_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['rp-6000', 6_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['cp-8000', 8_000, { isPitcher: true, position: 'P', role: 'CP' }],
      ['cp-9000', 9_000, { isPitcher: true, position: 'P', role: 'CP' }],
    ]);
    const quote = cheapestLegalCompletion(roster, pool, 2);
    expect(quote.feasible).toBe(true);
    expect(quote.pickIds).toEqual(['rp-5000', 'cp-8000']);
    expect(quote.cost).toBe(13_000);
    expect(quote.cost).not.toBe(11_000);
  });

  test('infeasible when a closer-less roster has no CP left in the pool', () => {
    const roster: RosterSlotPlayer[] = [
      ...TEMPLATE.slice(0, 14),
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'RP' },
      { isPitcher: true, position: 'P', role: 'RP' },
    ];
    const pool = candidates([
      ['rp-5000', 5_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['rp-6000', 6_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['rp-7000', 7_000, { isPitcher: true, position: 'P', role: 'RP' }],
    ]);
    expect(cheapestLegalCompletion(roster, pool, 2).feasible).toBe(false);
  });

  test('a roster that already has a CP keeps the plain cheapest relievers', () => {
    const roster: RosterSlotPlayer[] = [
      ...TEMPLATE.slice(0, 14),
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'RP' },
      { isPitcher: true, position: 'P', role: 'CP' },
    ];
    const pool = candidates([
      ['rp-5000', 5_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['rp-6000', 6_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['cp-8000', 8_000, { isPitcher: true, position: 'P', role: 'CP' }],
    ]);
    const quote = cheapestLegalCompletion(roster, pool, 2);
    expect(quote.feasible).toBe(true);
    expect(quote.pickIds).toEqual(['rp-5000', 'rp-6000']);
    expect(quote.cost).toBe(11_000);
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

  test('deterministic id tie-break at equal price when closer is already rostered', () => {
    const roster: RosterSlotPlayer[] = [
      ...TEMPLATE.slice(0, 14),
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'SP' },
      { isPitcher: true, position: 'P', role: 'RP' },
      { isPitcher: true, position: 'P', role: 'RP' },
      { isPitcher: true, position: 'P', role: 'CP' },
    ];
    const pool = candidates([
      ['rp-b', 5_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['rp-a', 5_000, { isPitcher: true, position: 'P', role: 'RP' }],
      ['rp-c', 5_000, { isPitcher: true, position: 'P', role: 'RP' }],
    ]);
    const quote = cheapestLegalCompletion(roster, pool, 1);
    expect(quote.feasible).toBe(true);
    expect(quote.pickIds).toEqual(['rp-a']);
  });
});

// ---------------------------------------------------------------------------------------------
// THE REPRO PAIR (JK 2026-07-01: "the current auction floor logic is broken, which disallows
// teams to finish the draft every time"). Both failure modes of the old formula, reproduced
// against its still-exported arithmetic, then shown fixed by the live machine.
// ---------------------------------------------------------------------------------------------

const ASK = 10_000;

function player(id: string, shape: RosterSlotPlayer, iv = 20_000): AuctionPlayer {
  return { playerId: id, iv, ivPercentile: 50, pos: shape };
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

function reject<T extends { ok: boolean; session: AuctionSession }>(result: T): T & { ok: false } {
  expect(result.ok).toBe(false);
  return result as T & { ok: false };
}

function driveAllPassToCompletion(
  start: AuctionSession,
  maxSteps = 50,
): { session: AuctionSession; steps: number } {
  let session = start;
  for (let step = 0; step < maxSteps; step += 1) {
    if (session.state === 'AUCTION_COMPLETE') return { session, steps: step };
    if (session.state === 'NOMINATION') {
      session = ok(surfaceNextPlayer(session));
    } else if (session.state === 'OPEN_BIDDING') {
      if (session.currentLot?.stillIn.length === 1) {
        session = ok(resolveLot(session));
      } else {
        const bidder = session.currentLot?.bidTurnTeamId;
        if (!bidder) session = ok(resolveLot(session));
        else session = ok(passBid(session, bidder));
      }
    } else if (session.state === 'RESOLVE') {
      session = session.pendingClaim ? ok(passLoneSurvivorOut(session)) : ok(resolveLot(session));
    } else if (session.state === 'SOLD' || session.state === 'PASSED') {
      session = ok(advanceLot(session));
    } else {
      throw new Error(`Unexpected auction state ${(session as AuctionSession).state}`);
    }
  }
  throw new Error(`Auction did not terminate within ${maxSteps} steps`);
}

describe('the broken-floor repro pair', () => {
  test('phantom-tax over-reserve: the old cap froze every team out; the new floor finishes the draft', () => {
    // Two teams, two open slots each, needing arms; every lot asks 10k.
    //
    // TAXTEETH (JK ruling 2026-07-08) repointed team.projectedTax at a NARROWER quantity than the
    // one this test was chartered to prove doesn't choke the floor: the MARGINAL tax of winning
    // only the CURRENT lot's candidate (auctionMarginalTax), not the old per-lot FULL-roster
    // recompute (computeAuctionTeamProjectedTaxWithCaps) that `applyAuctionLuxuryTaxForLot` used to
    // write and that C2B stripped from the ceiling. A realistic one-acquisition marginal figure is
    // bounded by a handful of cap-row breaches (a few thousand, per the tuned LUXURY_CAP_TABLES
    // minAdder/penaltyPer100 magnitudes) -- nothing like the old cumulative full-roster number,
    // which is preserved below ONLY as `phantomFullRosterTax`, a value fed straight into the
    // still-unchanged, still-exported `auctionMaxBid` for documentary comparison, decoupled from
    // the session fixture. The marginal figure is intentionally >0 so this test ALSO proves the
    // new mechanism's real teeth: it now reduces the ceiling by a genuine amount (see the updated
    // assertions below), just not the old phantom, ever-growing, every-team, every-lot amount.
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
    const phantomFullRosterTax = 45_000;
    const marginalTax = 3_000;
    const teams = [
      team('team-a', budget, rosteredA.map((p) => p.playerId), 2, marginalTax),
      team('team-b', budget, rosteredB.map((p) => p.playerId), 2, marginalTax),
    ];
    let session = midDraftSession({ teams, rostered: [...rosteredA, ...rosteredB], available: pool });

    // The OLD formula (still exported, unchanged), fed the OLD-style full-roster phantom number,
    // still prices every team out of every lot -- this is exactly why C2B stripped it:
    const oldCap = auctionMaxBid(budget, 2, LEAGUE_MINIMUM_SALARY, phantomFullRosterTax);
    expect(oldCap).toBeLessThan(ASK); // < the only price any lot can clear at → guaranteed strand

    // The NEW floor reserves the real completion cost PLUS the real marginal tax -- not the old
    // phantom full-roster figure. Between lots there is no specific candidate to reserve tax for
    // (marginalTax is 0); once a lot is up it prices winning THAT candidate: completion cost for
    // the one remaining slot, plus this candidate's own marginal tax contribution.
    expect(getTeamAuctionMaxBid(session, 'team-a')).toBe(budget - 2 * ASK);
    const surfaced = ok(surfaceNextPlayer(session));
    expect(getTeamAuctionMaxBid(surfaced, 'team-a')).toBe(budget - ASK - marginalTax);

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

  test('F1/F2 reserve pricing: exhaustion cleanup completes the team at reserve price when k is enabled', () => {
    const reserveSalary = 13_000;
    const rostered = TEMPLATE.slice(0, 21).map((shape, i) => player(`f2r-${i}`, shape));
    const passed = player('f2r-cp', { isPitcher: true, position: 'P', role: 'CP' });
    let session = midDraftSession({
      teams: [team('team-a', 50_000, rostered.map((p) => p.playerId), 1, 0)],
      rostered: [...rostered, passed],
      available: [],
    });
    session = {
      ...session,
      state: 'PASSED',
      config: { ...session.config, reserveFractionK: 0.65 },
      results: [
        {
          playerId: passed.playerId,
          disposition: 'PASSED',
          nominatorTeamId: 'team-a',
          winnerTeamId: null,
          salary: null,
        },
      ],
    };

    session = ok(advanceLot(session));

    expect(session.state).toBe('AUCTION_COMPLETE');
    const teamA = session.teams[0];
    expect(teamA.rosterSlotsRemaining).toBe(0);
    expect(teamA.budgetRemaining).toBe(50_000 - reserveSalary);
    expect(teamA.roster.at(-1)).toEqual({ playerId: passed.playerId, salary: reserveSalary });
    expect(session.results[0]).toMatchObject({
      disposition: 'SOLD',
      winnerTeamId: 'team-a',
      salary: reserveSalary,
      bidderSet: ['team-a'],
      underbidder: null,
      numBidders: 1,
    });
  });

  test('M1J: nomination-exhaustion terminal path backfills active passed lots before completing', () => {
    const rostered = TEMPLATE.slice(0, 21).map((shape, i) => player(`m1j-${i}`, shape));
    const passed = player('m1j-cp', { isPitcher: true, position: 'P', role: 'CP' });
    const budget = 20_000;
    let session = midDraftSession({
      teams: [team('team-a', budget, rostered.map((p) => p.playerId), 1, 0)],
      rostered: [...rostered, passed],
      available: [],
    });
    session = {
      ...session,
      state: 'NOMINATION',
      results: [
        {
          playerId: passed.playerId,
          disposition: 'PASSED',
          nominatorTeamId: 'team-a',
          winnerTeamId: null,
          salary: null,
        },
      ],
    };

    session = ok(surfaceNextPlayer(session));

    expect(session.state).toBe('AUCTION_COMPLETE');
    expect(session.teams[0].rosterSlotsRemaining).toBe(0);
    expect(session.teams[0].budgetRemaining).toBeCloseTo(budget - LEAGUE_MINIMUM_SALARY, 6);
    expect(session.results[0]).toMatchObject({
      disposition: 'SOLD',
      winnerTeamId: 'team-a',
      salary: LEAGUE_MINIMUM_SALARY,
    });
  });

  test('M1J: enriched genuinely uncompletable exhaustion is explicit and not AUCTION_COMPLETE', () => {
    const rostered = TEMPLATE.slice(0, 21).map((shape, i) => player(`m1j-bad-${i}`, shape));
    const passed = player('m1j-extra-bat', { isPitcher: false, position: 'LF', secondaryPosition: 'OF' });
    let session = midDraftSession({
      teams: [team('team-a', 20_000, rostered.map((p) => p.playerId), 1, 0)],
      rostered: [...rostered, passed],
      available: [],
    });
    session = {
      ...session,
      state: 'NOMINATION',
      results: [
        {
          playerId: passed.playerId,
          disposition: 'PASSED',
          nominatorTeamId: 'team-a',
          winnerTeamId: null,
          salary: null,
        },
      ],
    };

    const result = reject(surfaceNextPlayer(session));

    expect(result.reason).toBe('auction-uncompletable');
    expect(result.session.state).toBe('NOMINATION');
    expect(result.session.terminalShortfall).toEqual({
      status: 'uncompletable',
      teamIds: ['team-a'],
    });
    expect(result.session.teams[0].rosterSlotsRemaining).toBe(1);
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

  test('F1 reserve renomination blocker: k=0.65 torched team with non-tight catcher supply terminates and completes legally', () => {
    const reserveIv = 100_000; // k=0.65 => 65k opening ask, unaffordable to the torched team.
    const budget = 2_000;
    const rostered = TEMPLATE
      .filter((_, index) => index !== 8) // 21 players, only one C-coverer; one backup-C slot open.
      .map((shape, index) => player(`f1-loop-rostered-${index}`, shape));
    const pool = [
      player('f1-loop-c-a', { isPitcher: false, position: 'C', secondaryPosition: null }, reserveIv),
      player('f1-loop-c-b', { isPitcher: false, position: 'C', secondaryPosition: null }, reserveIv),
    ];
    let session = midDraftSession({
      teams: [team('team-a', budget, rostered.map((p) => p.playerId), 1, 0)],
      rostered,
      available: pool,
    });
    session = { ...session, config: { ...session.config, reserveFractionK: 0.65 } };

    const result = driveAllPassToCompletion(session, 30);

    expect(result.session.state).toBe('AUCTION_COMPLETE');
    expect(result.steps).toBeLessThan(30);
    expect(result.session.teams[0].rosterSlotsRemaining).toBe(0);
    expect(result.session.teams[0].budgetRemaining).toBeGreaterThanOrEqual(0);
    expect(result.session.teams[0].roster.at(-1)?.salary).toBe(budget);
    expect(result.session.teams[0].budgetRemaining).toBe(0);
    expect(result.session.passCountByPlayerId).toBeDefined();
    for (const passCount of Object.values(result.session.passCountByPlayerId ?? {})) {
      expect(passCount).toBeLessThanOrEqual(MAX_RESERVE_RENOMINATION_PASSES);
    }
  });

  test('F1 k=0 torched-team leg keeps the legacy permanent-pass cleanup shape', () => {
    const reserveIv = 100_000;
    const budget = 2_000;
    const rostered = TEMPLATE
      .filter((_, index) => index !== 8)
      .map((shape, index) => player(`f1-k0-rostered-${index}`, shape));
    const pool = [
      player('f1-k0-c-a', { isPitcher: false, position: 'C', secondaryPosition: null }, reserveIv),
      player('f1-k0-c-b', { isPitcher: false, position: 'C', secondaryPosition: null }, reserveIv),
    ];
    const result = driveAllPassToCompletion(midDraftSession({
      teams: [team('team-a', budget, rostered.map((p) => p.playerId), 1, 0)],
      rostered,
      available: pool,
    }), 10);

    expect(result.session.state).toBe('AUCTION_COMPLETE');
    expect(result.steps).toBeLessThan(10);
    expect(result.session.passCountByPlayerId).toBeUndefined();
    expect(result.session.availablePlayerIds).toEqual([]);
    expect(result.session.saleCount).toBe(1);
    expect(result.session.results).toHaveLength(2);
    expect(result.session.results.map((row) => row.disposition).sort()).toEqual(['PASSED', 'SOLD']);
    expect(result.session.teams[0].roster.at(-1)?.salary).toBeCloseTo(LEAGUE_MINIMUM_SALARY, 6);
  });

  test('F1 all-pass surplus at k=0.65 terminates instead of cycling on re-added lots', () => {
    const players = [
      player('surplus-c-a', { isPitcher: false, position: 'C', secondaryPosition: null }, 100_000),
      player('surplus-c-b', { isPitcher: false, position: 'C', secondaryPosition: null }, 100_000),
      player('surplus-c-c', { isPitcher: false, position: 'C', secondaryPosition: null }, 100_000),
    ];
    let session = midDraftSession({
      teams: [team('team-a', 2_000, [], 1, 0)],
      rostered: [],
      available: players,
    });
    session = {
      ...session,
      config: { ...session.config, reserveFractionK: 0.65 },
    };

    const result = driveAllPassToCompletion(session, 50);

    expect(result.session.state).toBe('AUCTION_COMPLETE');
    expect(result.steps).toBeLessThan(50);
    expect(result.session.availablePlayerIds).toEqual([]);
    for (const passCount of Object.values(result.session.passCountByPlayerId ?? {})) {
      expect(passCount).toBeLessThanOrEqual(MAX_RESERVE_RENOMINATION_PASSES);
    }
  });

  test('F1 all-pass surplus at k=0 keeps the legacy one-pass-per-player drain shape', () => {
    const players = [
      player('surplus-k0-c-a', { isPitcher: false, position: 'C', secondaryPosition: null }, 100_000),
      player('surplus-k0-c-b', { isPitcher: false, position: 'C', secondaryPosition: null }, 100_000),
      player('surplus-k0-c-c', { isPitcher: false, position: 'C', secondaryPosition: null }, 100_000),
    ];
    const result = driveAllPassToCompletion(midDraftSession({
      teams: [team('team-a', 2_000, [], 1, 0)],
      rostered: [],
      available: players,
    }), 15);

    expect(result.session.state).toBe('AUCTION_COMPLETE');
    expect(result.session.passCountByPlayerId).toBeUndefined();
    expect(result.session.availablePlayerIds).toEqual([]);
    expect(result.session.results.filter((row) => row.disposition === 'PASSED')).toHaveLength(3);
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
// F21 (tonight's gauntlet leg 3, live browser 8-team + 2-shill pool-first draft): the pool ran dry
// with two real clubs each 1 short of a legal 22 while market shills held won players. The old
// terminal cascade only ever pulled from PASSED lots (backfillFromPassedLots) — never from
// shill-held rosters — so it refused AUCTION_COMPLETE on the shortfall while the ONLY recovery
// (settleFromShills) is itself gated on state === AUCTION_COMPLETE. Circular deadlock; NEXT LOT
// became a permanent no-op. The fix: finalizeTerminalAuction now reclaims shill-held players via
// the settle-from-shills CORE (auctionSettleFromShills.ts) before ever declaring a shortfall.
// ---------------------------------------------------------------------------------------------

describe('F21: terminal-cascade shill reclamation (the leg-3 deadlock)', () => {
  const missingCpShapes = TEMPLATE.filter((_, index) => index !== 21); // no CP → minClosers=0
  const missing3bShapes = TEMPLATE.filter((_, index) => index !== 3); // no primary 3B

  function repro(shillRoster: AuctionPlayer[]): AuctionSession {
    const rosteredA = missingCpShapes.map((shape, i) => player(`a21-${i}`, shape));
    const rosteredB = missing3bShapes.map((shape, i) => player(`b21-${i}`, shape));
    const teams = [
      team('team-a', 50_000, rosteredA.map((p) => p.playerId), 1, 0),
      team('team-b', 50_000, rosteredB.map((p) => p.playerId), 1, 0),
      team('shill', 50_000, shillRoster.map((p) => p.playerId), LEGAL_ROSTER.size - shillRoster.length, 0),
    ];
    let session = midDraftSession({
      teams,
      rostered: [...rosteredA, ...rosteredB, ...shillRoster],
      available: [],
    });
    session = {
      ...session,
      state: 'PASSED',
      nominationOrder: ['team-a', 'team-b', 'shill'],
      config: { ...session.config, nonCompletingTeamIds: ['shill'] },
      results: [],
    };
    return session;
  }

  test('a/b: pool-exhausted shortfall reclaims shill-held players position-aware; both real clubs finish legal, no real player is stranded', () => {
    const shillCp = player('shill-cp', { isPitcher: true, position: 'P', role: 'CP' });
    const shill3b = player('shill-3b', { isPitcher: false, position: '3B', secondaryPosition: null });
    // Distractors mirroring the live repro's "shills holding ~10 players" shape — neither fills
    // either club's actual hole, proving the pick is need-driven, not first-available.
    const distractor1b = player('shill-extra-1b', { isPitcher: false, position: '1B', secondaryPosition: 'OF' });
    const distractorRp = player('shill-extra-rp', { isPitcher: true, position: 'P', role: 'RP' });
    const session = repro([shillCp, shill3b, distractor1b, distractorRp]);

    const result = advanceLot(session);
    expect(result.ok).toBe(true);
    const completed = ok(result);

    expect(completed.state).toBe('AUCTION_COMPLETE');
    expect(completed.terminalShortfall).toBeUndefined();

    const teamA = completed.teams.find((t) => t.teamId === 'team-a')!;
    const teamB = completed.teams.find((t) => t.teamId === 'team-b')!;
    expect(teamA.rosterSlotsRemaining).toBe(0);
    expect(teamB.rosterSlotsRemaining).toBe(0);
    // Position-aware: team-a's hole was a CP, team-b's was a 3B — each gets exactly its need,
    // not the other's distractor.
    expect(teamA.roster.map((a) => a.playerId)).toContain('shill-cp');
    expect(teamB.roster.map((a) => a.playerId)).toContain('shill-3b');
    const shapesA = teamA.roster.map((a) => completed.players[a.playerId]!.pos!);
    const shapesB = teamB.roster.map((a) => completed.players[a.playerId]!.pos!);
    expect(isLegalRoster(shapesA)).toBe(true);
    expect(isLegalRoster(shapesB)).toBe(true);

    // Persisted rosters: only the two real clubs hold the players that mattered — the shill keeps
    // its two UNNEEDED distractors (it was never a real franchise; those bodies were pure market
    // pressure) but has given up the two players either real club actually needed. No real player
    // is left short or unassigned.
    const shill = completed.teams.find((t) => t.teamId === 'shill')!;
    expect(shill.roster.map((a) => a.playerId).sort()).toEqual(['shill-extra-1b', 'shill-extra-rp']);
    expect(teamA.roster).toHaveLength(LEGAL_ROSTER.size);
    expect(teamB.roster).toHaveLength(LEGAL_ROSTER.size);

    // The deadlock is broken: settleFromShills (previously UNREACHABLE — state never reached
    // AUCTION_COMPLETE) is now callable at all. With both real clubs already full, it correctly
    // reports them already-complete and leaves the shill's own leftover distractors untouched —
    // those never needed a real home.
    const settled = settleFromShills({
      session: completed,
      positions: Object.fromEntries(
        Object.entries(completed.players)
          .filter((entry): entry is [string, AuctionPlayer & { pos: RosterSlotPlayer }] => Boolean(entry[1].pos))
          .map(([id, p]) => [id, p.pos]),
      ),
      shillTeamIds: ['shill'],
    });
    expect(settled.ok).toBe(false);
    expect(settled.outcomes.every((outcome) => outcome.status === 'already-complete')).toBe(true);
  });

  test('c: no suitable shill player still emits the explicit uncompletable status (no deadlock, no silent completion)', () => {
    // The shill holds bodies that fill NEITHER club's hole (no CP anywhere, no 3B anywhere).
    const distractor1b = player('shill-extra-1b', { isPitcher: false, position: '1B', secondaryPosition: 'OF' });
    const distractorRp = player('shill-extra-rp', { isPitcher: true, position: 'P', role: 'RP' });
    const session = repro([distractor1b, distractorRp]);

    const result = reject(advanceLot(session));

    expect(result.reason).toBe('auction-uncompletable');
    expect(result.session.state).not.toBe('AUCTION_COMPLETE');
    expect(result.session.terminalShortfall?.status).toBe('uncompletable');
    expect(result.session.terminalShortfall?.teamIds).toEqual(expect.arrayContaining(['team-a', 'team-b']));
    // The shill's unrelated bodies were never touched.
    const shill = result.session.teams.find((t) => t.teamId === 'shill')!;
    expect(shill.roster).toHaveLength(2);
  });

  test('reserve-enabled: the reclaimed pick is priced via the Lever-A affordable cap, not the flat ask', () => {
    const shillCp = player('shill-cp', { isPitcher: true, position: 'P', role: 'CP' }, 100_000);
    const shill3b = player('shill-3b', { isPitcher: false, position: '3B', secondaryPosition: null }, 100_000);
    let session = repro([shillCp, shill3b]);
    const tightBudget = 5_000; // below the flat ASK (10_000) — the flat charge would overspend.
    session = {
      ...session,
      config: { ...session.config, reserveFractionK: 0.65, flatReserveFloor: undefined },
      teams: session.teams.map((t) =>
        t.teamId === 'team-a' || t.teamId === 'team-b' ? { ...t, budgetRemaining: tightBudget } : t,
      ),
    };

    const completed = ok(advanceLot(session));

    expect(completed.state).toBe('AUCTION_COMPLETE');
    const teamA = completed.teams.find((t) => t.teamId === 'team-a')!;
    const teamB = completed.teams.find((t) => t.teamId === 'team-b')!;
    // openSlots=1 for each ⇒ affordableSlotPrice = budgetRemaining itself; capped charge = the
    // full (tight) budget, never negative, never above it, never below minSalary.
    expect(teamA.budgetRemaining).toBeCloseTo(0, 6);
    expect(teamB.budgetRemaining).toBeCloseTo(0, 6);
    expect(teamA.roster.at(-1)!.salary).toBeCloseTo(tightBudget, 6);
    expect(teamB.roster.at(-1)!.salary).toBeCloseTo(tightBudget, 6);
  });

  test('e: determinism — the identical session in produces the identical settlement out', () => {
    const shillCp = player('shill-cp', { isPitcher: true, position: 'P', role: 'CP' });
    const shill3b = player('shill-3b', { isPitcher: false, position: '3B', secondaryPosition: null });
    const distractor1b = player('shill-extra-1b', { isPitcher: false, position: '1B', secondaryPosition: 'OF' });
    const session = repro([shillCp, shill3b, distractor1b]);
    const clone = JSON.parse(JSON.stringify(session)) as AuctionSession;

    const first = ok(advanceLot(session));
    const second = ok(advanceLot(clone));

    expect(second).toEqual(first);
  });

  test('d: normal completion (no shortfall) never invokes reclamation — shill roster untouched pre-settle', () => {
    // Both real clubs are ALREADY legal and full; the shill still holds a body. Nothing should be
    // pulled from it during finalizeTerminalAuction — that only happens on a genuine shortfall.
    const rosteredA = TEMPLATE.map((shape, i) => player(`full-a-${i}`, shape));
    const shillBody = player('shill-untouched', { isPitcher: true, position: 'P', role: 'RP' });
    const teams = [
      team('team-a', 50_000, rosteredA.map((p) => p.playerId), 0, 0),
      team('shill', 50_000, [shillBody.playerId], LEGAL_ROSTER.size - 1, 0),
    ];
    let session = midDraftSession({ teams, rostered: [...rosteredA, shillBody], available: [] });
    session = {
      ...session,
      state: 'PASSED',
      nominationOrder: ['team-a', 'shill'],
      config: { ...session.config, nonCompletingTeamIds: ['shill'] },
      results: [],
    };

    const completed = ok(advanceLot(session));

    expect(completed.state).toBe('AUCTION_COMPLETE');
    const shill = completed.teams.find((t) => t.teamId === 'shill')!;
    expect(shill.roster.map((a) => a.playerId)).toEqual(['shill-untouched']);
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
