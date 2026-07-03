import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import type { ChemistryTipBreakdown } from '../chemistryTierValue';
import type { MarketBidderView, MarketLotView } from '../auctionMarketModel';
import type { CompletionCandidate } from '../auctionCompletionFloor';
import type { Player } from '../../utils/leagueBuilderStorage';
import type { SimPlayer } from '../archetypeBalanceSimulator';
import {
  PAYLOAD_TUNING,
  assembleBoard,
  assembleFiveLights,
  assembleRosterIntelligencePayload,
  assembleWorthToYou,
  marketReadFromEstimate,
  type MarketRead,
} from '../rosterIntelligencePayload';

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

const GREEN_ROSTER: readonly RosterSlotPlayer[] = [
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
  pitcher('RP'),
  pitcher('CP'),
];

const AMBER_ROSTER: readonly RosterSlotPlayer[] = [
  ...GREEN_ROSTER.slice(0, 14),
  pitcher('SP'),
  pitcher('SP'),
  pitcher('SP'),
  pitcher('SP'),
  pitcher('RP'),
  pitcher('RP'),
  pitcher('RP'),
  pitcher('CP'),
];

function player(overrides: Partial<Player> & Pick<Player, 'id'>): Player {
  return {
    id: overrides.id,
    firstName: 'Test',
    lastName: overrides.id,
    gender: 'M',
    age: 28,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1_000,
    leagueAssignments: [],
    ...overrides,
  } as Player;
}

function chemistry(premium: number): ChemistryTipBreakdown {
  return {
    premium,
    teamLift: premium,
    ownContext: 0,
    family: 'SCH',
    crossing: null,
    countsBefore: { SPI: 0, DIS: 0, CMP: 0, SCH: 0, CRA: 0 },
    countsAfter: { SPI: 0, DIS: 0, CMP: 0, SCH: 1, CRA: 0 },
    distanceToNextTier: 2,
    liftedTraitCount: 0,
  };
}

function bidder(overrides: Partial<MarketBidderView> & { teamId: string }): MarketBidderView {
  return {
    teamId: overrides.teamId,
    kind: 'cpu',
    slotsRemaining: 2,
    maxBid: 100_000,
    bandPriorities: null,
    personality: null,
    needMultiplier: 1,
    wouldStrand: false,
    ...overrides,
  };
}

function marketView(overrides: Partial<MarketLotView> = {}): MarketLotView {
  return {
    playerId: 'lot-1',
    iv: 50_000,
    bandWeights: null,
    openingAsk: 20_000,
    bidIncrement: 1_000,
    bidders: [bidder({ teamId: 'seat' }), bidder({ teamId: 'cpu' })],
    advisedTeamId: 'seat',
    openSlotsTotal: 10,
    availablePlayerCount: 50,
    ...overrides,
  };
}

function market(overrides: Partial<MarketRead> = {}): MarketRead {
  return {
    playerId: 'lot-1',
    band: { low: 20_000, median: 25_000, high: 30_000 },
    interestedTeams: 2,
    contested: null,
    likelyPass: false,
    ...overrides,
  };
}

function simPlayer(id: string, pow: number): SimPlayer {
  return {
    id,
    isPitcher: false,
    position: '1B',
    bat: { POW: pow, CON: 50, SPD: 50, FLD: 50, ARM: 50 },
    iv: 1_000,
    salary: 1_000,
  };
}

describe('roster intelligence payload assembly', () => {
  test('marketReadFromEstimate exposes only the public market read', () => {
    const read = marketReadFromEstimate(marketView(), { entries: [] });

    expect(read).toMatchObject({
      playerId: 'lot-1',
      interestedTeams: 2,
      contested: null,
      likelyPass: false,
    });
    expect(read.band.low).toBe(20_000);
    expect(Object.keys(read).sort()).toEqual([
      'band',
      'contested',
      'interestedTeams',
      'likelyPass',
      'playerId',
    ]);
  });

  test('assembleWorthToYou applies the named push/cap/pass thresholds', () => {
    const candidate = player({ id: 'candidate', chemistry: 'Scholarly' });
    const rosterPlayers = [player({ id: 'r1', chemistry: 'Scholarly' })];

    expect(
      assembleWorthToYou({
        candidate,
        iv: 26_000,
        rosterPlayers,
        budgetRemaining: 40_000,
        rosterWithCandidate: GREEN_ROSTER,
        remainingPool: [],
        openSlotsAfterWin: 0,
        market: market(),
      }).verdict,
    ).toBe('push');

    expect(
      assembleWorthToYou({
        candidate,
        iv: 26_000,
        rosterPlayers,
        budgetRemaining: 26_000,
        rosterWithCandidate: GREEN_ROSTER,
        remainingPool: [],
        openSlotsAfterWin: 0,
        market: market(),
      }).verdict,
    ).toBe('cap');

    expect(
      assembleWorthToYou({
        candidate,
        iv: market().band.low * PAYLOAD_TUNING.worthPassLowBandFraction - 1,
        rosterPlayers: [],
        budgetRemaining: 40_000,
        rosterWithCandidate: GREEN_ROSTER,
        remainingPool: [],
        openSlotsAfterWin: 0,
        market: market(),
      }).verdict,
    ).toBe('pass');
  });

  test('assembleWorthToYou never pushes without a market read', () => {
    const candidate = player({ id: 'candidate', chemistry: 'Scholarly' });

    expect(
      assembleWorthToYou({
        candidate,
        iv: 30_000,
        rosterPlayers: [],
        budgetRemaining: 0,
        rosterWithCandidate: GREEN_ROSTER,
        remainingPool: [],
        openSlotsAfterWin: 0,
      }).verdict,
    ).toBe('pass');

    expect(
      assembleWorthToYou({
        candidate,
        iv: 30_000,
        rosterPlayers: [],
        budgetRemaining: 25_000,
        rosterWithCandidate: GREEN_ROSTER,
        remainingPool: [],
        openSlotsAfterWin: 0,
      }).verdict,
    ).toBe('cap');

    expect(
      assembleWorthToYou({
        candidate,
        iv: 30_000,
        rosterPlayers: [],
        budgetRemaining: 25_000,
        rosterWithCandidate: AMBER_ROSTER.slice(0, 20),
        remainingPool: [],
        openSlotsAfterWin: 2,
      }).verdict,
    ).toBe('pass');
  });

  test('assembleBoard ranks by iv plus chemistry lift with stable id tie-breaks', () => {
    expect(
      assembleBoard({
        rosterPlayers: [],
        candidates: [
          { playerId: 'b', iv: 1_000, chemistry: chemistry(500), matchedShape: 'power' },
          { playerId: 'a', iv: 1_500, chemistry: chemistry(0), matchedShape: null },
          { playerId: 'c', iv: 900, chemistry: chemistry(700), matchedShape: 'speed', note: 'scouted' },
        ],
      }),
    ).toEqual([
      { playerId: 'a', worth: 1_500, matchedShape: null },
      { playerId: 'b', worth: 1_500, matchedShape: 'power' },
      { playerId: 'c', worth: 1_600, matchedShape: 'speed', note: 'scouted' },
    ].sort((a, b) => b.worth - a.worth || a.playerId.localeCompare(b.playerId)));
  });

  test('assembleFiveLights builds shape, chemistry, budget, and optional identity reads', () => {
    const scorecard = assembleFiveLights({
      shapePlayers: GREEN_ROSTER,
      chemistryPlayers: [
        player({ id: 's1', chemistry: 'Scholarly', trait1: 'Big Hack' }),
        player({ id: 's2', chemistry: 'Scholarly' }),
        player({ id: 's3', chemistry: 'Scholarly' }),
      ],
      budget: {
        budgetRemaining: 35_000,
        rosterWithCandidate: GREEN_ROSTER,
        remainingPool: [],
        openSlotsAfterWin: 0,
        market: market({ band: { low: 20_000, median: 25_000, high: 30_000 } }),
      },
      identity: {
        rosterPlayers: [simPlayer('slugger', 90)],
        comparisonPool: [simPlayer('slugger', 90), simPlayer('avg-1', 50), simPlayer('avg-2', 50)],
        tier: 'standard',
        archetype: {
          name: 'Power Test',
          rawShift: { 'hitters/POW': 0.1 },
        },
      },
    });

    expect(scorecard.shape.status).toBe('green');
    expect(scorecard.chemistry.status).toBe('green');
    expect(scorecard.budget.status).toBe('green');
    expect(scorecard.identity.status).toBe('green');
    expect(scorecard.balance).toEqual({ status: 'unknown', sentence: 'Balance read coming.' });
  });

  test('five-lights red/amber cases stay explicit and provisional identity can be absent', () => {
    const redChemistry = [
      player({ id: 'n1', chemistry: 'Competitive', trait1: 'Whiffer' }),
      player({ id: 'n2', chemistry: 'Competitive', trait1: 'Slow Poke' }),
    ];

    const scorecard = assembleFiveLights({
      shapePlayers: AMBER_ROSTER,
      chemistryPlayers: redChemistry,
      budget: {
        budgetRemaining: 10_000,
        rosterWithCandidate: AMBER_ROSTER.slice(0, 20),
        remainingPool: [
          { id: 'too-expensive-1', price: 20_000, shape: pitcher('RP') },
          { id: 'too-expensive-2', price: 20_000, shape: pitcher('RP') },
        ] satisfies CompletionCandidate[],
        openSlotsAfterWin: 2,
        market: market(),
      },
    });

    expect(scorecard.shape.status).toBe('amber');
    expect(scorecard.chemistry.status).toBe('red');
    expect(scorecard.budget.status).toBe('red');
    expect(scorecard.identity).toEqual({ status: 'unknown', sentence: 'Identity read coming.' });
  });

  test('assembleRosterIntelligencePayload omits absent optional sections', () => {
    expect(
      assembleRosterIntelligencePayload({
        seatTeamId: 'seat',
        generatedAtLotIndex: 4,
        board: [{ playerId: 'p1', worth: 1, matchedShape: null }],
      }),
    ).toEqual({
      seatTeamId: 'seat',
      generatedAtLotIndex: 4,
      board: [{ playerId: 'p1', worth: 1, matchedShape: null }],
    });
  });
});
