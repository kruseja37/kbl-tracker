import { describe, expect, test } from 'vitest';

import { optimizeLineup, recommendRosterMoves } from '../rosterAnalyzer';
import { effectiveRatings } from '../effectiveRatings';
import { computeIV, type IVPlayerInput } from '../ivEngine';
import type { Team } from '../../utils/leagueBuilderStorage';
import { readFileSync } from 'node:fs';

type TestPlayer = {
  id: string;
  firstName?: string;
  lastName?: string;
  playerName?: string;
  bats?: 'L' | 'R' | 'S';
  primaryPosition: string;
  secondaryPosition?: string;
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
  trait1?: string;
  trait2?: string;
  mojo?: string;
  arsenal?: string[];
  armSlot?: 'High' | 'Mid' | 'Low' | 'Sub' | null;
};

const normalState = { mojo: 'Normal' as const, fitness: 'FIT' as const };
const baseCtx = {
  pressure: 'none' as const,
  runnersOn: false,
  risp: false,
  opposingHand: 'R' as const,
  inning: 1,
  basesEmpty: true,
};

function team(players: TestPlayer[], dhEnabled = true): Team {
  return {
    id: 'team-a',
    name: 'Team A',
    abbreviation: 'TMA',
    location: 'Test',
    nickname: 'Team',
    colors: { primary: '#000000', secondary: '#ffffff' },
    stadium: 'Test Park',
    leagueIds: [],
    createdDate: '',
    lastModified: '',
    dhEnabled,
    rosterPlayers: players,
  } as unknown as Team;
}

function fielder(position: string, id = `fielder-${position}`): TestPlayer {
  return {
    id,
    playerName: `Fielder ${position}`,
    bats: 'S',
    primaryPosition: position,
    power: 55,
    contact: 55,
    speed: 55,
    fielding: 72,
    arm: 72,
  };
}

function hitterInput(overrides: Partial<IVPlayerInput>): IVPlayerInput {
  return {
    id: 'hitter',
    name: 'Hitter',
    isPitcher: false,
    bats: 'R',
    primaryPosition: '1B',
    batterRatings: { power: 35, contact: 35, speed: 35, fielding: 35, arm: 35 },
    ...overrides,
  };
}

function pitcherInput(overrides: Partial<IVPlayerInput>): IVPlayerInput {
  return {
    id: 'pitcher',
    name: 'Pitcher',
    isPitcher: true,
    bats: 'R',
    primaryPosition: 'SP',
    pitcherRole: 'SP',
    ratings: { POW: 20, CON: 20, SPD: 20, FLD: 50, ARM: 50 },
    pitcherRatings: { velocity: 40, junk: 40, accuracy: 40 },
    arsenal: ['4F', 'CB', 'CH'],
    ...overrides,
  };
}

describe('rosterAnalyzer optimizeLineup', () => {
  test('exports optimizeLineup only', async () => {
    const module = await import('../rosterAnalyzer');

    expect(Object.keys(module).sort()).toEqual(['optimizeLineup', 'recommendRosterMoves']);
  });

  test('hitter effective ratings override reaches kblIV through input.ratings', () => {
    const base = computeIV(hitterInput({})).kblIV;
    const effective = computeIV(hitterInput({
      ratings: { POW: 80, CON: 80, SPD: 70, FLD: 65, ARM: 65 },
    })).kblIV;

    expect(effective).toBeGreaterThan(base);
  });

  test('pitcher effective VEL/JNK/ACC move kblIV only through input.pitcherRatings', () => {
    const base = computeIV(pitcherInput({})).kblIV;
    const wrongChannel = computeIV(pitcherInput({
      ratings: { POW: 20, CON: 20, SPD: 20, FLD: 50, ARM: 50, VEL: 95, JNK: 95, ACC: 95 },
      pitcherRatings: { velocity: 40, junk: 40, accuracy: 40 },
    })).kblIV;
    const splitChannel = computeIV(pitcherInput({
      ratings: { POW: 20, CON: 20, SPD: 20, FLD: 50, ARM: 50 },
      pitcherRatings: { velocity: 95, junk: 95, accuracy: 95 },
    })).kblIV;

    expect(wrongChannel).toBe(base);
    expect(splitChannel).toBeGreaterThan(base);
  });

  test('optimizer ranks a higher effective-ratings player into the lineup', () => {
    const roster = [
      fielder('C'),
      fielder('1B'),
      fielder('2B'),
      fielder('3B'),
      fielder('SS'),
      fielder('LF'),
      fielder('CF'),
      fielder('RF'),
      {
        id: 'high-effective',
        playerName: 'High Effective',
        bats: 'R' as const,
        primaryPosition: 'DH',
        power: 90,
        contact: 90,
        speed: 70,
        fielding: 50,
        arm: 50,
      },
      {
        id: 'low-effective',
        playerName: 'Low Effective',
        bats: 'R' as const,
        primaryPosition: 'DH',
        power: 35,
        contact: 35,
        speed: 35,
        fielding: 50,
        arm: 50,
      },
    ];

    const result = optimizeLineup(team(roster), 'R', {});
    const ids = result.recommendedBattingOrder.map((slot) => slot.playerId);

    expect(ids).toContain('high-effective');
    expect(ids).not.toContain('low-effective');
  });

  test('vs-L and vs-R differ when a handedness-split trait changes effective ratings', () => {
    const roster = [
      fielder('C'),
      fielder('1B'),
      fielder('2B'),
      fielder('3B'),
      fielder('SS'),
      fielder('LF'),
      fielder('CF'),
      fielder('RF'),
      {
        id: 'split-bat',
        playerName: 'Split Bat',
        bats: 'R' as const,
        primaryPosition: 'DH',
        power: 55,
        contact: 55,
        speed: 45,
        fielding: 45,
        arm: 45,
        trait1: 'CON vs RHP',
      },
      {
        id: 'neutral-bat',
        playerName: 'Neutral Bat',
        bats: 'R' as const,
        primaryPosition: 'DH',
        power: 58,
        contact: 58,
        speed: 45,
        fielding: 45,
        arm: 45,
      },
    ];

    const vsR = optimizeLineup(team(roster), 'R', {});
    const vsL = optimizeLineup(team(roster), 'L', {});

    expect(vsR.recommendedBattingOrder.find((slot) => slot.defensivePosition === 'DH')?.playerId)
      .toBe('split-bat');
    expect(vsL.recommendedBattingOrder.find((slot) => slot.defensivePosition === 'DH')?.playerId)
      .toBe('neutral-bat');
  });

  test('defensivePlacementRisk pulls a low-FLD player off high-traffic shortstop', () => {
    const roster = [
      fielder('C'),
      fielder('1B'),
      fielder('2B'),
      fielder('3B'),
      {
        id: 'low-glove-bat',
        playerName: 'Low Glove Bat',
        bats: 'R' as const,
        primaryPosition: 'SS',
        secondaryPosition: '1B',
        power: 82,
        contact: 82,
        speed: 50,
        fielding: 5,
        arm: 20,
      },
      {
        id: 'true-shortstop',
        playerName: 'True Shortstop',
        bats: 'R' as const,
        primaryPosition: 'SS',
        power: 60,
        contact: 60,
        speed: 60,
        fielding: 92,
        arm: 92,
      },
      fielder('LF'),
      fielder('CF'),
      fielder('RF'),
    ];

    const result = optimizeLineup(team(roster, false), 'R', {});

    expect(result.defensiveAssignment.SS?.playerId).toBe('true-shortstop');
    expect(result.defensiveAssignment.SS?.playerId).not.toBe('low-glove-bat');
  });

  test('effective ratings split into hitter ratings and pitcherRatings channels', () => {
    const pitcher = {
      id: 'stateful-pitcher',
      name: 'Stateful Pitcher',
      isPitcher: true,
      bats: 'R',
      primaryPosition: 'SP',
      pitcherRole: 'SP',
      power: 20,
      contact: 20,
      speed: 20,
      fielding: 50,
      arm: 50,
      velocity: 55,
      junk: 55,
      accuracy: 55,
      arsenal: ['4F', 'CB', 'CH'],
    };
    const eff = effectiveRatings(pitcher, { mojo: 'On Fire', fitness: 'FIT' }, baseCtx);
    const base = computeIV(pitcherInput({
      ratings: { POW: 20, CON: 20, SPD: 20, FLD: 50, ARM: 50 },
      pitcherRatings: { velocity: 55, junk: 55, accuracy: 55 },
    })).kblIV;
    const split = computeIV(pitcherInput({
      ratings: { POW: eff.POW, CON: eff.CON, SPD: eff.SPD, FLD: eff.FLD, ARM: eff.ARM },
      pitcherRatings: { velocity: eff.VEL, junk: eff.JNK, accuracy: eff.ACC },
    })).kblIV;

    expect(split).toBeGreaterThan(base);
  });

  test('rosterAnalyzer remains pure and does not import forbidden subsystems', () => {
    const source = readFileSync('src/engines/rosterAnalyzer.ts', 'utf8');

    expect(source).not.toMatch(/salaryCalculator|tierParams|playerDatabase|React|Date\.now|Math\.random|indexedDB|gameStorage/);
  });

  test('recommendRosterMoves is advisory-only and does not import or call roster movement executors', () => {
    const source = readFileSync('src/engines/rosterAnalyzer.ts', 'utf8');

    expect(source).not.toMatch(/franchiseRosterMovement|callUpFranchisePlayer|sendDownFranchisePlayer/);
  });

  test('recommendRosterMoves is leak-safe for hidden farm prospects', () => {
    const teamInput = {
      players: [{
        id: 'known-underperformer',
        name: 'Known Underperformer',
        primaryPosition: 'SS',
        valueDelta: -2_000,
        eligibleForSendDown: true,
      }],
    };
    const hiddenProspect = {
      id: 'hidden-prospect',
      name: 'Hidden Prospect',
      primaryPosition: 'SS',
      scoutedGrade: 'B+',
      scoutConfidence: 'medium',
      scoutVisibleSalary: 2_000,
      trueRatings: { power: 1, contact: 1, speed: 1 },
      trueOverall: 'D-' as const,
      trueIV: 1,
    };

    const base = recommendRosterMoves(teamInput, [hiddenProspect], { valueDeltas: { 'known-underperformer': -2_000 } });
    const trueRatingsChanged = recommendRosterMoves(teamInput, [{
      ...hiddenProspect,
      trueRatings: { power: 99, contact: 99, speed: 99 },
      trueOverall: 'S' as const,
      trueIV: 999_999,
    }], { valueDeltas: { 'known-underperformer': -2_000 } });
    const scoutedGradeChanged = recommendRosterMoves(teamInput, [{
      ...hiddenProspect,
      scoutedGrade: 'D',
    }], { valueDeltas: { 'known-underperformer': -2_000 } });

    expect(trueRatingsChanged).toEqual(base);
    expect(scoutedGradeChanged).not.toEqual(base);
    expect(base[0]).toMatchObject({
      kind: 'call_up',
      playerId: 'hidden-prospect',
      replacesPlayerId: 'known-underperformer',
      scoutConfidence: 'medium',
      positionalFit: true,
    });
    expect(base[0].justification).toContain('projects as a positive-surplus replacement');
    expect(base[0].justification).not.toMatch(/\b(true|IV|overall|rating|ratings)\b/i);
  });

  test('recommendRosterMoves gates positional fit and ranks by surplus gap', () => {
    const result = recommendRosterMoves({
      players: [
        { id: 'ss-known', name: 'SS Known', primaryPosition: 'SS', valueDelta: -1_000, eligibleForSendDown: true },
        { id: 'cf-known', name: 'CF Known', primaryPosition: 'CF', valueDelta: 500, eligibleForSendDown: true },
      ],
    }, [
      { id: 'ss-prospect', name: 'SS Prospect', primaryPosition: 'SS', scoutedGrade: 'A', scoutConfidence: 'high', scoutVisibleSalary: 2_000 },
      { id: 'of-prospect', name: 'OF Prospect', primaryPosition: 'LF', secondaryPositions: ['CF'], scoutedGrade: 'B', scoutConfidence: 'low', scoutVisibleSalary: 2_000 },
      { id: 'bad-fit', name: 'Bad Fit', primaryPosition: 'C', scoutedGrade: 'S', scoutConfidence: 'high', scoutVisibleSalary: 1_000 },
    ], {
      calloutThreshold: 500,
      valueDeltas: {
        'ss-known': -1_000,
        'cf-known': 500,
      },
    });

    expect(result.map((recommendation) => recommendation.playerId)).not.toContain('bad-fit');
    expect(result[0]).toMatchObject({
      playerId: 'ss-prospect',
      replacesPlayerId: 'ss-known',
      surplusGap: expect.any(Number),
    });
    expect(result[0].surplusGap).toBeGreaterThan(result[result.length - 1].surplusGap);
  });
});
