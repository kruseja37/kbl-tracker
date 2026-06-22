import { describe, expect, test } from 'vitest';

import {
  CAP_MODIFICATION_FRACTIONS,
  LUXURY_CAP_TABLES,
  type LuxuryCapRow,
} from '../../data/tierParams';
import {
  luxuryTax,
  shiftLuxuryCaps,
  type BandPriorities,
  type ConstructionPlayer,
  type TeamCapIdentity,
} from '../leagueConstruction';
import {
  auctionMarginalTax,
  auctionShiftedCaps,
  computeAuctionTeamProjectedTax,
} from '../auctionLuxuryTax';

const lowBat: ConstructionPlayer['bat'] = {
  POW: 1,
  CON: 1,
  SPD: 1,
  FLD: 1,
  ARM: 1,
};

const zeroPriorities: BandPriorities = {
  Power: 0,
  Contact: 0,
  Speed: 0,
  Defense: 0,
  Rotation: 0,
  Bullpen: 0,
};

function hitter(id: string, ratings: Partial<ConstructionPlayer['bat']>): ConstructionPlayer {
  return {
    id,
    isPitcher: false,
    bat: { ...lowBat, ...ratings },
  };
}

function findCap(
  caps: LuxuryCapRow[],
  group: LuxuryCapRow['group'],
  stat: LuxuryCapRow['stat'],
): LuxuryCapRow {
  const row = caps.find((candidate) => candidate.group === group && candidate.stat === stat);
  if (!row) {
    throw new Error(`Missing cap row for ${group}/${stat}`);
  }
  return row;
}

describe('auctionLuxuryTax', () => {
  test('no identity uses base tier caps and matches ratified luxuryTax output', () => {
    const tier = 'standard';
    const roster = Array.from({ length: 8 }, (_, index) => hitter(`power-${index}`, { POW: 99 }));

    const caps = auctionShiftedCaps(undefined, tier);
    const actual = computeAuctionTeamProjectedTax(roster, null, undefined, tier);
    const expected = luxuryTax(roster, LUXURY_CAP_TABLES[tier], 'taxed').charged;

    expect(caps).toBe(LUXURY_CAP_TABLES[tier]);
    expect(actual).toBeGreaterThan(0);
    expect(actual).toBeCloseTo(expected, 8);
  });

  test('selected cap identity shifts the prioritized band cap through shiftLuxuryCaps', () => {
    const capIdentity: TeamCapIdentity = {
      bandPriorities: { ...zeroPriorities, Defense: 5 },
      increase: ['FLD'],
      decrease: [],
    };

    const base = LUXURY_CAP_TABLES.juiced;
    const shifted = auctionShiftedCaps(capIdentity, 'juiced');
    const expectedShifted = shiftLuxuryCaps(base, { increase: ['FLD'], decrease: [] });
    const baseFld = findCap(base, 'hitters', 'FLD');
    const shiftedFld = findCap(shifted, 'hitters', 'FLD');

    expect(shifted).toEqual(expectedShifted);
    expect(shifted).not.toBe(base);
    expect(shiftedFld.cap).not.toBe(baseFld.cap);
    expect(shiftedFld.cap).toBeCloseTo(
      baseFld.cap * (1 + CAP_MODIFICATION_FRACTIONS.FLD.FLD),
      10,
    );
  });

  test('identity fit taxes on-archetype roster strictly less than off-archetype roster', () => {
    const tier = 'standard';
    const capIdentity: TeamCapIdentity = {
      increase: ['POW'],
      decrease: ['CON'],
    };
    const onArchetypeRoster = Array.from({ length: 8 }, (_, index) => hitter(`pow-${index}`, { POW: 99 }));
    const offArchetypeRoster = Array.from({ length: 8 }, (_, index) => hitter(`con-${index}`, { CON: 99 }));

    const onTax = computeAuctionTeamProjectedTax(onArchetypeRoster, null, capIdentity, tier);
    const offTax = computeAuctionTeamProjectedTax(offArchetypeRoster, null, capIdentity, tier);

    expect(onTax).toBeGreaterThan(0);
    expect(offTax).toBeGreaterThan(onTax);
  });

  test('candidate variant returns the would-be tax after adding the candidate', () => {
    const tier = 'standard';
    const capIdentity: TeamCapIdentity = {
      increase: ['POW'],
      decrease: ['CON'],
    };
    const committedRoster = Array.from({ length: 7 }, (_, index) => hitter(`committed-${index}`, { POW: 95 }));
    const candidate = hitter('candidate', { POW: 99 });
    const caps = auctionShiftedCaps(capIdentity, tier);

    const withoutCandidate = computeAuctionTeamProjectedTax(committedRoster, null, capIdentity, tier);
    const withCandidate = computeAuctionTeamProjectedTax(committedRoster, candidate, capIdentity, tier);
    const expected = luxuryTax([...committedRoster, candidate], caps, 'taxed').charged;

    expect(withCandidate).toBeCloseTo(expected, 8);
    expect(withCandidate).toBeGreaterThan(withoutCandidate);
    expect(auctionMarginalTax(committedRoster, candidate, capIdentity, tier)).toBeCloseTo(
      withCandidate - withoutCandidate,
      8,
    );
  });
});
