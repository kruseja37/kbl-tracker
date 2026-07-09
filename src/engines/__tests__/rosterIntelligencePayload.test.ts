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
  assembleFarmWhisper,
  assembleFiveLights,
  assembleRosterIntelligencePayload,
  assembleWorthToYou,
  boardPositionGroups,
  computeFarmChemFitLabel,
  marketReadFromEstimate,
  sortBoardEntriesForPosition,
  type MarketRead,
} from '../rosterIntelligencePayload';
import { BEST22_TUNING } from '../best22Target';

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

  describe('COCKPIT WAVE 2: board rank-blend (Correction 5/7)', () => {
    test('assembleBoard populates position from candidate.shape.position, and omits it when shape is absent', () => {
      const board = assembleBoard({
        rosterPlayers: [],
        candidates: [
          { playerId: 'shaped', iv: 100, chemistry: chemistry(0), shape: hitter('SS') },
          { playerId: 'shapeless', iv: 100, chemistry: chemistry(0) },
        ],
      });
      expect(board.find((entry) => entry.playerId === 'shaped')?.position).toBe('SS');
      expect(board.find((entry) => entry.playerId === 'shapeless')).not.toHaveProperty('position');
    });

    test('absent rankOverrides leaves assembleBoard byte-identical to the pre-Wave-2 worth-only order', () => {
      const candidates = [
        { playerId: 'x', iv: 100, chemistry: chemistry(0) },
        { playerId: 'y', iv: 105, chemistry: chemistry(0) },
        { playerId: 'z', iv: 90, chemistry: chemistry(0) },
      ];
      expect(assembleBoard({ rosterPlayers: [], candidates }).map((entry) => entry.playerId)).toEqual(['y', 'x', 'z']);
    });

    test('the GM global rank (ruling 1: a STRONG NUDGE) measurably moves a close-call candidate to the top, ports best22Target.BEST22_TUNING.gmPreferenceWeight', () => {
      expect(BEST22_TUNING.gmPreferenceWeight).toBe(2.5);
      const candidates = [
        { playerId: 'x', iv: 100, chemistry: chemistry(0) },
        { playerId: 'y', iv: 105, chemistry: chemistry(0) },
        { playerId: 'z', iv: 90, chemistry: chemistry(0) },
      ];
      // No override: worth-only order is y, x, z.
      expect(assembleBoard({ rosterPlayers: [], candidates }).map((entry) => entry.playerId)).toEqual(['y', 'x', 'z']);
      // GM ranks z #1 -- the nudge moves it from last to first, ahead of the higher-worth y and x,
      // but the displayed worth numbers stay the honest, un-nudged values (F9 one ceiling).
      const nudged = assembleBoard({ rosterPlayers: [], candidates, rankOverrides: { global: ['z'] } });
      expect(nudged.map((entry) => entry.playerId)).toEqual(['z', 'y', 'x']);
      expect(nudged.find((entry) => entry.playerId === 'z')?.worth).toBe(90);
    });

    test('a clearly-superior candidate the GM never ranked still wins over the GM order (ruling 1: not a hard constraint)', () => {
      const candidates = [
        { playerId: 'dominant', iv: 1_000_000, chemistry: chemistry(0) },
        { playerId: 'b', iv: 105, chemistry: chemistry(0) },
        { playerId: 'a', iv: 100, chemistry: chemistry(0) },
        { playerId: 'c', iv: 95, chemistry: chemistry(0) },
        { playerId: 'd', iv: 90, chemistry: chemistry(0) },
        { playerId: 'e', iv: 10, chemistry: chemistry(0) },
      ];
      // GM ranks the worst-worth candidate ('e') #1 -- it surges past the close-clustered b/a/c/d,
      // but the untouched, order-of-magnitude-superior 'dominant' candidate is unreachable by the
      // nudge and still ranks first overall.
      const board = assembleBoard({ rosterPlayers: [], candidates, rankOverrides: { global: ['e'] } });
      expect(board[0].playerId).toBe('dominant');
      expect(board[1].playerId).toBe('e');
      expect(board.map((entry) => entry.playerId).slice(2)).toEqual(['b', 'a', 'c', 'd']);
    });

    test('boardPositionGroups returns exactly the 12 canonical TaxonomyPosition groups (8 field + SP/SP-RP/RP/CP)', () => {
      expect(boardPositionGroups()).toEqual(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP/RP', 'RP', 'CP']);
    });

    test('sortBoardEntriesForPosition filters to one position and blends that position\'s OWN rank overrides only', () => {
      const board = assembleBoard({
        rosterPlayers: [],
        candidates: [
          { playerId: 'ss-x', iv: 100, chemistry: chemistry(0), shape: hitter('SS') },
          { playerId: 'ss-y', iv: 105, chemistry: chemistry(0), shape: hitter('SS') },
          { playerId: 'ss-z', iv: 90, chemistry: chemistry(0), shape: hitter('SS') },
          { playerId: 'cf-1', iv: 200, chemistry: chemistry(0), shape: hitter('CF') },
          { playerId: 'cf-2', iv: 150, chemistry: chemistry(0), shape: hitter('CF') },
        ],
      });

      const rankOverrides = { byPosition: { SS: ['ss-z'] } };
      const ssView = sortBoardEntriesForPosition(board, 'SS', rankOverrides);
      const cfView = sortBoardEntriesForPosition(board, 'CF', rankOverrides);

      // SS: the position-scoped nudge (computed from the SS-only worth spread) moves ss-z to the
      // top of its own group, exactly mirroring the global-board flip test above.
      expect(ssView.map((entry) => entry.playerId)).toEqual(['ss-z', 'ss-y', 'ss-x']);
      // CF: entirely unaffected by the SS override -- plain worth order, and no SS names leak in.
      expect(cfView.map((entry) => entry.playerId)).toEqual(['cf-1', 'cf-2']);
    });

    test('sortBoardEntriesForPosition with no rankOverrides for that position keeps plain worth order', () => {
      const board = assembleBoard({
        rosterPlayers: [],
        candidates: [
          { playerId: 'ss-x', iv: 100, chemistry: chemistry(0), shape: hitter('SS') },
          { playerId: 'ss-y', iv: 105, chemistry: chemistry(0), shape: hitter('SS') },
        ],
      });
      expect(sortBoardEntriesForPosition(board, 'SS').map((entry) => entry.playerId)).toEqual(['ss-y', 'ss-x']);
      expect(sortBoardEntriesForPosition(board, 'SS', {}).map((entry) => entry.playerId)).toEqual(['ss-y', 'ss-x']);
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
        // Full legal roster + 0 open slots -> the unreserved completion ceiling is the whole
        // remaining budget (35,000); pass the SAME number here as the liquidity ceiling so this
        // fixture's green expectation is unchanged by the F9 fix.
        liquidityMaxBid: 35_000,
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
    // COCKPIT W1a/b (2026-07-08): BALANCE is deleted from the MLB scorecard, not stubbed --
    // assembleFiveLights never sets it (FiveLights.balance is now optional, farm-only).
    expect(scorecard.balance).toBeUndefined();
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
        // Infeasible from the completion quote alone -> red regardless of the liquidity ceiling.
        liquidityMaxBid: null,
      },
    });

    expect(scorecard.shape.status).toBe('amber');
    expect(scorecard.chemistry.status).toBe('red');
    expect(scorecard.budget.status).toBe('red');
    expect(scorecard.identity).toEqual({ status: 'unknown', sentence: 'Identity read coming.' });
  });

  describe('F9: one ceiling drives verdict, room-relation, and budget light', () => {
    test('verdict and budget light agree (no green) when the liquidity ceiling sits below the market low, even though the unreserved capacity is huge', () => {
      // An open-slot-rich, cash-rich team looking at a genuinely low-value candidate: the
      // unreserved completion ceiling (capValue) is the whole budget (huge), but the
      // liquidity-adjusted ceiling (suggestedMaxBid) is anchored to the candidate's own low
      // value and comes in well under the market's low band -- the exact "slots remain open"
      // shape the F9 finding called out.
      const lowValueCandidate = player({ id: 'low-value-echo', chemistry: 'Scholarly' });
      const bandLow = 50_000;

      const worth = assembleWorthToYou({
        candidate: lowValueCandidate,
        iv: 8_000,
        rosterPlayers: [],
        budgetRemaining: 500_000,
        rosterWithCandidate: GREEN_ROSTER,
        remainingPool: [],
        openSlotsAfterWin: 0,
        ...neutralSeat(),
        market: market({ band: { low: bandLow, median: 60_000, high: 70_000 } }),
      });

      // The two ceilings genuinely diverge (this is the contradiction surface F9 found).
      expect(worth.capValue).toBe(500_000);
      expect(worth.suggestedMaxBid).toBeLessThan(bandLow);
      expect(worth.capValue).toBeGreaterThan(worth.suggestedMaxBid);
      expect(worth.verdict).toBe('pass');

      // Budget light, fed the SAME liquidity ceiling (as the real call site now threads it),
      // must not read green while the verdict says pass.
      const scorecard = assembleFiveLights({
        shapePlayers: GREEN_ROSTER,
        chemistryPlayers: [],
        budget: {
          budgetRemaining: 500_000,
          rosterWithCandidate: GREEN_ROSTER,
          remainingPool: [],
          openSlotsAfterWin: 0,
          market: market({ band: { low: bandLow, median: 60_000, high: 70_000 } }),
          liquidityMaxBid: worth.suggestedMaxBid,
        },
      });
      expect(scorecard.budget.status).not.toBe('green');

      // Sanity: feeding the OLD unreserved number in would have produced the contradiction --
      // proving the fixture actually exercises the bug this test guards against.
      const oldBuggyScorecard = assembleFiveLights({
        shapePlayers: GREEN_ROSTER,
        chemistryPlayers: [],
        budget: {
          budgetRemaining: 500_000,
          rosterWithCandidate: GREEN_ROSTER,
          remainingPool: [],
          openSlotsAfterWin: 0,
          market: market({ band: { low: bandLow, median: 60_000, high: 70_000 } }),
          liquidityMaxBid: worth.capValue,
        },
      });
      expect(oldBuggyScorecard.budget.status).toBe('green');
    });

    test('budget light renders unknown (not a fabricated status) when no liquidity ceiling is available', () => {
      const scorecard = assembleFiveLights({
        shapePlayers: GREEN_ROSTER,
        chemistryPlayers: [],
        budget: {
          budgetRemaining: 500_000,
          rosterWithCandidate: GREEN_ROSTER,
          remainingPool: [],
          openSlotsAfterWin: 0,
          market: market(),
          liquidityMaxBid: null,
        },
      });
      expect(scorecard.budget).toEqual({
        status: 'unknown',
        sentence: 'Budget read needs a completion quote.',
        detailKey: 'budget',
      });
    });

    test('capValue is unaffected and equals suggestedMaxBid when nothing is reserved (no-reservation fixture)', () => {
      // A single open slot, no remaining pool to reserve against: the liquidity engine has
      // nothing to hold back, so the reserved and unreserved ceilings should coincide and every
      // read must agree (regression guard: the F9 fix must not change this baseline case).
      const candidate = player({ id: 'no-reservation-echo', chemistry: 'Scholarly' });
      const bandLow = 20_000;
      const worth = assembleWorthToYou({
        candidate,
        iv: 90_000,
        rosterPlayers: [],
        budgetRemaining: 90_000,
        rosterWithCandidate: GREEN_ROSTER,
        remainingPool: [],
        openSlotsAfterWin: 0,
        ...neutralSeat(),
        market: market({ band: { low: bandLow, median: 25_000, high: 30_000 } }),
      });

      expect(worth.capValue).toBe(90_000);
      expect(worth.suggestedMaxBid).toBe(worth.capValue);
      expect(worth.verdict).toBe('push');
    });

    test('CALLFIX Item 1: liveCall thresholds 3/4 reference recommendedNumber/suggestedMaxBid specifically, not any other number', () => {
      // A generous-budget, near-complete (openSlotsAfterWin: 0 -> aggressive) seat so the
      // liquidity-adjusted ceiling (suggestedMaxBid) genuinely exceeds the raw worth
      // (recommendedNumber) -- the exact "two different numbers" shape the ladder must key off.
      const candidate = player({ id: 'ladder-echo', chemistry: 'Scholarly' });
      const baseInput = {
        candidate,
        iv: 60_000,
        rosterPlayers: [],
        budgetRemaining: 500_000,
        rosterWithCandidate: GREEN_ROSTER,
        remainingPool: [],
        openSlotsAfterWin: 0,
        ...neutralSeat(),
        market: market({ band: { low: 40_000, median: 50_000, high: 60_000 } }),
      };
      const baseline = assembleWorthToYou({ ...baseInput, nextBid: 1 });
      // Precondition: this fixture must genuinely diverge the two ceilings and avoid a strategic
      // pass, or the assertions below would pass vacuously.
      expect(baseline.suggestedMaxBid).toBeGreaterThan(baseline.recommendedNumber);
      expect(baseline.verdict).not.toBe('pass');

      const atRecommended = assembleWorthToYou({ ...baseInput, nextBid: baseline.recommendedNumber });
      expect(atRecommended.liveCall).toBe('push');

      const midpoint = baseline.recommendedNumber
        + Math.max(1, Math.ceil((baseline.suggestedMaxBid - baseline.recommendedNumber) / 2));
      const betweenTheTwo = assembleWorthToYou({ ...baseInput, nextBid: midpoint });
      expect(betweenTheTwo.liveCall).toBe('stretch');

      const pastTheCeiling = assembleWorthToYou({ ...baseInput, nextBid: baseline.suggestedMaxBid + 1 });
      expect(pastTheCeiling.liveCall).toBe('out');

      // seatIsHighBidder always wins the ladder, regardless of price.
      const leading = assembleWorthToYou({ ...baseInput, nextBid: baseline.suggestedMaxBid + 1, seatIsHighBidder: true });
      expect(leading.liveCall).toBe('lead');
    });
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

  describe('P4 / COCKPIT W1d: farm whisper adapter (assembleFarmWhisper) -- the MLB bridge', () => {
    // A "floor-neutral" MLB roster (13 hitters, all 8 primaries filled, catcher depth 2, full
    // pitching staff at every minimum) so ownNeedMultiplier reads exactly neutral (1) for a hitter
    // SS candidate in EITHER variant below -- isolating depthAwareNeedNudge's contribution from
    // any hard-legality noise, per the design's own acceptance-case wording.
    const SS_DEPTH_PITCHERS: readonly RosterSlotPlayer[] = [
      pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('SP'),
      pitcher('RP'), pitcher('RP'), pitcher('RP'), pitcher('CP'),
    ];
    // Ozzie case: the SS himself carries no secondary, and none of the other bench bodies'
    // secondaries touch SS/IF -- exactly ONE coverer (thin).
    const OZZIE_ROSTER: readonly RosterSlotPlayer[] = [
      hitter('C'), hitter('1B'), hitter('2B'), hitter('3B'),
      hitter('SS'), // Ozzie: pure SS, no secondary
      hitter('LF'), hitter('CF'), hitter('RF'),
      hitter('1B', 'C'), hitter('2B', 'RF'), hitter('3B', 'RF'), hitter('LF', 'RF'), hitter('CF', 'RF'),
      ...SS_DEPTH_PITCHERS,
    ];
    // Handley case: the star SS's OWN secondary is 'IF/OF' (covers everywhere else), PLUS one
    // other bench body whose secondary is SS itself -- two DISTINCT SS coverers (covered).
    const HANDLEY_ROSTER: readonly RosterSlotPlayer[] = [
      hitter('C'), hitter('1B'), hitter('2B'), hitter('3B'),
      hitter('SS', 'IF/OF'), // Handley: star SS who also covers IF/OF
      hitter('LF'), hitter('CF'), hitter('RF'),
      hitter('1B', 'C'), hitter('2B', 'RF'), hitter('3B', 'RF'), hitter('LF', 'RF'), hitter('CF', 'SS'),
      ...SS_DEPTH_PITCHERS,
    ];
    // A roster missing SS entirely -- a genuine HARD legality deficit (distinct from the
    // depth-only Ozzie/Handley pair above), used to prove ownNeedMultiplier's OWN contribution.
    const NO_SS_ROSTER: readonly RosterSlotPlayer[] = [
      hitter('C'), hitter('1B'), hitter('2B'), hitter('3B'),
      hitter('LF'), hitter('CF'), hitter('RF'),
      hitter('1B', 'C'), hitter('2B', 'RF'), hitter('3B', 'RF'), hitter('LF', 'RF'), hitter('CF', 'RF'),
      ...SS_DEPTH_PITCHERS,
    ];

    test('renders a band-derived verdict, room-relation-ready market, and a real (non-fabricated) budget light', () => {
      const assembly = assembleFarmWhisper({
        candidateId: 'prospect-echo',
        band: { low: 20_000, high: 40_000, displayedEstimate: 28_000 },
        budgetRemaining: 300_000,
        rosterSlotsRemaining: 6,
        minSalary: 1_000,
        nextBid: 20_000,
        currentBid: null,
        bidIncrement: 1_000,
        // Missing SS entirely (hard deficit) AND thin (0 coverers) -- both signals fire.
        mlbRosterShapes: NO_SS_ROSTER,
        candidateShape: hitter('SS'),
      });

      expect(assembly.market.band).toEqual({ low: 20_000, median: 28_000, high: 40_000 });
      expect(assembly.worth.iv).toBe(28_000);
      expect(assembly.worth.needMultiplier).toBeGreaterThan(1);
      expect(assembly.worth.ownValue).toBeGreaterThan(assembly.worth.iv);
      expect(['push', 'cap', 'pass']).toContain(assembly.worth.verdict);
      // The one-ceiling invariant: capValue (raw budget) is a DIFFERENT, honestly-labeled number
      // from suggestedMaxBid (the reserved ceiling that drives the verdict).
      expect(assembly.worth.capValue).toBe(300_000);
      expect(assembly.worth.suggestedMaxBid).toBeLessThanOrEqual(assembly.worth.capValue);
      // No fake chemistry/identity reads -- DELETED, not stubbed (FiveLights.identity/chemistry
      // are optional precisely so the farm branch can omit them).
      expect(assembly.worth.chemistryReadout).toBeUndefined();
      expect(assembly.scorecard.identity).toBeUndefined();
      expect(assembly.scorecard.chemistry).toBeUndefined();
      // SHAPE un-stubs for free once the MLB roster resolves -- this fixture is missing SS
      // entirely, so shapeLight reads an incomplete/illegal roster (red), not 'unknown'.
      expect(assembly.scorecard.shape.status).toBe('red');
      // Budget IS real and driven by the same ceiling as the verdict.
      expect(assembly.scorecard.budget.status).not.toBe('unknown');
      // Chem-fit chip is dark (flag off by default).
      expect(assembly.chemFitLabel).toBeNull();
    });

    test('SHAPE stays an honest unknown stub when the MLB roster cannot be resolved at all', () => {
      const assembly = assembleFarmWhisper({
        candidateId: 'prospect-no-mlb-data',
        band: { low: 20_000, high: 40_000, displayedEstimate: 28_000 },
        budgetRemaining: 300_000,
        rosterSlotsRemaining: 6,
        minSalary: 1_000,
        nextBid: 20_000,
        currentBid: null,
        mlbRosterShapes: [],
        candidateShape: null,
      });

      expect(assembly.scorecard.shape.status).toBe('unknown');
      expect(assembly.worth.needMultiplier).toBe(1);
    });

    test('pass verdict, room-relation, and budget light agree when the farm ceiling sits below the band (F9 semantics reused for farm)', () => {
      const assembly = assembleFarmWhisper({
        candidateId: 'prospect-thin-wallet',
        band: { low: 50_000, high: 70_000, displayedEstimate: 60_000 },
        budgetRemaining: 5_000,
        rosterSlotsRemaining: 4,
        minSalary: 1_000,
        nextBid: 50_000,
        currentBid: null,
        mlbRosterShapes: [],
        candidateShape: null,
      });

      expect(assembly.worth.suggestedMaxBid).toBeLessThan(assembly.market.band.low);
      expect(assembly.worth.verdict).toBe('pass');
      expect(assembly.scorecard.budget.status).not.toBe('green');
    });

    test('CALLFIX Item 1 (farm): liveCall thresholds 3/4 reference recommendedNumber/suggestedMaxBid specifically, same shared ladder as MLB', () => {
      // rosterSlotsRemaining: 1 -> aggressive liquidity state, so suggestedMaxBid genuinely
      // exceeds recommendedNumber (the same "two different numbers" shape as the MLB fixture).
      const baseInput = {
        candidateId: 'ladder-prospect',
        band: { low: 40_000, high: 60_000, displayedEstimate: 50_000 },
        budgetRemaining: 500_000,
        rosterSlotsRemaining: 1,
        minSalary: 1_000,
        currentBid: null,
        mlbRosterShapes: [],
        candidateShape: null,
      };
      const baseline = assembleFarmWhisper({ ...baseInput, nextBid: 1 });
      expect(baseline.worth.suggestedMaxBid).toBeGreaterThan(baseline.worth.recommendedNumber);
      expect(baseline.worth.verdict).not.toBe('pass');

      const atRecommended = assembleFarmWhisper({ ...baseInput, nextBid: baseline.worth.recommendedNumber });
      expect(atRecommended.worth.liveCall).toBe('push');

      const midpoint = baseline.worth.recommendedNumber
        + Math.max(1, Math.ceil((baseline.worth.suggestedMaxBid - baseline.worth.recommendedNumber) / 2));
      const betweenTheTwo = assembleFarmWhisper({ ...baseInput, nextBid: midpoint });
      expect(betweenTheTwo.worth.liveCall).toBe('stretch');

      const pastTheCeiling = assembleFarmWhisper({ ...baseInput, nextBid: baseline.worth.suggestedMaxBid + 1 });
      expect(pastTheCeiling.worth.liveCall).toBe('out');

      const leading = assembleFarmWhisper({ ...baseInput, nextBid: baseline.worth.suggestedMaxBid + 1, seatIsHighBidder: true });
      expect(leading.worth.liveCall).toBe('lead');
    });

    describe('acceptance case (a)/(b): depth-aware coverage (Handley vs Ozzie), isolated from hard legality', () => {
      test('a covered position (two SS-capable bodies) does not raise the read above 1.0', () => {
        const covered = assembleFarmWhisper({
          candidateId: 'ss-prospect-covered',
          band: { low: 20_000, high: 40_000, displayedEstimate: 28_000 },
          budgetRemaining: 300_000,
          rosterSlotsRemaining: 6,
          minSalary: 1_000,
          nextBid: 20_000,
          currentBid: null,
          mlbRosterShapes: HANDLEY_ROSTER,
          candidateShape: hitter('SS'),
        });
        expect(covered.worth.needMultiplier).toBeLessThanOrEqual(1.0);
      });

      test('a thin position (Ozzie: pure SS, no secondary anywhere) raises the read above 1.0', () => {
        const thin = assembleFarmWhisper({
          candidateId: 'ss-prospect-thin',
          band: { low: 20_000, high: 40_000, displayedEstimate: 28_000 },
          budgetRemaining: 300_000,
          rosterSlotsRemaining: 6,
          minSalary: 1_000,
          nextBid: 20_000,
          currentBid: null,
          mlbRosterShapes: OZZIE_ROSTER,
          candidateShape: hitter('SS'),
        });
        expect(thin.worth.needMultiplier).toBeGreaterThan(1.0);
      });

      test('the thin read is strictly higher than the covered read for the identical candidate', () => {
        const base = {
          candidateId: 'ss-prospect-compare',
          band: { low: 20_000, high: 40_000, displayedEstimate: 28_000 },
          budgetRemaining: 300_000,
          rosterSlotsRemaining: 6,
          minSalary: 1_000,
          nextBid: 20_000,
          currentBid: null as number | null,
          candidateShape: hitter('SS'),
        };
        const covered = assembleFarmWhisper({ ...base, mlbRosterShapes: HANDLEY_ROSTER });
        const thin = assembleFarmWhisper({ ...base, mlbRosterShapes: OZZIE_ROSTER });
        expect(thin.worth.needMultiplier).toBeGreaterThan(covered.worth.needMultiplier);
      });
    });

    test('acceptance case (c): a bullpen/closer-short MLB roster gives the RP/CP prospect the aggressive multiplier through ownNeedMultiplier', () => {
      const bullpenShortRoster: RosterSlotPlayer[] = [
        ...['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'].map((pos) => hitter(pos)),
        pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('SP'),
        pitcher('RP'), pitcher('RP'), // only 2 relief arms, NO closer -- a real hard deficit
      ];
      const bullpenFullRoster: RosterSlotPlayer[] = [
        ...['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'].map((pos) => hitter(pos)),
        pitcher('SP'), pitcher('SP'), pitcher('SP'), pitcher('SP'),
        pitcher('RP'), pitcher('RP'), pitcher('RP'), pitcher('RP'), pitcher('CP'),
      ];
      const base = {
        candidateId: 'cp-prospect',
        band: { low: 20_000, high: 40_000, displayedEstimate: 28_000 },
        budgetRemaining: 300_000,
        rosterSlotsRemaining: 6,
        minSalary: 1_000,
        nextBid: 20_000,
        currentBid: null as number | null,
        candidateShape: pitcher('CP'),
      };

      const short = assembleFarmWhisper({ ...base, mlbRosterShapes: bullpenShortRoster });
      const full = assembleFarmWhisper({ ...base, mlbRosterShapes: bullpenFullRoster });

      // The short-bullpen roster hits ownNeedMultiplier's ceiling (1 + needWeight, clamp-composed
      // to the same [0.85, 1.35] bound as priorityNeedModifier) -- the aggressive read.
      expect(short.worth.needMultiplier).toBeCloseTo(1.35, 5);
      expect(short.worth.needMultiplier).toBeGreaterThan(full.worth.needMultiplier);
      expect(full.worth.needMultiplier).toBeLessThanOrEqual(1.0);
    });

    test('acceptance case (d): one-ceiling regression -- suggestedMaxBid is the ONLY number the need composition moves; capValue never re-derives from need', () => {
      const base = {
        candidateId: 'prospect-ceiling',
        band: { low: 20_000, high: 40_000, displayedEstimate: 28_000 },
        budgetRemaining: 300_000,
        rosterSlotsRemaining: 6,
        minSalary: 1_000,
        nextBid: 20_000,
        currentBid: null as number | null,
      };
      const neutral = assembleFarmWhisper({ ...base, mlbRosterShapes: [], candidateShape: null });
      const aggressive = assembleFarmWhisper({
        ...base,
        mlbRosterShapes: OZZIE_ROSTER,
        candidateShape: hitter('SS'),
      });

      // capValue is honestly the raw remaining budget in BOTH cases -- never re-derived from need.
      expect(neutral.worth.capValue).toBe(300_000);
      expect(aggressive.worth.capValue).toBe(300_000);
      // The need composition changes suggestedMaxBid -- the ONE number that carries the
      // multiplier through the single liquidity chain (no second ceiling anywhere).
      expect(aggressive.worth.suggestedMaxBid).toBeGreaterThan(neutral.worth.suggestedMaxBid);
      // recommendedNumber always derives from the SAME min(worth, suggestedMaxBid) rule.
      expect(neutral.worth.recommendedNumber).toBe(Math.min(neutral.worth.ownValue, neutral.worth.suggestedMaxBid));
      expect(aggressive.worth.recommendedNumber).toBe(Math.min(aggressive.worth.ownValue, aggressive.worth.suggestedMaxBid));
    });
  });

  describe('COCKPIT W1d fork 3: chemistry-fit bridge (dark-first, RESOLVED YES 2026-07-08)', () => {
    test('FARM_CHEM_FIT_ENABLED=false (default): chemistry inputs are wired but produce zero behavior change', () => {
      const base = {
        candidateId: 'prospect-chem',
        band: { low: 20_000, high: 40_000, displayedEstimate: 28_000 },
        budgetRemaining: 300_000,
        rosterSlotsRemaining: 6,
        minSalary: 1_000,
        nextBid: 20_000,
        currentBid: null as number | null,
        mlbRosterShapes: [] as readonly RosterSlotPlayer[],
        candidateShape: null as RosterSlotPlayer | null,
      };
      const withChem = assembleFarmWhisper({
        ...base,
        prospectChemistry: 'Spirited',
        mlbRosterChemistryCounts: { SPI: 2 },
      });
      const withoutChem = assembleFarmWhisper(base);

      expect(withChem.worth.needMultiplier).toBe(withoutChem.worth.needMultiplier);
      expect(withChem.chemFitLabel).toBeNull();
    });

    test('the flag-independent chem-fit label math is correct and ready for when JK flips the flag on', () => {
      // computeFarmChemFitLabel is exactly what assembleFarmWhisper would call once
      // FARM_CHEM_FIT_ENABLED flips true -- tested directly so the math doesn't need the flag.
      expect(computeFarmChemFitLabel('Spirited', { SPI: 2 })).toMatch(/^Chem fit \+\d+% — Spirited room$/);
      // No bump (mid-tier, no tier crossing on the next add) -> no chip, ever.
      expect(computeFarmChemFitLabel('Spirited', { SPI: 4 })).toBeNull();
      expect(computeFarmChemFitLabel(null, { SPI: 2 })).toBeNull();
      expect(computeFarmChemFitLabel('Spirited', undefined)).toBeNull();
    });
  });
});
