import { describe, expect, it } from 'vitest';

import { computeAuctionTeamProjectedTaxWithCaps } from '../../../../../../engines/auctionLuxuryTax';
import { snakeLuxuryCaps } from '../../../../../../engines/snakeLuxuryTax';
import type { ConstructionPlayer } from '../../../../../../engines/leagueConstruction';
import type { Player } from '../../../../../../utils/leagueBuilderStorage';
import {
  buildChemistryStrip,
  buildDraftedRosterLedger,
  buildPlanLedger,
  buildSelectedChemistryDelta,
  fitToneForWord,
} from '../draftTruthModel';

const caps = [{ group: 'hitters', stat: 'POW', topN: 2, cap: 10, penaltyCurve: 1, penaltyPer100: 1000, minAdder: 50 }] as const;

function construction(id: string, power: number): ConstructionPlayer {
  return {
    id,
    isPitcher: false,
    bat: { POW: power, CON: 50, SPD: 50, FLD: 50, ARM: 50 },
    pit: { VEL: 0, JNK: 0, ACC: 0 },
  };
}

function player(id: string, chemistry: Player['chemistry']): Player {
  return {
    id, firstName: 'Player', lastName: id, gender: 'F', age: 24, bats: 'R', throws: 'R',
    primaryPosition: 'SS', secondaryPosition: '2B', power: 70, contact: 65, speed: 60,
    fielding: 75, arm: 68, velocity: 0, junk: 0, accuracy: 0, arsenal: [], overallGrade: 'B',
    personality: 'Competitive', chemistry, morale: 50, mojo: 'Normal', fame: 0, salary: 1,
    leagueAssignments: [], createdDate: '2026-01-01', lastModified: '2026-01-01', isCustom: true,
  } as Player;
}

describe('snake draft truth model', () => {
  it('recomputes drafted salary, total tax, all-in, and money left from canonical roster construction after add and correction', () => {
    const playersById = new Map([
      ['a', { construction: construction('a', 90), player: player('a', 'Competitive') }],
      ['b', { construction: construction('b', 80), player: player('b', 'Spirited') }],
    ]);
    const base = { budget: 1_000_000, baseCaps: caps, realTeamCount: 2, playersById, frozenIvById: new Map([['a', 100_000], ['b', 120_000]]) };
    const afterAdd = buildDraftedRosterLedger({ ...base, picks: [{ playerId: 'a' }, { playerId: 'b', settledSalary: 125_000 }] });
    const normalized = snakeLuxuryCaps([...caps]);
    const expectedTax = computeAuctionTeamProjectedTaxWithCaps([construction('a', 90), construction('b', 80)], null, undefined, normalized);
    expect(afterAdd).toMatchObject({ rosterCount: 2, salary: 225_000, tax: expectedTax, allIn: 225_000 + expectedTax, moneyLeft: 775_000 - expectedTax });

    const afterCorrection = buildDraftedRosterLedger({ ...base, picks: [{ playerId: 'a' }] });
    const correctedTax = computeAuctionTeamProjectedTaxWithCaps([construction('a', 90)], null, undefined, normalized);
    expect(afterCorrection).toMatchObject({ rosterCount: 1, salary: 100_000, tax: correctedTax, allIn: 100_000 + correctedTax });
  });

  it('keeps plan and drafted ledgers distinct and never fabricates zero for missing legacy money', () => {
    expect(buildPlanLedger({ planCost: 500_000, planTax: 30_000, planCushion: 470_000, playerIds: [] })).toEqual({
      rosterCount: 0, salary: 500_000, tax: 30_000, allIn: 530_000, moneyLeft: 470_000,
    });
    const unknown = buildDraftedRosterLedger({
      picks: [{ playerId: 'legacy' }], playersById: new Map(), frozenIvById: new Map(), budget: 1_000_000,
      baseCaps: caps, realTeamCount: 2,
    });
    expect(unknown).toEqual({ rosterCount: 1, salary: null, tax: null, allIn: null, moneyLeft: null });

    const priceKnown = buildDraftedRosterLedger({
      picks: [{ playerId: 'legacy', settledSalary: 77_000 }], playersById: new Map(), frozenIvById: new Map(), budget: 1_000_000,
      baseCaps: caps, realTeamCount: 2,
    });
    expect(priceKnown).toEqual({ rosterCount: 1, salary: 77_000, tax: null, allIn: null, moneyLeft: null });
  });

  it('always returns all five chemistry families in the approved stable order for plan and drafted memberships', () => {
    const plan = buildChemistryStrip([player('p1', 'Crafty'), player('p2', 'Crafty')]);
    const drafted = buildChemistryStrip([player('d1', 'Competitive')]);
    expect(plan.map((row) => row.word)).toEqual(['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined']);
    expect(plan.map((row) => row.count)).toEqual([0, 0, 2, 0, 0]);
    expect(drafted.map((row) => row.count)).toEqual([1, 0, 0, 0, 0]);
  });

  it('uses shared chemistry advice for exact 2-to-3 and 6-to-7 selected-player crossings', () => {
    const candidate = player('candidate', 'Scholarly');
    const two = [player('s1', 'Scholarly'), player('s2', 'Scholarly')];
    const six = Array.from({ length: 6 }, (_, index) => player(`x${index}`, 'Scholarly'));
    expect(buildSelectedChemistryDelta(candidate, two)).toMatchObject({ word: 'Scholarly', before: 2, after: 3, crossing: 'L1->L2' });
    expect(buildSelectedChemistryDelta(candidate, six)).toMatchObject({ word: 'Scholarly', before: 6, after: 7, crossing: 'L2->L3' });
  });

  it('preserves a canonical negative chemistry loss instead of clamping it', () => {
    const isolated = { ...player('isolated', 'Scholarly'), trait1: 'Big Hack' } as Player;
    expect(buildSelectedChemistryDelta(isolated, []).premium).toBeLessThan(0);
  });

  it('maps existing fit words to signal colors without inventing thresholds', () => {
    expect(fitToneForWord('STRONG FIT')).toBe('green');
    expect(fitToneForWord('SOLID FIT')).toBe('yellow');
    expect(fitToneForWord('WEAK FIT')).toBe('red');
    expect(fitToneForWord('FIT UNKNOWN')).toBe('unknown');
    expect(fitToneForWord('LEGACY FIT')).toBe('unknown');
  });
});
