import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import type { ChemistryTipBreakdown } from '../chemistryTierValue';
import type { MarketBidderView, MarketLotView } from '../auctionMarketModel';
import type { CompletionCandidate } from '../auctionCompletionFloor';
import type { Player } from '../../utils/leagueBuilderStorage';
import type { SimPlayer } from '../archetypeBalanceSimulator';
import type { RosterNeedBreakdown } from '../rosterNeed';
import type { Band, BandPriorities } from '../leagueConstruction';
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

const need = (overrides: Partial<RosterNeedBreakdown> = {}): RosterNeedBreakdown => ({
  missingPrimaries: [],
  catcherCoverNeed: 0,
  pitcherNeed: 0,
  rotationDeficit: 0,
  bullpenDeficit: 0,
  closerDeficit: 0,
  hitterFloorNeed: 0,
  pitcherFloorNeed: 0,
  minimumAdditions: 0,
  infeasible: false,
  ...overrides,
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

const NEUTRAL_BAND_PRIORITIES: BandPriorities = {
  Power: 1,
  Contact: 1,
  Speed: 1,
  Defense: 1,
  Rotation: 1,
  Bullpen: 1,
};

const POWER_BAND_PRIORITIES: BandPriorities = {
  Power: 10,
  Contact: 0,
  Speed: 0,
  Defense: 0,
  Rotation: 0,
  Bullpen: 0,
};

const DEFENSE_BAND_PRIORITIES: BandPriorities = {
  Power: 0,
  Contact: 0,
  Speed: 0,
  Defense: 10,
  Rotation: 0,
  Bullpen: 0,
};

const NEUTRAL_ARCHETYPE_WEIGHTS: Record<Band, number> = {
  Power: 0.5,
  Contact: 0.5,
  Speed: 0.5,
  Defense: 0.5,
  Rotation: 0.5,
  Bullpen: 0.5,
};

const POWER_ARCHETYPE_WEIGHTS: Record<Band, number> = {
  Power: 1,
  Contact: 0,
  Speed: 0,
  Defense: 0,
  Rotation: 0,
  Bullpen: 0,
};

function neutralSeat(overrides: {
  ownBandPriorities?: BandPriorities;
  archetypeWeights?: Partial<Record<Band, number>>;
  needBreakdown?: RosterNeedBreakdown | null;
  candidateShape?: RosterSlotPlayer | null;
} = {}) {
  return {
    ownBandPriorities: overrides.ownBandPriorities ?? NEUTRAL_BAND_PRIORITIES,
    archetypeWeights: overrides.archetypeWeights ?? NEUTRAL_ARCHETYPE_WEIGHTS,
    needBreakdown: overrides.needBreakdown ?? null,
    candidateShape: overrides.candidateShape ?? hitter('CF'),
  };
}

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
        ...neutralSeat({ candidateShape: pitcher('SP') }),
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
        ...neutralSeat({ candidateShape: pitcher('SP') }),
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
        ...neutralSeat(),
        market: market(),
      }).verdict,
    ).toBe('pass');
  });

  test('assembleWorthToYou recommends value-anchored worth without exceeding the affordability cap', () => {
    const verlander = player({
      id: 'verlander-case',
      primaryPosition: 'P',
      velocity: 92,
      junk: 88,
      accuracy: 84,
      chemistry: 'Scholarly',
    });

    const valuePick = assembleWorthToYou({
      candidate: verlander,
      iv: 96_000,
      rosterPlayers: [],
      budgetRemaining: 809_714,
      rosterWithCandidate: GREEN_ROSTER,
      remainingPool: [],
      openSlotsAfterWin: 0,
      ...neutralSeat({ candidateShape: pitcher('SP') }),
      market: market({ band: { low: 70_000, median: 90_000, high: 110_000 } }),
    });
    const valueWorth = valuePick.ownValue + valuePick.chemistry.premium;

    expect(valuePick.capValue).toBe(809_714);
    expect(valuePick.recommendedNumber).toBe(valueWorth);
    expect(valuePick.recommendedNumber).toBeLessThan(valuePick.capValue);

    const cappedPick = assembleWorthToYou({
      candidate: verlander,
      iv: 120_000,
      rosterPlayers: [],
      budgetRemaining: 90_000,
      rosterWithCandidate: GREEN_ROSTER,
      remainingPool: [],
      openSlotsAfterWin: 0,
      ...neutralSeat({ candidateShape: pitcher('SP') }),
      market: market({ band: { low: 95_000, median: 110_000, high: 130_000 } }),
    });

    expect(cappedPick.capValue).toBe(90_000);
    expect(cappedPick.recommendedNumber).toBe(90_000);
    expect(cappedPick.recommendedNumber).toBeLessThanOrEqual(cappedPick.capValue ?? 0);
  });

  test('assembleWorthToYou floors isolated chemistry penalties out of the recommended number', () => {
    const isolatedTraitPick = assembleWorthToYou({
      candidate: player({
        id: 'isolated-scholar',
        chemistry: 'Scholarly',
        trait1: 'Big Hack',
      }),
      iv: 50_000,
      rosterPlayers: [],
      budgetRemaining: 500_000,
      rosterWithCandidate: GREEN_ROSTER,
      remainingPool: [],
      openSlotsAfterWin: 0,
      ...neutralSeat(),
      market: market({ band: { low: 40_000, median: 50_000, high: 60_000 } }),
    });

    expect(isolatedTraitPick.chemistry.premium).toBeLessThan(0);
    expect(isolatedTraitPick.chemistryContribution).toBe(0);
    expect(isolatedTraitPick.recommendedNumber).toBe(isolatedTraitPick.ownValue);
  });

  test('assembleWorthToYou preserves upward chemistry boosts when a candidate tips a tier', () => {
    const rosterPlayers = [
      player({ id: 'scholar-1', chemistry: 'Scholarly', trait1: 'Big Hack' }),
      player({ id: 'scholar-2', chemistry: 'Scholarly', trait1: 'Bunter' }),
    ];
    const tippedPick = assembleWorthToYou({
      candidate: player({ id: 'scholar-tip', chemistry: 'Scholarly' }),
      iv: 50_000,
      rosterPlayers,
      budgetRemaining: 500_000,
      rosterWithCandidate: GREEN_ROSTER,
      remainingPool: [],
      openSlotsAfterWin: 0,
      ...neutralSeat(),
      market: market({ band: { low: 40_000, median: 50_000, high: 60_000 } }),
    });

    expect(tippedPick.chemistry.crossing).toBe('L1->L2');
    expect(tippedPick.chemistry.premium).toBeGreaterThan(0);
    expect(tippedPick.chemistryContribution).toBe(tippedPick.chemistry.premium);
    expect(tippedPick.recommendedNumber).toBe(tippedPick.ownValue + tippedPick.chemistry.premium);
  });

  test('assembleWorthToYou attaches all five chemistry readout families with tier distances', () => {
    const read = assembleWorthToYou({
      candidate: player({ id: 'competitive-add', chemistry: 'Competitive' }),
      iv: 50_000,
      rosterPlayers: [
        player({ id: 'cmp-1', chemistry: 'Competitive' }),
        player({ id: 'sch-1', chemistry: 'Scholarly' }),
        player({ id: 'sch-2', chemistry: 'Scholarly' }),
        player({ id: 'sch-3', chemistry: 'Scholarly' }),
        player({ id: 'sch-4', chemistry: 'Scholarly' }),
        player({ id: 'sch-5', chemistry: 'Scholarly' }),
        player({ id: 'sch-6', chemistry: 'Scholarly' }),
        player({ id: 'sch-7', chemistry: 'Scholarly' }),
      ],
      budgetRemaining: 500_000,
      rosterWithCandidate: GREEN_ROSTER,
      remainingPool: [],
      openSlotsAfterWin: 0,
      ...neutralSeat(),
      market: market({ band: { low: 40_000, median: 50_000, high: 60_000 } }),
    });

    expect(read.chemistryReadout.families).toHaveLength(5);
    expect(read.chemistryReadout.families.map((family) => family.word)).toEqual([
      'Spirited',
      'Disciplined',
      'Competitive',
      'Scholarly',
      'Crafty',
    ]);
    expect(read.chemistryReadout.families.find((family) => family.family === 'CMP')).toMatchObject({
      count: 1,
      tier: 'L1',
      distanceToNextTier: 2,
      nextTierLabel: 'L2',
      isCandidateFamily: true,
    });
    expect(read.chemistryReadout.families.find((family) => family.family === 'SCH')).toMatchObject({
      count: 7,
      tier: 'L3',
      distanceToNextTier: null,
      nextTierLabel: null,
      isCandidateFamily: false,
    });
  });

  test('assembleWorthToYou candidate chemistry delta reflects countsAfter and crossing', () => {
    const read = assembleWorthToYou({
      candidate: player({ id: 'disciplined-tip', chemistry: 'Disciplined' }),
      iv: 50_000,
      rosterPlayers: [
        player({ id: 'disciplined-1', chemistry: 'Disciplined', trait1: 'Composed' }),
        player({ id: 'disciplined-2', chemistry: 'Disciplined', trait1: 'Base Rounder' }),
      ],
      budgetRemaining: 500_000,
      rosterWithCandidate: GREEN_ROSTER,
      remainingPool: [],
      openSlotsAfterWin: 0,
      ...neutralSeat(),
      market: market({ band: { low: 40_000, median: 50_000, high: 60_000 } }),
    });

    expect(read.chemistryReadout.candidate).toMatchObject({
      family: 'DIS',
      word: 'Disciplined',
      countAfter: 3,
      crossing: 'L1->L2',
      distanceToNextTierAfter: 4,
    });
  });

  test('assembleWorthToYou gives different numbers to different archetype seats for the same player', () => {
    const candidate = player({ id: 'same-player', chemistry: 'Competitive' });
    const base = {
      candidate,
      iv: 50_000,
      rosterPlayers: [] as Player[],
      budgetRemaining: 500_000,
      rosterWithCandidate: GREEN_ROSTER,
      remainingPool: [] as CompletionCandidate[],
      openSlotsAfterWin: 21,
      market: market({ band: { low: 40_000, median: 50_000, high: 60_000 } }),
    };

    const powerSeat = assembleWorthToYou({
      ...base,
      ...neutralSeat({
        ownBandPriorities: POWER_BAND_PRIORITIES,
        archetypeWeights: POWER_ARCHETYPE_WEIGHTS,
        candidateShape: hitter('1B'),
      }),
    });
    const defenseSeat = assembleWorthToYou({
      ...base,
      ...neutralSeat({
        ownBandPriorities: DEFENSE_BAND_PRIORITIES,
        archetypeWeights: POWER_ARCHETYPE_WEIGHTS,
        candidateShape: hitter('1B'),
      }),
    });

    expect(powerSeat.recommendedNumber).not.toBe(defenseSeat.recommendedNumber);
  });

  test('assembleWorthToYou values a strong-fit seat above a poor-fit seat for the same player', () => {
    const candidate = player({ id: 'power-fit-player', chemistry: 'Competitive' });
    const base = {
      candidate,
      iv: 50_000,
      rosterPlayers: [] as Player[],
      budgetRemaining: 500_000,
      rosterWithCandidate: GREEN_ROSTER,
      remainingPool: [] as CompletionCandidate[],
      openSlotsAfterWin: 21,
      market: market({ band: { low: 40_000, median: 50_000, high: 60_000 } }),
    };

    const strongFit = assembleWorthToYou({
      ...base,
      ...neutralSeat({
        ownBandPriorities: POWER_BAND_PRIORITIES,
        archetypeWeights: POWER_ARCHETYPE_WEIGHTS,
        candidateShape: hitter('1B'),
      }),
    });
    const poorFit = assembleWorthToYou({
      ...base,
      ...neutralSeat({
        ownBandPriorities: DEFENSE_BAND_PRIORITIES,
        archetypeWeights: POWER_ARCHETYPE_WEIGHTS,
        candidateShape: hitter('1B'),
      }),
    });

    expect(strongFit.archetypeFitMultiplier).toBeGreaterThan(poorFit.archetypeFitMultiplier);
    expect(strongFit.recommendedNumber).toBeGreaterThan(poorFit.recommendedNumber);
  });

  test('assembleWorthToYou keeps a neutral fit and need seat at raw IV before chemistry', () => {
    const neutral = assembleWorthToYou({
      candidate: player({ id: 'neutral-player', chemistry: 'Competitive' }),
      iv: 50_000,
      rosterPlayers: [],
      budgetRemaining: 500_000,
      rosterWithCandidate: GREEN_ROSTER,
      remainingPool: [],
      openSlotsAfterWin: 21,
      ...neutralSeat(),
      market: market({ band: { low: 40_000, median: 50_000, high: 60_000 } }),
    });

    expect(neutral.archetypeFitMultiplier).toBeCloseTo(1, 6);
    expect(neutral.needMultiplier).toBe(1);
    expect(neutral.ownValue).toBeCloseTo(neutral.iv, 6);
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
        ...neutralSeat(),
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
        ...neutralSeat(),
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
        ...neutralSeat(),
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
      { playerId: 'a', worth: 1_500, matchedShape: null, needTag: null, fitTag: null },
      { playerId: 'b', worth: 1_500, matchedShape: 'power', needTag: null, fitTag: null },
      { playerId: 'c', worth: 1_600, matchedShape: 'speed', needTag: null, fitTag: null, note: 'scouted' },
    ].sort((a, b) => b.worth - a.worth || a.playerId.localeCompare(b.playerId)));
  });

  test('assembleBoard applies need before fit before worth while keeping worth pure', () => {
    const board = assembleBoard({
      rosterPlayers: [],
      need: need({ missingPrimaries: ['SS'] }),
      candidates: [
        {
          playerId: 'no-need-identity',
          iv: 10_000,
          chemistry: chemistry(900),
          shape: hitter('CF'),
          identityZ: PAYLOAD_TUNING.identityGreenBoostZ,
          matchedShape: 'CF',
        },
        {
          playerId: 'need-low-worth',
          iv: 1_000,
          chemistry: chemistry(0),
          shape: hitter('SS'),
          identityZ: PAYLOAD_TUNING.identityGreenBoostZ - 0.01,
          matchedShape: 'SS',
        },
        {
          playerId: 'need-high-worth',
          iv: 2_000,
          chemistry: chemistry(100),
          shape: hitter('SS'),
          matchedShape: 'SS',
        },
        {
          playerId: 'plain',
          iv: 99_000,
          chemistry: chemistry(0),
          shape: hitter('LF'),
          matchedShape: 'LF',
        },
      ],
    });

    expect(board.map((entry) => entry.playerId)).toEqual([
      'need-high-worth',
      'need-low-worth',
      'no-need-identity',
      'plain',
    ]);
    expect(board.find((entry) => entry.playerId === 'need-low-worth')).toMatchObject({
      worth: 1_000,
      needTag: 'FILLS SS',
      fitTag: null,
    });
    expect(board.find((entry) => entry.playerId === 'no-need-identity')).toMatchObject({
      worth: 10_900,
      needTag: null,
      fitTag: 'IDENTITY',
    });
  });

  test('assembleBoard derives every need tag branch with first-match priority', () => {
    const cases: Array<{
      name: string;
      shape?: RosterSlotPlayer;
      rosterNeed?: RosterNeedBreakdown;
      expected: string | null;
    }> = [
      {
        name: 'FILLS POS',
        shape: hitter('SS', 'C'),
        rosterNeed: need({ missingPrimaries: ['SS'], catcherCoverNeed: 1 }),
        expected: 'FILLS SS',
      },
      {
        name: 'CATCHER COVER',
        shape: hitter('1B', 'C'),
        rosterNeed: need({ catcherCoverNeed: 1 }),
        expected: 'CATCHER COVER',
      },
      {
        name: 'ROTATION',
        shape: pitcher('SP'),
        rosterNeed: need({ rotationDeficit: 1 }),
        expected: 'ROTATION',
      },
      {
        name: 'CLOSER',
        shape: pitcher('CP'),
        rosterNeed: need({ closerDeficit: 1 }),
        expected: 'CLOSER',
      },
      {
        name: 'BULLPEN',
        shape: pitcher('RP'),
        rosterNeed: need({ bullpenDeficit: 1 }),
        expected: 'BULLPEN',
      },
      {
        name: 'BENCH BAT',
        shape: hitter('LF'),
        rosterNeed: need({ hitterFloorNeed: 1 }),
        expected: 'BENCH BAT',
      },
      {
        name: 'STAFF DEPTH',
        shape: pitcher('CP'),
        rosterNeed: need({ pitcherFloorNeed: 1 }),
        expected: 'STAFF DEPTH',
      },
      {
        name: 'null without shape',
        rosterNeed: need({ missingPrimaries: ['SS'] }),
        expected: null,
      },
      {
        name: 'null without need',
        shape: hitter('SS'),
        expected: null,
      },
    ];

    for (const testCase of cases) {
      const [entry] = assembleBoard({
        rosterPlayers: [],
        ...(testCase.rosterNeed ? { need: testCase.rosterNeed } : {}),
        candidates: [
          {
            playerId: testCase.name,
            iv: 1_000,
            chemistry: chemistry(0),
            ...(testCase.shape ? { shape: testCase.shape } : {}),
          },
        ],
      });
      expect(entry.needTag).toBe(testCase.expected);
    }
  });

  test('assembleBoard derives identity fit tag at the shared green threshold only', () => {
    const board = assembleBoard({
      rosterPlayers: [],
      candidates: [
        { playerId: 'above', iv: 1, chemistry: chemistry(0), identityZ: PAYLOAD_TUNING.identityGreenBoostZ + 0.01 },
        { playerId: 'at', iv: 1, chemistry: chemistry(0), identityZ: PAYLOAD_TUNING.identityGreenBoostZ },
        { playerId: 'below', iv: 1, chemistry: chemistry(0), identityZ: PAYLOAD_TUNING.identityGreenBoostZ - 0.01 },
        { playerId: 'absent', iv: 1, chemistry: chemistry(0) },
      ],
    });

    expect(Object.fromEntries(board.map((entry) => [entry.playerId, entry.fitTag]))).toEqual({
      above: 'IDENTITY',
      at: 'IDENTITY',
      absent: null,
      below: null,
    });
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
