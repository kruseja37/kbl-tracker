import { describe, expect, test, vi } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import type { LuxuryCapRow } from '../../data/tierParams';
import {
  applyCanonicalSnakeRiskTriggers,
  computeSnakeScarcity,
  playSnakeRationalRoom,
  playSnakeRationalRoomProgressively,
  type PlaySnakeRationalRoomInput,
  type SnakeRationalPlayer,
  type SnakeRationalSeat,
} from '../snakeRationalRoom';

const BALANCED = { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 } as const;

function construction(id: string, shape: RosterSlotPlayer, rating = 50) {
  return {
    id,
    isPitcher: shape.isPitcher,
    role: shape.role as 'SP' | 'SP/RP' | 'RP' | 'CP' | undefined,
    bat: { POW: rating, CON: rating, SPD: rating, FLD: rating, ARM: rating },
    ...(shape.isPitcher ? { pit: { VEL: rating, JNK: rating, ACC: rating } } : {}),
  };
}

function candidate(input: {
  id: string;
  worth: number;
  price?: number;
  sourceId?: string;
  shape?: RosterSlotPlayer;
}): SnakeRationalPlayer {
  const shape = input.shape ?? { isPitcher: false, position: 'CF' };
  return {
    playerId: input.id,
    sourceId: input.sourceId ?? `stock:${input.id}`,
    price: input.price ?? 10,
    worth: input.worth,
    archetypeWeights: { Power: 1, Contact: 1, Speed: 1, Defense: 1, Rotation: 1, Bullpen: 1 },
    shape,
    construction: construction(input.id, shape),
  };
}

function legalTwentyOne(prefix: string) {
  const shapes: RosterSlotPlayer[] = [
    { isPitcher: false, position: 'C' },
    { isPitcher: false, position: '1B' },
    { isPitcher: false, position: '2B' },
    { isPitcher: false, position: '3B' },
    { isPitcher: false, position: 'SS' },
    { isPitcher: false, position: 'LF', secondaryPosition: 'C' },
    { isPitcher: false, position: 'CF' },
    { isPitcher: false, position: 'RF' },
    ...Array.from({ length: 5 }, () => ({ isPitcher: false, position: 'CF' } as RosterSlotPlayer)),
    ...Array.from({ length: 4 }, () => ({ isPitcher: true, position: 'SP', role: 'SP' } as RosterSlotPlayer)),
    ...Array.from({ length: 4 }, (_, index) => ({
      isPitcher: true,
      position: index === 0 ? 'CP' : 'RP',
      role: index === 0 ? 'CP' : 'RP',
    } as RosterSlotPlayer)),
  ];
  return shapes.map((shape, index) => ({
    playerId: `${prefix}-${index}`,
    sourceId: `stock:${prefix}-${index}`,
    price: 1,
    shape,
    construction: construction(`${prefix}-${index}`, shape),
  }));
}

function seat(teamId: string, roster = legalTwentyOne(teamId), budget = 1_000): SnakeRationalSeat {
  return {
    teamId,
    roster,
    settledRosterPrices: roster.map((player) => ({ playerId: player.playerId, settledPrice: player.price })),
    committedSpent: roster.reduce((sum, player) => sum + player.price, 0),
    budget,
    lockedArchetype: BALANCED,
  };
}

function room(overrides: Partial<PlaySnakeRationalRoomInput> = {}): PlaySnakeRationalRoomInput {
  const players = [
    candidate({ id: 'target', worth: 100 }),
    candidate({ id: 'alternative', worth: 90 }),
    candidate({ id: 'third', worth: 80 }),
    candidate({ id: 'safe', worth: 70 }),
  ];
  return {
    currentPickIndex: 0,
    pickOrder: [
      { pick: 1, teamId: 'asker' },
      { pick: 2, teamId: 'rival-z' },
      { pick: 3, teamId: 'rival-a' },
      { pick: 4, teamId: 'asker' },
    ],
    askingTeamId: 'asker',
    askedPlayerIds: players.map((player) => player.playerId),
    players,
    seats: [seat('asker'), seat('rival-z'), seat('rival-a')],
    baseCaps: [],
    realTeamCount: 3,
    ...overrides,
  };
}

function withShapes(prefix: string, mutate: (shape: RosterSlotPlayer, index: number) => RosterSlotPlayer) {
  return legalTwentyOne(prefix).map((player, index) => {
    const shape = mutate(player.shape, index);
    return { ...player, shape, construction: construction(player.playerId, shape) };
  });
}

describe('deterministic rational-room ensemble', () => {
  test('keeps canonical sub-cent solvent candidates in ranking and economic assessment', () => {
    const result = playSnakeRationalRoom(room({
      seats: [
        seat('asker', legalTwentyOne('asker-epsilon'), 30.9999995),
        seat('rival-z', legalTwentyOne('rival-z-epsilon'), 30.9999995),
        seat('rival-a', legalTwentyOne('rival-a-epsilon'), 30.9999995),
      ],
    }));

    expect(result.status).toBe('ready');
    expect(result.risks.some((row) => row.playerId === 'target')).toBe(true);
  });

  test('uses the asking club exact starter-batting axis instead of generic Rotation fit', () => {
    const spShape = { isPitcher: true, position: 'SP', role: 'SP' } as const;
    const highBat = candidate({ id: 'z-high-bat-sp', worth: 100, shape: spShape });
    highBat.construction = {
      ...highBat.construction,
      bat: { ...highBat.construction.bat, POW: 90, CON: 90 },
    };
    const lowBat = candidate({ id: 'a-low-bat-sp', worth: 100, shape: spShape });
    lowBat.construction = {
      ...lowBat.construction,
      bat: { ...lowBat.construction.bat, POW: 1, CON: 1 },
    };
    const capIdentity = {
        increase: [], decrease: [],
        rawShift: { RPOW: 0.1, RCON: 0.1 } as NonNullable<SnakeRationalSeat['capIdentity']>['rawShift'],
    };
    const askingSeat = { ...seat('asker'), capIdentity };
    const result = playSnakeRationalRoom(room({
      players: [
        lowBat,
        highBat,
        candidate({ id: 'filler-sp-1', worth: 20, shape: spShape }),
        candidate({ id: 'filler-sp-2', worth: 10, shape: spShape }),
      ],
      askedPlayerIds: [lowBat.playerId, highBat.playerId],
      seats: [askingSeat, { ...seat('rival-z'), capIdentity }, seat('rival-a')],
    }));

    expect(result.status).toBe('ready');
    expect(result.scenarios[0].picks[0]).toMatchObject({ teamId: 'rival-z', playerId: 'z-high-bat-sp' });
  });

  test('emits one exact decision and continues scarcity from the same proof and ensemble', () => {
    const cloneSpy = vi.spyOn(globalThis, 'structuredClone');
    const onDecision = vi.fn();
    try {
      const result = playSnakeRationalRoomProgressively(room(), onDecision);
      expect(result.status).toBe('ready');
      expect(onDecision).toHaveBeenCalledTimes(1);
      const decision = onDecision.mock.calls[0][0];
      expect(decision).toEqual(expect.objectContaining({ status: 'ready', scarcity: [] }));
      expect(result.scenarios).toBe(decision.scenarios);
      expect(result.risks).toBe(decision.risks);
      expect(cloneSpy).toHaveBeenCalledTimes(1);
      expect(result.scarcity.length).toBeGreaterThan(0);
      const allNumbersFinite = (value: unknown): boolean => {
        if (typeof value === 'number') return Number.isFinite(value);
        if (Array.isArray(value)) return value.every(allNumbersFinite);
        if (value && typeof value === 'object') return Object.values(value).every(allNumbersFinite);
        return true;
      };
      expect(allNumbersFinite(result.scarcity)).toBe(true);
    } finally {
      cloneSpy.mockRestore();
    }
  });

  test('preserves a negative TAXSWING marginal when the fourth pure starter demotes an elite swing arm', () => {
    const taxCaps: LuxuryCapRow[] = (['VEL', 'JNK', 'ACC'] as const).flatMap((stat) => [
      { group: 'rotation', stat, topN: 4, cap: 0, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0 },
      { group: 'bullpen', stat, topN: 4, cap: 10_000, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0 },
    ]);
    const taxRoster = (prefix: string) => legalTwentyOne(prefix).map((player, index) => {
      if (index < 13 || index > 16) return player;
      const role = index === 16 ? 'SP/RP' : 'SP';
      const rating = index === 13 ? 40 : index === 14 ? 50 : index === 15 ? 60 : 99;
      const shape = { isPitcher: true, position: role, role } as RosterSlotPlayer;
      return { ...player, shape, construction: construction(player.playerId, shape, rating) };
    });
    const fourthStarterShape = { isPitcher: true, position: 'SP', role: 'SP' } as const;
    const taxLowering = {
      ...candidate({ id: 'tax-lowering-fourth-sp', worth: 50, shape: fourthStarterShape }),
      construction: construction('tax-lowering-fourth-sp', fourthStarterShape, 10),
    };
    const higherWorthSwing = candidate({
      id: 'higher-worth-swing',
      worth: 100,
      shape: { isPitcher: true, position: 'SP/RP', role: 'SP/RP' },
    });
    const result = playSnakeRationalRoom(room({
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        { pick: 2, teamId: 'rival-z' },
        { pick: 3, teamId: 'asker' },
      ],
      askedPlayerIds: [taxLowering.playerId, higherWorthSwing.playerId],
      players: [taxLowering, higherWorthSwing],
      seats: [
        seat('asker', taxRoster('asker-tax'), 10_000),
        seat('rival-z', taxRoster('rival-tax'), 10_000),
      ],
      baseCaps: taxCaps,
      realTeamCount: 2,
      includeScarcity: false,
    }));

    expect(result.status).toBe('ready');
    expect(result.scenarios[0].picks[0]).toEqual(expect.objectContaining({
      playerId: taxLowering.playerId,
    }));
    expect(result.scenarios[0].picks[0].interest).toBeGreaterThan(higherWorthSwing.worth);
  });

  test('classifies all, mixed, and no-selection outcomes with stable ranges and unique clubs', () => {
    const result = playSnakeRationalRoom(room());

    expect(result.status).toBe('ready');
    expect(result.scenarios.map((scenario) => scenario.id)).toEqual([
      'BASE',
      'RIVAL_SECOND:rival-z',
      'RIVAL_SECOND:rival-a',
    ]);
    expect(result.scenarios.every((scenario) => scenario.status === 'valid')).toBe(true);
    expect(result.scenarios.map((scenario) => scenario.picks.map((pick) => pick.playerId))).toEqual([
      ['target', 'alternative'],
      ['alternative', 'target'],
      ['target', 'third'],
    ]);

    expect(result.risks).toEqual([
      expect.objectContaining({
        playerId: 'target',
        risk: 'LIKELY_GONE',
        earliestSelectingPick: 2,
        latestSelectingPick: 3,
        latestSelectingPickIsAskingTurn: false,
        interestedClubCount: 2,
      }),
      expect.objectContaining({
        playerId: 'alternative',
        risk: 'AT_RISK',
        earliestSelectingPick: 2,
        latestSelectingPick: 4,
        latestSelectingPickIsAskingTurn: true,
        interestedClubCount: 2,
      }),
      expect.objectContaining({ playerId: 'third', risk: 'AT_RISK' }),
      expect.objectContaining({
        playerId: 'safe',
        risk: 'SAFE_TO_WAIT',
        earliestSelectingPick: null,
        latestSelectingPick: 4,
        latestSelectingPickIsAskingTurn: true,
        interestedClubCount: 0,
      }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(/percent|probability|%/i);
  });

  test('includes the current live rival pick when the asking club is off the clock', () => {
    const input = room({
      currentPickIndex: 1,
      askingTeamId: 'rival-a',
      askedPlayerIds: ['target'],
    });
    const result = playSnakeRationalRoom(input);
    expect(result.status).toBe('ready');
    expect(result.scenarios[0].picks[0]).toEqual(expect.objectContaining({ pick: 2, teamId: 'rival-z' }));
  });

  test('deduplicates alternate versions in scenarios and public human counts', () => {
    const first = candidate({ id: 'ruth-a', worth: 100, sourceId: 'lahman:ruthba01' });
    const second = candidate({ id: 'ruth-b', worth: 90, sourceId: 'lahman:ruthba01' });
    const fallback = candidate({ id: 'fallback', worth: 80 });
    const result = playSnakeRationalRoom(room({
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        { pick: 2, teamId: 'rival-z' },
        { pick: 3, teamId: 'asker' },
      ],
      askedPlayerIds: ['ruth-a', 'ruth-b'],
      players: [first, second, fallback],
      seats: [seat('asker'), seat('rival-z')],
      realTeamCount: 2,
    }));
    expect(result.status).toBe('ready');
    expect(result.scenarios.map((scenario) => scenario.picks[0]?.playerId)).toEqual(['ruth-a', 'fallback']);
    expect(result.risks.every((row) => row.risk === 'AT_RISK')).toBe(true);
    expect(result.availableHumanCountAfter).toBe(1);
    expect(computeSnakeScarcity({ players: [first, second, fallback], teamsStillNeeding: 2 })).toBe(1);
  });

  test('fails closed for no next pick, nonfinite public economics, and zero valid scenarios', () => {
    const noNext = playSnakeRationalRoom(room({
      pickOrder: [{ pick: 1, teamId: 'asker' }],
      seats: [seat('asker')],
      realTeamCount: 1,
    }));
    expect(noNext).toEqual(expect.objectContaining({
      status: 'unavailable',
      unavailableReason: 'NO_NEXT_ASKING_PICK',
      risks: [],
      scarcity: [],
    }));

    const broken = candidate({ id: 'broken', worth: Number.NaN });
    expect(playSnakeRationalRoom(room({ askedPlayerIds: ['broken'], players: [broken] }))).toEqual(
      expect.objectContaining({ status: 'unavailable', unavailableReason: 'NONFINITE_ECONOMICS' }),
    );

    const expensive = candidate({ id: 'expensive', worth: 100, price: 100 });
    const cashless = seat('rival-z', legalTwentyOne('cashless'), 21);
    const zeroScenario = playSnakeRationalRoom(room({
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        { pick: 2, teamId: 'rival-z' },
        { pick: 3, teamId: 'asker' },
      ],
      askedPlayerIds: ['expensive'],
      players: [expensive],
      seats: [seat('asker'), cashless],
      realTeamCount: 2,
    }));
    expect(zeroScenario.status).toBe('unavailable');
    expect(zeroScenario.unavailableReason).toBe('PUBLIC_SHARED_PLAN_INFEASIBLE');
    expect(zeroScenario.scenarios).toEqual([]);
  });

  test('never lets local cushion/depth overlays corrupt ensemble truth or manufacture pending risk', () => {
    expect(applyCanonicalSnakeRiskTriggers({
      playoutRisk: 'SAFE_TO_WAIT',
      planCushion: -10_000,
      cheapestFinishPositionDepth: 1,
    })).toBe('SAFE_TO_WAIT');
    expect(applyCanonicalSnakeRiskTriggers({
      playoutRisk: 'LIKELY_GONE',
      planCushion: 10_000,
      cheapestFinishPositionDepth: 100,
    })).toBe('LIKELY_GONE');
    expect(applyCanonicalSnakeRiskTriggers({
      playoutRisk: null,
      planCushion: -10_000,
      cheapestFinishPositionDepth: 0,
    })).toBeNull();
  });

  test('protects the only remaining shortstop with the same shared all-club proof as a live pick', () => {
    const onlyShortstop = candidate({
      id: 'only-shortstop', worth: 100,
      shape: { isPitcher: false, position: 'SS' },
    });
    const safe = candidate({ id: 'safe-cf', worth: 90 });
    const filler = candidate({ id: 'filler-cf', worth: 80 });
    const missingShortstop = withShapes('needs-ss', (shape) => (
      !shape.isPitcher && shape.position === 'SS' ? { ...shape, position: '3B' } : shape
    ));
    const result = playSnakeRationalRoom(room({
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        { pick: 2, teamId: 'rival-z' },
        { pick: 3, teamId: 'asker' },
      ],
      askedPlayerIds: ['only-shortstop'],
      players: [onlyShortstop, safe, filler],
      seats: [seat('asker'), seat('rival-z'), seat('needs-ss', missingShortstop)],
      realTeamCount: 3,
    }));
    expect(result.status).toBe('ready');
    expect(result.scenarios.map((scenario) => scenario.picks[0]?.playerId)).toEqual(['safe-cf', 'filler-cf']);
    expect(result.risks[0].risk).toBe('SAFE_TO_WAIT');
    expect(result.scarcity.find((row) => row.playerId === 'only-shortstop' && row.role === 'SS')).toEqual(
      expect.objectContaining({
        viablePeopleLeft: 0,
        clubsStillNeeding: 1,
        targetContextualWorth: null,
        replacementState: 'NO_REPLACEMENT',
      }),
    );
  });
});

describe('canonical viable scarcity', () => {
  test('deduplicates versions and excludes an unaffordable person from cost and replacement truth', () => {
    const target = candidate({ id: 'target-v1', sourceId: 'lahman:target01', worth: 100, price: 10 });
    const alternate = candidate({ id: 'target-v2', sourceId: 'lahman:target01', worth: 90, price: 8 });
    const replacement = candidate({ id: 'replacement', worth: 80, price: 5 });
    const unaffordable = candidate({ id: 'unaffordable', worth: 70, price: 2_000 });
    const rivalMissingCf = withShapes('need-cf', (shape) => (
      !shape.isPitcher && shape.position === 'CF' ? { ...shape, position: 'LF' } : shape
    ));
    const result = playSnakeRationalRoom(room({
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        { pick: 2, teamId: 'rival-z' },
        { pick: 3, teamId: 'asker' },
      ],
      askedPlayerIds: ['target-v1'],
      players: [target, alternate, replacement, unaffordable],
      seats: [seat('asker'), seat('rival-z', rivalMissingCf)],
      realTeamCount: 2,
    }));
    expect(result.status).toBe('ready');
    const cliff = result.scarcity.find((row) => row.playerId === 'target-v1' && row.role === 'CF');
    expect(cliff).toEqual(expect.objectContaining({
      viablePeopleLeft: 2,
      clubsStillNeeding: 1,
      lowestViableTrueCost: 5,
      highestViableTrueCost: 10,
      replacementPlayerId: 'replacement',
      replacementState: 'AVAILABLE',
    }));
    expect(cliff!.contextualWorthDrop).toBeGreaterThan(0);
  });

  test('recognizes secondary-catcher, swing-arm, and closer roles through canonical legality', () => {
    const catcherDepthRoster = withShapes('catcher-depth', (shape, index) => (
      index === 5 ? { ...shape, secondaryPosition: null } : shape
    ));
    const secondaryCatcher = candidate({
      id: 'secondary-catcher',
      worth: 100,
      shape: { isPitcher: false, position: 'SS', secondaryPosition: 'C' },
    });
    const catcherFallback = candidate({ id: 'catcher-fallback', worth: 80 });
    const catcherRead = playSnakeRationalRoom(room({
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        { pick: 2, teamId: 'rival-z' },
        { pick: 3, teamId: 'asker' },
      ],
      askedPlayerIds: ['secondary-catcher'],
      players: [secondaryCatcher, catcherFallback],
      seats: [seat('asker', catcherDepthRoster), seat('rival-z')],
      realTeamCount: 2,
    }));
    expect(catcherRead.status).toBe('ready');
    expect(catcherRead.scarcity).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerId: 'secondary-catcher', role: 'CATCHER_DEPTH', viablePeopleLeft: 1 }),
    ]));

    const swingRoster = withShapes('swing-need', (shape, index) => (
      index === 13 ? { isPitcher: true, position: 'RP', role: 'RP' } : shape
    ));
    const swing = candidate({ id: 'swing', worth: 100, shape: { isPitcher: true, position: 'SP/RP', role: 'SP/RP' } });
    const starter = candidate({ id: 'starter', worth: 80, shape: { isPitcher: true, position: 'SP', role: 'SP' } });
    const swingRead = playSnakeRationalRoom(room({
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        { pick: 2, teamId: 'rival-z' },
        { pick: 3, teamId: 'asker' },
      ],
      askedPlayerIds: ['swing'],
      players: [swing, starter],
      seats: [seat('asker', swingRoster), seat('rival-z')],
      realTeamCount: 2,
    }));
    expect(swingRead.status).toBe('ready');
    expect(swingRead.scarcity.map((row) => row.role)).toEqual(['SP', 'RP']);

    const noCloserRoster = withShapes('closer-need', (shape, index) => (
      index === 17 ? { isPitcher: true, position: 'RP', role: 'RP' } : shape
    ));
    const closer = candidate({ id: 'closer', worth: 100, shape: { isPitcher: true, position: 'CP', role: 'CP' } });
    const reliever = candidate({ id: 'reliever', worth: 90, shape: { isPitcher: true, position: 'RP', role: 'RP' } });
    const closerRead = playSnakeRationalRoom(room({
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        { pick: 2, teamId: 'rival-z' },
        { pick: 3, teamId: 'asker' },
      ],
      askedPlayerIds: ['closer'],
      players: [closer, reliever],
      seats: [seat('asker', noCloserRoster), seat('rival-z')],
      realTeamCount: 2,
    }));
    expect(closerRead.status).toBe('ready');
    expect(closerRead.scarcity).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'RP', viablePeopleLeft: 1, replacementState: 'NO_REPLACEMENT' }),
      expect.objectContaining({ role: 'CP', viablePeopleLeft: 1, replacementState: 'NO_REPLACEMENT' }),
    ]));
  });

  test('does not double-count SP and RP demand when existing swings already cover both staff sides', () => {
    let convertedStarter = false;
    let convertedReliever = false;
    const swingCovered = withShapes('swing-covered', (shape) => {
      if (!convertedStarter && shape.isPitcher && shape.role === 'SP') {
        convertedStarter = true;
        return { isPitcher: true, position: 'SP/RP', role: 'SP/RP' };
      }
      if (!convertedReliever && shape.isPitcher && shape.role === 'RP') {
        convertedReliever = true;
        return { isPitcher: true, position: 'SP/RP', role: 'SP/RP' };
      }
      return shape;
    });
    const target = candidate({
      id: 'swing-target', worth: 100,
      shape: { isPitcher: true, position: 'SP/RP', role: 'SP/RP' },
    });
    const starter = candidate({
      id: 'starter-fallback', worth: 80,
      shape: { isPitcher: true, position: 'SP', role: 'SP' },
    });
    const result = playSnakeRationalRoom(room({
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        { pick: 2, teamId: 'rival-z' },
        { pick: 3, teamId: 'asker' },
      ],
      askedPlayerIds: ['swing-target'],
      players: [target, starter],
      seats: [seat('asker'), seat('rival-z', swingCovered)],
      realTeamCount: 2,
    }));
    expect(result.status).toBe('ready');
    expect(result.scarcity).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'SP', clubsStillNeeding: 0 }),
      expect.objectContaining({ role: 'RP', clubsStillNeeding: 0 }),
    ]));
  });

  test('keeps a realistic 22-club / 484-player refresh below the multi-second churn boundary', () => {
    const teamIds = ['asker', ...Array.from({ length: 21 }, (_, index) => `rival-${index.toString().padStart(2, '0')}`)];
    const players = Array.from({ length: 484 }, (_, index) => candidate({
      id: `realistic-${index.toString().padStart(3, '0')}`,
      worth: 1_000 - index,
      price: 5 + (index % 25),
    }));
    const startedAt = performance.now();
    const result = playSnakeRationalRoom(room({
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        ...teamIds.slice(1).map((teamId, index) => ({ pick: index + 2, teamId })),
        { pick: 23, teamId: 'asker' },
      ],
      askedPlayerIds: players.map((player) => player.playerId),
      players,
      seats: teamIds.map((teamId) => seat(teamId, legalTwentyOne(teamId), 50_000)),
      realTeamCount: 22,
    }));
    const elapsedMs = performance.now() - startedAt;
    expect(result.status).toBe('ready');
    expect(result.scenarios).toHaveLength(22);
    expect(result.risks).toHaveLength(484);
    expect(elapsedMs).toBeLessThan(1_500);
  }, 15_000);
});
