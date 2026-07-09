import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
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
