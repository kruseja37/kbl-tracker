import { describe, expect, test } from 'vitest';

import {
  claimLoneSurvivor,
  initAuctionSession,
  passBid,
  recordBid,
  resolveLot,
  sessionBidCeiling,
  surfaceNextPlayer,
  type AuctionPlayer,
  type AuctionSession,
  type AuctionTeamInput,
} from '../auctionStateMachine';

/**
 * TAXTEETH Item 1/2 repro + fix suite. JK ruling 2026-07-08 (spec-docs/contracts/CONTRACT_TAXTEETH_2026-07-08.md):
 * the luxury tax must actually drain budget in the auction, and the bid ceiling must reflect it, so a
 * tax-exposed team no longer bids exactly like a clean one.
 *
 * `team.projectedTax` is the engine's existing (additive, session-scoped) field for "the marginal tax
 * this team would owe if it wins the CURRENT lot's candidate" -- computed externally by
 * useAuctionDraft.ts's applyAuctionLuxuryTaxForLot (via the canonical auctionMarginalTax engine) and
 * carried on AuctionTeamState. These tests set it directly (mirroring the hook's real computation) so
 * the pure engine's settlement/ceiling math can be proven in isolation from player-stat plumbing.
 */

const baseConfig = {
  format: 'auction' as const,
  bidIncrement: 1_000,
  turnTimerSeconds: null,
  nominationOrderSeed: 'taxteeth-seed',
  flatReserveFloor: null,
  cpuShillCount: 0,
  excludeFromLeague: true,
};

function team(id: string, overrides: Partial<AuctionTeamInput> = {}): AuctionTeamInput {
  return {
    teamId: id,
    budgetRemaining: 500_000,
    rosterSlotsRemaining: 22,
    minSalary: 1_000,
    roster: [],
    ...overrides,
  };
}

// ivPercentile: 0 pins the opening ask at exactly 0.5 * iv (reservePriceCurve's floor), so test
// bids can be computed without importing the curve constants directly.
function player(id: string, iv = 10_000): AuctionPlayer {
  return { playerId: id, iv, ivPercentile: 0 };
}

function setProjectedTax(session: AuctionSession, teamId: string, tax: number): AuctionSession {
  return {
    ...session,
    teams: session.teams.map((t) => (t.teamId === teamId ? { ...t, projectedTax: tax } : t)),
  };
}

function openLotForOneCandidate(teams: AuctionTeamInput[], candidate: AuctionPlayer): AuctionSession {
  const initial = initAuctionSession({
    teams,
    players: [candidate],
    config: baseConfig,
  });
  const surfaced = surfaceNextPlayer(initial);
  if (!surfaced.ok) throw new Error(`surfaceNextPlayer rejected: ${surfaced.reason}`);
  return surfaced.session;
}

describe('TAXTEETH Item 1 -- settlement charges the marginal tax (repro then fix)', () => {
  test('a lone-survivor claim drains salary + the team projected marginal tax from budget', () => {
    const teams = [team('team-a'), team('team-b')];
    let session = openLotForOneCandidate(teams, player('candidate-1'));

    // Simulate the hook's per-lot tax recompute: team-a would owe 2,000 in marginal luxury tax if
    // it wins this specific candidate (its roster is already stat-concentrated near the cap).
    session = setProjectedTax(session, 'team-a', 2_000);

    const bid = recordBid(session, 'team-a', 5_000);
    expect(bid.ok).toBe(true);
    if (!bid.ok) return;
    const passed = passBid(bid.session, 'team-b');
    expect(passed.ok).toBe(true);
    if (!passed.ok) return;
    const resolved = resolveLot(passed.session);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const winner = resolved.session.teams.find((t) => t.teamId === 'team-a');
    expect(winner).toBeDefined();
    // THE COHERENCE GUARANTEE: budget must drop by salary + the marginal tax that winning this
    // candidate adds -- not salary alone. On unmodified (pre-fix) code this assertion fails: the
    // engine only ever subtracts `salary` at finalizeSoldLot, so the observed drop is 5,000, not
    // 7,000.
    expect(winner?.budgetRemaining).toBe(500_000 - 5_000 - 2_000);
  });

  test('claimLoneSurvivor (reserve-price claim, no bid ever placed) also drains salary + marginal tax', () => {
    const teams = [team('team-a', { rosterSlotsRemaining: 1 }), team('team-b', { rosterSlotsRemaining: 1 })];
    // candidate-2 at iv 2,000 / ivPercentile 0 -> openingAsk = 0.5 * 2,000 = 1,000.
    let session = openLotForOneCandidate(teams, player('candidate-2', 2_000));
    session = setProjectedTax(session, 'team-a', 1_500);

    // team-b passes before anyone bids -> team-a is the lone survivor at the reserve price.
    const passed = passBid(session, 'team-b');
    expect(passed.ok).toBe(true);
    if (!passed.ok) return;
    const resolved = resolveLot(passed.session);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.session.pendingClaim).toEqual({ playerId: 'candidate-2', teamId: 'team-a', price: 1_000 });

    const claimed = claimLoneSurvivor(resolved.session);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    const winner = claimed.session.teams.find((t) => t.teamId === 'team-a');
    expect(winner?.budgetRemaining).toBe(500_000 - 1_000 - 1_500);
  });
});

describe('TAXTEETH Item 2 -- the bid ceiling reserves the marginal tax (repro then fix)', () => {
  test('sessionBidCeiling (scalar/no-position-info path) is reduced by projectedTax', () => {
    const teams = [team('team-a', { budgetRemaining: 100_000, rosterSlotsRemaining: 2, minSalary: 1_000 }), team('team-b')];
    let session = openLotForOneCandidate(teams, player('candidate-3'));
    // No `pos` on the candidate -> sessionBidCeiling takes the scalar fallback path.
    session = setProjectedTax(session, 'team-a', 10_000);

    const untaxedScalar = 100_000 - (2 - 1) * 1_000; // auctionMaxBid with tax=0
    const ceiling = sessionBidCeiling(session, 'team-a');
    // On unmodified code, ceiling === untaxedScalar (tax argument is a literal 0). Post-fix it must
    // be untaxedScalar - projectedTax.
    expect(ceiling).toBe(untaxedScalar - 10_000);
  });

  test('a bid that would leave the team unable to pay salary + marginal tax is rejected', () => {
    const teams = [team('team-a', { budgetRemaining: 10_000, rosterSlotsRemaining: 1, minSalary: 1_000 }), team('team-b')];
    // candidate-4 at iv 1,000 / ivPercentile 0 -> openingAsk = 500, so 500 is also the minimum
    // legal bid -- isolates the ceiling check from the separate minimum-bid check.
    let session = openLotForOneCandidate(teams, player('candidate-4', 1_000));
    session = setProjectedTax(session, 'team-a', 9_500);

    // team-a has 10,000 total; owes 9,500 in tax if it wins -- it can legally bid at most 500.
    const tooHigh = recordBid(session, 'team-a', 1_500);
    expect(tooHigh.ok).toBe(false);
    if (tooHigh.ok) return;
    expect(tooHigh.reason).toBe('bid-above-solvency-cap');

    const affordable = recordBid(session, 'team-a', 500);
    expect(affordable.ok).toBe(true);
  });
});
