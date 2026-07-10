import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import { LUXURY_CAP_TABLES } from '../../data/tierParams';
import { normalizeAuctionLuxuryCapsForLeagueSize } from '../auctionLuxuryTax';
import { auctionMarginalTaxWithCaps } from '../auctionLuxuryTax';
import {
  keepTargetAllIn,
  type KeepTargetMarketPlayer,
  type KeepTargetPlayer,
  type KeepTargetPoolPlayer,
  type KeepTargetTeam,
} from '../auctionKeepTargetAllIn';
import { luxuryTax, type ConstructionPlayer } from '../leagueConstruction';

function construction(id: string, shape: RosterSlotPlayer, rating: number): ConstructionPlayer {
  return {
    id,
    isPitcher: shape.isPitcher,
    role: shape.role as ConstructionPlayer['role'],
    bat: { POW: rating, CON: rating, SPD: rating, FLD: rating, ARM: rating },
    pit: shape.isPitcher ? { VEL: rating, JNK: rating, ACC: rating } : undefined,
  };
}

function player(id: string, shape: RosterSlotPlayer, rating = 40): KeepTargetPlayer {
  return { id, shape, construction: construction(id, shape, rating) };
}

function legalRoster(rating = 40): KeepTargetPlayer[] {
  const shapes: RosterSlotPlayer[] = [
    { isPitcher: false, position: 'C' },
    { isPitcher: false, position: '1B' },
    { isPitcher: false, position: '2B' },
    { isPitcher: false, position: '3B' },
    { isPitcher: false, position: 'SS' },
    { isPitcher: false, position: 'LF' },
    { isPitcher: false, position: 'CF' },
    { isPitcher: false, position: 'RF' },
    { isPitcher: false, position: '1B', secondaryPosition: 'C' },
    { isPitcher: false, position: '2B' },
    { isPitcher: false, position: 'SS' },
    { isPitcher: false, position: 'LF' },
    { isPitcher: false, position: 'RF' },
    { isPitcher: true, position: 'SP', role: 'SP' },
    { isPitcher: true, position: 'SP', role: 'SP' },
    { isPitcher: true, position: 'SP', role: 'SP' },
    { isPitcher: true, position: 'SP', role: 'SP' },
    { isPitcher: true, position: 'RP', role: 'RP' },
    { isPitcher: true, position: 'RP', role: 'RP' },
    { isPitcher: true, position: 'RP', role: 'RP' },
    { isPitcher: true, position: 'CP', role: 'CP' },
    { isPitcher: true, position: 'RP', role: 'RP' },
  ];
  return shapes.map((shape, index) => player(`legal-${index + 1}`, shape, rating));
}

function planFixture(options: {
  budget?: number;
  currentRating?: number;
  lotRating?: number;
  targetRating?: number;
  fillRating?: number;
  priceY?: number;
  fillPrice?: number;
} = {}): {
  team: KeepTargetTeam;
  lot: KeepTargetPlayer;
  target: KeepTargetMarketPlayer;
  pool: KeepTargetPoolPlayer[];
} {
  const full = legalRoster(options.currentRating ?? 40);
  const team: KeepTargetTeam = {
    budgetRemaining: options.budget ?? 100_000,
    roster: full.slice(0, 19),
  };
  const lotBase = full[19];
  const targetBase = full[20];
  const fillBase = full[21];
  const lot = player(lotBase.id, lotBase.shape, options.lotRating ?? options.currentRating ?? 40);
  const targetPlayer = player(targetBase.id, targetBase.shape, options.targetRating ?? options.currentRating ?? 40);
  const fillPlayer = player(fillBase.id, fillBase.shape, options.fillRating ?? options.currentRating ?? 40);
  return {
    team,
    lot,
    target: { ...targetPlayer, predictedMedian: options.priceY ?? 20_000 },
    pool: [
      { ...targetPlayer, price: options.priceY ?? 20_000 },
      { ...fillPlayer, price: options.fillPrice ?? 3_000 },
    ],
  };
}

describe('keepTargetAllIn', () => {
  test('returns a feasible concrete completion and a still-lands verdict', () => {
    const fixture = planFixture();
    const result = keepTargetAllIn(fixture.team, fixture.lot, 10_000, fixture.target, fixture.pool, [], 20);

    expect(result.verdict).toBe('still-lands');
    expect(result.completionPickIds).toEqual(['legal-22']);
    expect(result.completionCost).toBe(3_000);
    expect(result.allIn).toBe(33_000);
    expect(result.shortfall).toBe(0);
  });

  test("returns can't-finish-roster without inventing an all-in number", () => {
    const fixture = planFixture();
    const result = keepTargetAllIn(
      fixture.team,
      fixture.lot,
      10_000,
      fixture.target,
      fixture.pool.filter((candidate) => candidate.id === fixture.target.id),
      [],
      20,
    );

    expect(result.verdict).toBe('cant-finish-roster');
    expect(result.allIn).toBeNull();
    expect(result.shortfall).toBeNull();
    expect(result.completionCost).toBeNull();
  });

  test('zero-tax league is exactly bid + target median + legal completion cost', () => {
    const fixture = planFixture({ priceY: 17_500, fillPrice: 2_500 });
    const result = keepTargetAllIn(fixture.team, fixture.lot, 9_000, fixture.target, fixture.pool, [], 20);

    expect(result.taxLot).toBe(0);
    expect(result.taxY).toBe(0);
    expect(result.taxFill).toBe(0);
    expect(result.allIn).toBe(9_000 + 17_500 + 2_500);
  });

  test('tax-heavy stars-and-scrubs plan uses the canonical incremental tax deltas', () => {
    // Mirrors the production gauntlet's shape: a star-heavy core plus a cheap legal scrub fill,
    // priced under the production standard-tier cap table.
    const fixture = planFixture({
      budget: 20_000_000,
      currentRating: 95,
      lotRating: 99,
      targetRating: 98,
      fillRating: 20,
      priceY: 90_000,
      fillPrice: 3_000,
    });
    const caps = LUXURY_CAP_TABLES.standard;
    const result = keepTargetAllIn(fixture.team, fixture.lot, 100_000, fixture.target, fixture.pool, caps, 20);
    const roster = fixture.team.roster.map((entry) => entry.construction);
    const afterLot = [...roster, fixture.lot.construction];
    const afterY = [...afterLot, fixture.target.construction];
    const fill = fixture.pool.find((entry) => entry.id === 'legal-22');
    if (!fill) throw new Error('missing fill fixture');

    const expectedLotTax = auctionMarginalTaxWithCaps(roster, fixture.lot.construction, undefined, caps);
    const expectedYTax = auctionMarginalTaxWithCaps(afterLot, fixture.target.construction, undefined, caps);
    const expectedFillTax = luxuryTax([...afterY, fill.construction], caps, 'taxed').charged
      - luxuryTax(afterY, caps, 'taxed').charged;

    expect(result.taxLot).toBe(expectedLotTax);
    expect(result.taxY).toBe(expectedYTax);
    expect(result.taxFill).toBe(expectedFillTax);
    expect(result.taxTotal).toBeGreaterThan(0);
    expect(result.allIn).toBe(100_000 + expectedLotTax + 90_000 + expectedYTax + 3_000 + expectedFillTax);
  });

  test('NORMWIRE repro: a 2-team keep-target quote uses normalized settlement caps', () => {
    const fixture = planFixture({
      budget: 20_000_000,
      currentRating: 95,
      lotRating: 99,
      targetRating: 98,
      fillRating: 20,
      priceY: 90_000,
      fillPrice: 3_000,
    });
    const rawCaps = LUXURY_CAP_TABLES.standard;
    const normalizedCaps = normalizeAuctionLuxuryCapsForLeagueSize(rawCaps, 2);
    const result = keepTargetAllIn(
      fixture.team,
      fixture.lot,
      100_000,
      fixture.target,
      fixture.pool,
      rawCaps,
      2,
    );
    const roster = fixture.team.roster.map((entry) => entry.construction);
    const afterLot = [...roster, fixture.lot.construction];
    const afterY = [...afterLot, fixture.target.construction];
    const fill = fixture.pool.find((entry) => entry.id === 'legal-22');
    if (!fill) throw new Error('missing fill fixture');
    const expectedLotTax = auctionMarginalTaxWithCaps(roster, fixture.lot.construction, undefined, normalizedCaps);
    const expectedYTax = auctionMarginalTaxWithCaps(afterLot, fixture.target.construction, undefined, normalizedCaps);
    const expectedFillTax = luxuryTax([...afterY, fill.construction], normalizedCaps, 'taxed').charged
      - luxuryTax(afterY, normalizedCaps, 'taxed').charged;

    expect(result.taxTotal).toBe(expectedLotTax + expectedYTax + expectedFillTax);
    expect(result.taxTotal).toBeLessThan(
      auctionMarginalTaxWithCaps(roster, fixture.lot.construction, undefined, rawCaps)
        + auctionMarginalTaxWithCaps(afterLot, fixture.target.construction, undefined, rawCaps)
        + luxuryTax([...afterY, fill.construction], rawCaps, 'taxed').charged
        - luxuryTax(afterY, rawCaps, 'taxed').charged,
    );
  });

  test('a one-dollar bid step flips the target from still-lands to gone with a one-dollar shortfall', () => {
    const fixture = planFixture({ budget: 33_000 });
    const atBoundary = keepTargetAllIn(fixture.team, fixture.lot, 10_000, fixture.target, fixture.pool, [], 20);
    const oneOver = keepTargetAllIn(fixture.team, fixture.lot, 10_001, fixture.target, fixture.pool, [], 20);

    expect(atBoundary.verdict).toBe('still-lands');
    expect(atBoundary.shortfall).toBe(0);
    expect(oneOver.verdict).toBe('gone');
    expect(oneOver.shortfall).toBe(1);
  });
});
