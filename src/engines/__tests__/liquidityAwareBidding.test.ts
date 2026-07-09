import { describe, expect, test } from 'vitest';

import { LUXURY_CAP_TABLES } from '../../data/tierParams';
import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import { luxuryTax, type ConstructionPlayer } from '../leagueConstruction';
import { evaluateLiquidityAwareBid, type LiquidityCompletionCandidate } from '../liquidityAwareBidding';

const hitter = (position: string, secondaryPosition?: string | null): RosterSlotPlayer => ({
  isPitcher: false,
  position,
  secondaryPosition: secondaryPosition ?? null,
});

const pitcher = (role: 'SP' | 'RP' | 'CP' | 'SP/RP'): RosterSlotPlayer => ({
  isPitcher: true,
  position: 'P',
  role,
});

const lowBat: ConstructionPlayer['bat'] = {
  POW: 1,
  CON: 1,
  SPD: 1,
  FLD: 1,
  ARM: 1,
};

function taxHitter(id: string): ConstructionPlayer {
  return {
    id,
    isPitcher: false,
    bat: lowBat,
  };
}

function taxPitcher(id: string, role: 'SP' | 'SP/RP' | 'RP' | 'CP', velocity: number): ConstructionPlayer {
  return {
    id,
    isPitcher: true,
    role,
    bat: lowBat,
    pit: { VEL: velocity, JNK: 1, ACC: 1 },
  };
}

const nearlyCompleteRoster: readonly RosterSlotPlayer[] = [
  hitter('C', '1B'),
  hitter('1B', 'IF/OF'),
  hitter('2B', 'IF'),
  hitter('3B', 'IF'),
  hitter('SS', 'IF'),
  hitter('LF', 'OF'),
  hitter('CF', 'OF'),
  hitter('RF', 'OF'),
  hitter('C', 'C'),
  hitter('1B', 'C'),
  hitter('2B', 'IF/OF'),
  hitter('SS', 'IF'),
  hitter('LF', 'OF'),
  hitter('RF', 'OF'),
  pitcher('SP'),
  pitcher('SP'),
  pitcher('SP'),
  pitcher('SP/RP'),
  pitcher('SP/RP'),
  pitcher('RP'),
];

const highOpenRoster: readonly RosterSlotPlayer[] = nearlyCompleteRoster.slice(0, 12);

const highOpenCompletion = [
  { id: 'completion-rf', value: 60_000, price: 50_000, shape: hitter('RF', 'OF'), player: taxHitter('completion-rf') },
  { id: 'completion-sp-1', value: 60_000, price: 50_000, shape: pitcher('SP'), player: taxPitcher('completion-sp-1', 'SP', 1) },
  { id: 'completion-sp-2', value: 60_000, price: 50_000, shape: pitcher('SP'), player: taxPitcher('completion-sp-2', 'SP', 1) },
  { id: 'completion-sp-3', value: 60_000, price: 50_000, shape: pitcher('SP'), player: taxPitcher('completion-sp-3', 'SP', 1) },
  { id: 'completion-sp-4', value: 60_000, price: 50_000, shape: pitcher('SP'), player: taxPitcher('completion-sp-4', 'SP', 1) },
  { id: 'completion-swing', value: 60_000, price: 50_000, shape: pitcher('SP/RP'), player: taxPitcher('completion-swing', 'SP/RP', 1) },
  { id: 'completion-rp-1', value: 60_000, price: 50_000, shape: pitcher('RP'), player: taxPitcher('completion-rp-1', 'RP', 1) },
  { id: 'completion-rp-2', value: 60_000, price: 50_000, shape: pitcher('RP'), player: taxPitcher('completion-rp-2', 'RP', 1) },
  { id: 'completion-cp', value: 60_000, price: 50_000, shape: pitcher('CP'), player: taxPitcher('completion-cp', 'CP', 88) },
] as const;

function pool(players: Array<{ id: string; value: number; price?: number; shape?: RosterSlotPlayer }>): LiquidityCompletionCandidate[] {
  return players.map((player) => ({
    id: player.id,
    value: player.value,
    price: player.price ?? Math.max(1_000, Math.round(player.value * 0.1)),
    shape: player.shape ?? hitter('RF', 'OF'),
  }));
}

describe('evaluateLiquidityAwareBid', () => {
  test('blocks bids above remaining budget or legal completion ceiling', () => {
    const read = evaluateLiquidityAwareBid({
      playerId: 'target',
      iv: 90_000,
      nextBid: 61_000,
      legalMaxBid: 60_000,
      budgetRemaining: 75_000,
      rosterSlotsRemaining: 3,
      minSalary: 5_000,
      baseValuation: 120_000,
    });

    expect(read.maxBid).toBeLessThanOrEqual(60_000);
    expect(read.nextBidAllowed).toBe(false);
    expect(read.recommendation).toBe('pass');
    expect(read.reasonCodes).toContain('above-legal-ceiling');
  });

  test('preserves future fill reserve before approving the next bid', () => {
    const input = {
      playerId: 'target',
      iv: 90_000,
      nextBid: 70_000,
      legalMaxBid: 100_000,
      budgetRemaining: 100_000,
      rosterSlotsRemaining: 3,
      minSalary: 20_000,
      baseValuation: 100_000,
    };
    const tight = evaluateLiquidityAwareBid(input);
    const safe = evaluateLiquidityAwareBid({
      ...input,
      nextBid: 60_000,
    });

    expect(tight.minimumFutureFillReserve).toBe(40_000);
    expect(tight.discretionaryBudget).toBe(60_000);
    expect(tight.nextBidAllowed).toBe(false);
    expect(tight.reasonCodes).toContain('future-fill-protected');
    expect(safe.nextBidAllowed).toBe(true);
  });

  test('spends more when a roster is nearly complete and cash remains', () => {
    const input = {
      playerId: 'target',
      iv: 80_000,
      nextBid: 72_000,
      legalMaxBid: 200_000,
      budgetRemaining: 200_000,
      rosterSlotsRemaining: 10,
      minSalary: 10_000,
      baseValuation: 80_000,
    };
    const early = evaluateLiquidityAwareBid(input);
    const late = evaluateLiquidityAwareBid({
      ...input,
      rosterSlotsRemaining: 1,
      nextBid: 85_000,
    });

    expect(late.maxBid).toBeGreaterThan(early.maxBid);
    expect(late.reasonCodes).toContain('near-complete');
    expect(late.nextBidAllowed).toBe(true);
  });

  test('raises willingness when replacements are scarce and lowers it when similar replacements remain', () => {
    const input = {
      playerId: 'target',
      iv: 80_000,
      nextBid: 75_000,
      legalMaxBid: 150_000,
      budgetRemaining: 150_000,
      rosterSlotsRemaining: 4,
      baseValuation: 80_000,
      candidateShape: hitter('SS', 'IF'),
      remainingPool: pool([{ id: 'fallback', value: 25_000, shape: hitter('SS', 'IF') }]),
    };
    const scarce = evaluateLiquidityAwareBid(input);
    const abundant = evaluateLiquidityAwareBid({
      ...input,
      remainingPool: pool([
        { id: 'alt-1', value: 78_000, shape: hitter('SS', 'IF') },
        { id: 'alt-2', value: 76_000, shape: hitter('SS', 'IF') },
        { id: 'alt-3', value: 74_000, shape: hitter('SS', 'IF') },
        { id: 'alt-4', value: 72_000, shape: hitter('SS', 'IF') },
      ]),
    });

    expect(scarce.scarcityModifier).toBeGreaterThan(1);
    expect(abundant.scarcityModifier).toBeLessThan(1);
    expect(scarce.maxBid).toBeGreaterThan(abundant.maxBid);
  });

  test('priority need can raise the ceiling but cannot override fill feasibility', () => {
    const input = {
      playerId: 'target',
      iv: 70_000,
      nextBid: 69_000,
      legalMaxBid: 100_000,
      budgetRemaining: 100_000,
      rosterSlotsRemaining: 2,
      minSalary: 20_000,
      baseValuation: 70_000,
      needMultiplier: 1,
    };
    const neutral = evaluateLiquidityAwareBid(input);
    const priority = evaluateLiquidityAwareBid({
      ...input,
      needMultiplier: 1.3,
    });
    const impossible = evaluateLiquidityAwareBid({
      ...input,
      needMultiplier: 1.3,
      nextBid: 85_000,
    });

    expect(priority.maxBid).toBeGreaterThan(neutral.maxBid);
    expect(priority.reasonCodes).toContain('priority-fit');
    expect(impossible.nextBidAllowed).toBe(false);
    expect(impossible.maxBid).toBeLessThanOrEqual(80_000);
  });

  test('uses legal completion cost when production roster shapes are available', () => {
    const read = evaluateLiquidityAwareBid({
      playerId: 'target',
      iv: 75_000,
      nextBid: 40_000,
      legalMaxBid: 90_000,
      budgetRemaining: 100_000,
      rosterSlotsRemaining: 2,
      minSalary: 5_000,
      rosterShapes: nearlyCompleteRoster,
      candidateShape: pitcher('RP'),
      remainingPool: pool([{ id: 'closer', value: 40_000, price: 30_000, shape: pitcher('CP') }]),
      baseValuation: 75_000,
    });

    expect(read.minimumFutureFillReserve).toBe(30_000);
    expect(read.nextBidAllowed).toBe(true);
  });

  test('TAXENGINE READ-3 repro: reserves the concrete completion set incremental tax in fill reserve and room', () => {
    const currentRosterWithCandidate = [
      taxPitcher('held-rp', 'RP', 70),
      taxPitcher('target-rp', 'RP', 70),
    ];
    const completion = taxPitcher('completion-cp', 'CP', 88);
    const completionTax = luxuryTax(
      [...currentRosterWithCandidate, completion],
      LUXURY_CAP_TABLES.standard,
      'taxed',
    ).charged - luxuryTax(currentRosterWithCandidate, LUXURY_CAP_TABLES.standard, 'taxed').charged;
    expect(completionTax).toBeGreaterThan(0);

    const read = evaluateLiquidityAwareBid({
      playerId: 'target-rp',
      iv: 500_000,
      nextBid: 40_000,
      legalMaxBid: 200_000,
      budgetRemaining: 200_000,
      rosterSlotsRemaining: 2,
      minSalary: 5_000,
      rosterShapes: nearlyCompleteRoster,
      candidateShape: pitcher('RP'),
      remainingPool: pool([{ id: 'completion-cp', value: 40_000, price: 30_000, shape: pitcher('CP') }]),
      completionTaxContext: {
        currentRosterWithCandidate,
        playerById: new Map([[completion.id, completion]]),
        baseCaps: LUXURY_CAP_TABLES.standard,
      },
      baseValuation: 500_000,
    });

    expect(read.minimumFutureFillReserve).toBeCloseTo(30_000 + completionTax, 8);
    expect(read.discretionaryBudget).toBeCloseTo(200_000 - 30_000 - completionTax, 8);
  });

  test('TAXENGINE R1: near-complete endgame keeps the original top-priority aggressive posture', () => {
    const read = evaluateLiquidityAwareBid({
      playerId: 'target',
      iv: 90_000,
      nextBid: 90_000,
      legalMaxBid: 120_000,
      budgetRemaining: 80_000,
      rosterSlotsRemaining: 1,
      minSalary: 5_000,
      baseValuation: 100_000,
    });

    expect(read.liquidityState).toBe('aggressive');
    expect(read.reasonCodes).toContain('near-complete');
  });

  test('TAXENGINE R1: constrained posture still requires a high-open roster under the original classifier', () => {
    const read = evaluateLiquidityAwareBid({
      playerId: 'target-rp',
      iv: 500_000,
      nextBid: 20_000,
      legalMaxBid: 100_000,
      budgetRemaining: 100_000,
      rosterSlotsRemaining: 2,
      minSalary: 5_000,
      rosterShapes: nearlyCompleteRoster,
      candidateShape: pitcher('RP'),
      remainingPool: pool([{ id: 'completion-cp', value: 60_000, price: 60_000, shape: pitcher('CP') }]),
      baseValuation: 500_000,
    });

    expect(read.discretionaryBudget / read.legalMaxBid).toBeLessThan(0.45);
    expect(read.liquidityState).toBe('aggressive');
  });

  test('TAXENGINE READ-5 repro: tax-net cash can flip a high-open posture from neutral to constrained', () => {
    const currentRosterWithCandidate = [
      ...highOpenRoster.map((_, index) => taxHitter(`held-hitter-${index}`)),
      taxPitcher('held-rp', 'RP', 70),
      taxPitcher('target-rp', 'RP', 70),
    ];
    const completionPlayers = highOpenCompletion.map((candidate) => candidate.player);
    const completionTax = luxuryTax(
      [...currentRosterWithCandidate, ...completionPlayers],
      LUXURY_CAP_TABLES.standard,
      'taxed',
    ).charged - luxuryTax(currentRosterWithCandidate, LUXURY_CAP_TABLES.standard, 'taxed').charged;
    const completionSalary = highOpenCompletion.reduce((sum, candidate) => sum + candidate.price, 0);
    expect(completionTax).toBeGreaterThan(completionSalary * 0.1);
    expect(completionTax).toBeLessThan(completionSalary - 35_000);

    const baseInput = {
      playerId: 'target-rp',
      iv: 500_000,
      nextBid: 35_000,
      legalMaxBid: completionSalary * 2,
      budgetRemaining: completionSalary * 2,
      rosterSlotsRemaining: 10,
      minSalary: 5_000,
      rosterShapes: highOpenRoster,
      candidateShape: pitcher('RP'),
      remainingPool: pool(highOpenCompletion),
      baseValuation: 500_000,
    };

    const untaxed = evaluateLiquidityAwareBid(baseInput);
    const taxed = evaluateLiquidityAwareBid({
      ...baseInput,
      completionTaxContext: {
        currentRosterWithCandidate,
        playerById: new Map(highOpenCompletion.map((candidate) => [candidate.id, candidate.player])),
        baseCaps: LUXURY_CAP_TABLES.standard,
      },
    });
    const openRatio = baseInput.rosterSlotsRemaining /
      ((baseInput.rosterShapes?.length ?? 0) + baseInput.rosterSlotsRemaining);

    expect(openRatio).toBeGreaterThan(0.45);
    expect(untaxed.discretionaryBudget / untaxed.legalMaxBid).toBe(0.5);
    expect(taxed.discretionaryBudget / taxed.legalMaxBid).toBeLessThan(0.45);
    expect(untaxed.liquidityState).toBe('neutral');
    expect(taxed.liquidityState).toBe('constrained');
  });

  test('TAXENGINE under-cap lock: zero completion tax is byte-identical to the existing read', () => {
    const currentRosterWithCandidate = [
      taxPitcher('held-rp', 'RP', 10),
      taxPitcher('target-rp', 'RP', 10),
    ];
    const completion = taxPitcher('completion-cp', 'CP', 10);
    const completionTax = luxuryTax(
      [...currentRosterWithCandidate, completion],
      LUXURY_CAP_TABLES.standard,
      'taxed',
    ).charged - luxuryTax(currentRosterWithCandidate, LUXURY_CAP_TABLES.standard, 'taxed').charged;
    expect(completionTax).toBe(0);

    const input = {
      playerId: 'target-rp',
      iv: 75_000,
      nextBid: 40_000,
      legalMaxBid: 90_000,
      budgetRemaining: 100_000,
      rosterSlotsRemaining: 2,
      minSalary: 5_000,
      rosterShapes: nearlyCompleteRoster,
      candidateShape: pitcher('RP'),
      remainingPool: pool([{ id: 'completion-cp', value: 40_000, price: 30_000, shape: pitcher('CP') }]),
      baseValuation: 75_000,
    };

    expect(evaluateLiquidityAwareBid({
      ...input,
      completionTaxContext: {
        currentRosterWithCandidate,
        playerById: new Map([[completion.id, completion]]),
        baseCaps: LUXURY_CAP_TABLES.standard,
      },
    })).toEqual(evaluateLiquidityAwareBid(input));
  });

  test('CALLFIX Item 2: the reason chip order is priority-based, not alphabetical -- future-fill-protected and emergency-fill both outrank late-budget-surplus', () => {
    // Reuses the exact "preserves future fill reserve" fixture above -- it already produces all
    // three codes together, giving a real (not synthetic) case where alphabetical order would
    // have picked the wrong "single reason" chip (WhisperPanel.tsx topReason = reasonCodes[0]).
    const read = evaluateLiquidityAwareBid({
      playerId: 'target',
      iv: 90_000,
      nextBid: 70_000,
      legalMaxBid: 100_000,
      budgetRemaining: 100_000,
      rosterSlotsRemaining: 3,
      minSalary: 20_000,
      baseValuation: 100_000,
    });

    expect(read.reasonCodes).toEqual(['future-fill-protected', 'emergency-fill', 'late-budget-surplus']);
    // Sanity: the OLD `.sort()` would have produced this alphabetical order instead -- proving
    // this fixture actually exercises the bug this item fixes.
    expect([...read.reasonCodes].sort()).toEqual(['emergency-fill', 'future-fill-protected', 'late-budget-surplus']);
  });

  test('TAXWIRE Item 3: a tax-squeezed ceiling reads above-legal-ceiling first -- never dropped behind emergency-fill/future-fill-protected/late-budget-surplus', () => {
    // Investigation finding (spec-docs/contracts/CONTRACT_TAXWIRE_2026-07-09.md Item 3):
    // marginal tax reaches this engine through legalMaxBid. Tightening the exact CALLFIX fixture
    // from $100,000 to $65,000 simulates a $35,000 tax reservation and must keep the hard ceiling
    // reason ahead of the more conversational liquidity reasons.
    const read = evaluateLiquidityAwareBid({
      playerId: 'target',
      iv: 90_000,
      nextBid: 70_000,
      legalMaxBid: 65_000,
      budgetRemaining: 100_000,
      rosterSlotsRemaining: 3,
      minSalary: 20_000,
      baseValuation: 100_000,
    });

    expect(read.reasonCodes).toEqual([
      'above-legal-ceiling',
      'future-fill-protected',
      'emergency-fill',
      'late-budget-surplus',
    ]);
    expect(read.reasonCodes[0]).toBe('above-legal-ceiling');
  });

  test('is deterministic for the same live inputs', () => {
    const input = {
      playerId: 'target',
      iv: 80_000,
      nextBid: 62_000,
      legalMaxBid: 120_000,
      budgetRemaining: 150_000,
      rosterSlotsRemaining: 4,
      baseValuation: 82_000,
      candidateShape: hitter('CF', 'OF'),
      remainingPool: pool([
        { id: 'a', value: 70_000, shape: hitter('CF', 'OF') },
        { id: 'b', value: 45_000, shape: hitter('CF', 'OF') },
      ]),
    };

    expect(evaluateLiquidityAwareBid(input)).toEqual(evaluateLiquidityAwareBid(input));
  });
});
