import { describe, expect, test } from 'vitest';

import type { RosterSlotPlayer } from '../../data/rosterConstruction';
import { computeSnakeScarcity, playSnakeRationalRoom } from '../snakeRationalRoom';
import type { SnakeSeatingPlayer } from '../snakeSeatingProof';

function construction(id: string, shape: RosterSlotPlayer, rating = 20) {
  return {
    id,
    isPitcher: shape.isPitcher,
    role: shape.role as 'SP' | 'SP/RP' | 'RP' | 'CP' | undefined,
    bat: { POW: rating, CON: rating, SPD: rating, FLD: rating, ARM: rating },
    ...(shape.isPitcher ? { pit: { VEL: rating, JNK: rating, ACC: rating } } : {}),
  };
}

function candidate(playerId: string, worth: number, sourceId = `stock:${playerId}`): SnakeSeatingPlayer & {
  worth: number;
  archetypeWeights: { Power: number };
} {
  const shape = { isPitcher: false, position: 'CF' };
  return {
    playerId,
    sourceId,
    price: worth,
    worth,
    archetypeWeights: { Power: 1 },
    shape,
    construction: construction(playerId, shape, worth),
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
    ...Array.from({ length: 4 }, () => ({ isPitcher: false, position: 'CF' } as RosterSlotPlayer)),
    ...Array.from({ length: 4 }, () => ({ isPitcher: true, position: 'SP', role: 'SP' } as RosterSlotPlayer)),
    ...Array.from({ length: 4 }, (_, index) => ({
      isPitcher: true,
      position: index === 0 ? 'CP' : 'RP',
      role: index === 0 ? 'CP' : 'RP',
    } as RosterSlotPlayer)),
    { isPitcher: false, position: 'CF' },
  ];
  return shapes.map((shape, index) => ({
    playerId: `${prefix}-${index}`,
    sourceId: `stock:${prefix}-${index}`,
    price: 1,
    shape,
    construction: construction(`${prefix}-${index}`, shape),
  }));
}

describe('deterministic rational room', () => {
  test('risk-read-matches-playout and contains no probabilities', () => {
    const target = candidate('target', 90);
    const fallback = candidate('fallback', 20);
    const result = playSnakeRationalRoom({
      currentPickIndex: 0,
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        { pick: 2, teamId: 'rival' },
        { pick: 3, teamId: 'asker' },
      ],
      askingTeamId: 'asker',
      askedPlayerIds: ['target', 'fallback'],
      players: [target, fallback],
      seats: [
        { teamId: 'asker', roster: legalTwentyOne('a'), committedSpent: 21, budget: 1_000, lockedArchetype: { Power: 5, Contact: 0, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0 } },
        { teamId: 'rival', roster: legalTwentyOne('r'), committedSpent: 21, budget: 1_000, lockedArchetype: { Power: 5, Contact: 0, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0 } },
      ],
      baseCaps: [],
      realTeamCount: 2,
    });
    expect(result.playout.map((pick) => pick.playerId)).toEqual(['target']);
    expect(result.risks).toEqual([
      expect.objectContaining({ playerId: 'target', risk: 'LIKELY_GONE', draftedAtPick: 2 }),
      expect.objectContaining({ playerId: 'fallback', risk: 'SAFE_TO_WAIT', draftedAtPick: null }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(/survival|percent|probability|%/i);
  });

  test('versions-count-as-one-human in rational-room availability', () => {
    const first = candidate('ruth-a', 90, 'lahman:ruthba01');
    const second = candidate('ruth-b', 80, 'lahman:ruthba01');
    const result = playSnakeRationalRoom({
      currentPickIndex: 0,
      pickOrder: [
        { pick: 1, teamId: 'asker' },
        { pick: 2, teamId: 'rival' },
        { pick: 3, teamId: 'asker' },
      ],
      askingTeamId: 'asker',
      askedPlayerIds: ['ruth-a', 'ruth-b'],
      players: [first, second],
      seats: [
        { teamId: 'asker', roster: legalTwentyOne('a2'), committedSpent: 21, budget: 1_000, lockedArchetype: { Power: 5, Contact: 0, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0 } },
        { teamId: 'rival', roster: legalTwentyOne('r2'), committedSpent: 21, budget: 1_000, lockedArchetype: { Power: 5, Contact: 0, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0 } },
      ],
      baseCaps: [],
      realTeamCount: 2,
    });
    expect(result.playout).toHaveLength(1);
    expect(result.availableHumanCountAfter).toBe(0);
    expect(result.risks.every((row) => row.risk === 'LIKELY_GONE')).toBe(true);
    expect(computeSnakeScarcity({ players: [first, second], teamsStillNeeding: 2 })).toBe(0.5);
  });

  test('8-club scripted validation: position run, scarce human, and tax pressure move reads sanely', () => {
    const teamIds = Array.from({ length: 8 }, (_, index) => `team-${index}`);
    const seats = teamIds.map((teamId) => ({
      teamId,
      roster: legalTwentyOne(teamId),
      committedSpent: 21,
      budget: 2_000,
      lockedArchetype: { Power: 5, Contact: 0, Speed: 0, Defense: 0, Rotation: 0, Bullpen: 0 },
    }));
    const pickOrder = [
      { pick: 1, teamId: teamIds[0] },
      ...teamIds.slice(1).map((teamId, index) => ({ pick: index + 2, teamId })),
      { pick: 9, teamId: teamIds[0] },
    ];
    const runPlayers = Array.from({ length: 8 }, (_, index) => candidate(
      index === 0 ? 'run-target' : `run-${index}`,
      100 - index,
    ));
    const run = playSnakeRationalRoom({
      currentPickIndex: 0,
      pickOrder,
      askingTeamId: teamIds[0],
      askedPlayerIds: ['run-target'],
      players: runPlayers,
      seats,
      baseCaps: [],
      realTeamCount: 8,
    });
    expect(run.risks[0].risk).toBe('LIKELY_GONE');
    expect(run.playout).toHaveLength(7);

    const scarceA = candidate('scarce-catcher-a', 95, 'lahman:scarce01');
    const scarceB = candidate('scarce-catcher-b', 94, 'lahman:scarce01');
    expect(computeSnakeScarcity({ players: [scarceA, scarceB], teamsStillNeeding: 8 })).toBe(0.125);

    const taxedTarget = candidate('taxed-target', 99);
    const taxFallbacks = Array.from({ length: 8 }, (_, index) => candidate(`tax-fallback-${index}`, 20 - index));
    const taxed = playSnakeRationalRoom({
      currentPickIndex: 0,
      pickOrder,
      askingTeamId: teamIds[0],
      askedPlayerIds: ['taxed-target'],
      players: [taxedTarget, ...taxFallbacks],
      seats,
      baseCaps: [{ group: 'hitters', stat: 'POW', topN: 1, cap: 20, penaltyPer100: 1_000, penaltyCurve: 1, minAdder: 0 }],
      realTeamCount: 8,
    });
    expect(taxed.risks[0].risk).toBe('SAFE_TO_WAIT');
    expect(taxed.playout.every((pick) => pick.playerId !== 'taxed-target')).toBe(true);
  });
});
